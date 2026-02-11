import { NextRequest } from "next/server";
import { OrderStatus, OrderType } from "@prisma/client";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import {
  ACTIVE_ORDER_STATUSES,
  generateCode,
  mapOrder,
  toOrderType,
  toPaymentMethod,
} from "@/server/pos/mappers";
import { orderCreateSchema } from "@/server/validation/schemas";

const orderInclude = {
  items: {
    include: {
      product: {
        select: { name: true },
      },
    },
  },
  zone: {
    select: { id: true, name: true, fee: true },
  },
  table: {
    select: { id: true, name: true, number: true },
  },
} as const;

function parseStatusFilter(raw: string | null) {
  if (!raw) return null;
  const value = raw.toLowerCase();
  if (value === "preparing") return OrderStatus.PREPARING;
  if (value === "ready") return OrderStatus.READY;
  if (value === "out") return OrderStatus.OUT;
  if (value === "delivered") return OrderStatus.DELIVERED;
  if (value === "cancelled") return OrderStatus.CANCELLED;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { anyPermission: ["orders:view", "orders:manage"] });

    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();
    const status = parseStatusFilter(request.nextUrl.searchParams.get("status"));

    const orders = await db.order.findMany({
      where: {
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: orderInclude,
    });

    const filtered = orders.filter((order) => {
      if (!search) return true;
      return (
        order.code.toLowerCase().includes(search) ||
        order.customerName.toLowerCase().includes(search) ||
        order.type.toLowerCase().includes(search)
      );
    });

    return jsonOk({
      orders: filtered.map((order) => mapOrder(order)),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, { anyPermission: ["orders:manage", "pos:use"] });
    const payload = await readJson(request, orderCreateSchema);

    const orderType = toOrderType(payload.type);
    const payment = toPaymentMethod(payload.payment);
    const discount = Number(payload.discount || 0);

    if (orderType === OrderType.DELIVERY && !payload.zoneId) {
      throw new HttpError(400, "zone_required", "Delivery order requires a zone");
    }
    if (orderType !== OrderType.DELIVERY && payload.zoneId) {
      throw new HttpError(400, "invalid_zone", "Zone can only be used with delivery orders");
    }

    if (orderType !== OrderType.DINE_IN && payload.tableId) {
      throw new HttpError(400, "invalid_table", "Table can only be used with dine-in orders");
    }

    const order = await db.$transaction(async (tx) => {
      const productIds = Array.from(new Set(payload.items.map((item) => item.productId)));
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        include: {
          recipeItems: {
            select: {
              materialId: true,
              quantity: true,
            },
          },
        },
      });

      if (products.length !== productIds.length) {
        throw new HttpError(400, "invalid_products", "One or more products are invalid or inactive");
      }

      const productMap = new Map(products.map((product) => [product.id, product]));
      const itemLines = payload.items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new HttpError(400, "invalid_product", "Invalid product in cart items");
        }
        const unitPrice = Number(product.price);
        return {
          productId: product.id,
          quantity: item.quantity,
          unitPrice,
          totalPrice: unitPrice * item.quantity,
          recipeItems: product.recipeItems,
          name: product.name,
        };
      });

      const materialUsage = new Map<string, number>();
      itemLines.forEach((item) => {
        item.recipeItems.forEach((recipe) => {
          const needed = Number(recipe.quantity) * item.quantity;
          materialUsage.set(recipe.materialId, (materialUsage.get(recipe.materialId) || 0) + needed);
        });
      });

      for (const [materialId, quantity] of materialUsage.entries()) {
        const result = await tx.material.updateMany({
          where: {
            id: materialId,
            stock: { gte: quantity },
          },
          data: {
            stock: { decrement: quantity },
          },
        });

        if (result.count === 0) {
          throw new HttpError(400, "insufficient_stock", "Insufficient stock for one or more ingredients");
        }
      }

      let tableId: string | null = null;
      if (payload.tableId) {
        const table = await tx.diningTable.findUnique({
          where: { id: payload.tableId },
          include: {
            orders: {
              where: {
                status: { in: ACTIVE_ORDER_STATUSES },
              },
              select: { id: true },
              take: 1,
            },
          },
        });
        if (!table) {
          throw new HttpError(404, "table_not_found", "Table not found");
        }
        if (table.orders.length > 0) {
          throw new HttpError(400, "table_occupied", "The selected table is already occupied");
        }
        tableId = table.id;
      }

      const zoneId = payload.zoneId || null;
      if (zoneId) {
        const zone = await tx.zone.findUnique({ where: { id: zoneId }, select: { id: true } });
        if (!zone) {
          throw new HttpError(404, "zone_not_found", "Zone not found");
        }
      }

      if (payload.driverId) {
        const driver = await tx.driver.findUnique({
          where: { id: payload.driverId },
          select: { id: true },
        });
        if (!driver) {
          throw new HttpError(404, "driver_not_found", "Driver not found");
        }
      }

      const code = generateCode("ORD");
      const createdOrder = await tx.order.create({
        data: {
          code,
          type: orderType,
          status: OrderStatus.PREPARING,
          customerName: payload.customerName.trim(),
          zoneId,
          driverId: payload.driverId || null,
          tableId,
          discount,
          payment,
          notes: payload.notes || null,
          createdById: auth.user.id,
          items: {
            createMany: {
              data: itemLines.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
              })),
            },
          },
        },
        include: orderInclude,
      });

      if (tableId) {
        await tx.diningTable.update({
          where: { id: tableId },
          data: { isOccupied: true },
        });
      }

      return createdOrder;
    });

    return jsonOk({ order: mapOrder(order) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
