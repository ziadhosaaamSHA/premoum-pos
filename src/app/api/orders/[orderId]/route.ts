import { NextRequest } from "next/server";
import { OrderStatus, OrderType, Prisma, SaleStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import {
  ACTIVE_ORDER_STATUSES,
  generateCode,
  mapOrder,
  toOrderStatus,
} from "@/server/pos/mappers";
import { orderUpdateSchema } from "@/server/validation/schemas";

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

async function upsertApprovedSaleForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  actorUserId?: string | null
) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      zone: {
        select: { fee: true },
      },
      sale: {
        select: { id: true },
      },
      items: {
        orderBy: { id: "asc" },
        include: {
          product: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!order) {
    throw new HttpError(404, "order_not_found", "Order not found");
  }

  const subtotal = order.items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const deliveryFee = order.type === OrderType.DELIVERY ? Number(order.zone?.fee || 0) : 0;
  const discount = Number(order.discount || 0);
  const taxAmount = Number(order.taxAmount || 0);
  const total = subtotal + deliveryFee + taxAmount - discount;

  const saleItemsPayload = order.items.map((item) => ({
    productId: item.productId,
    name: item.product?.name || "منتج",
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
  }));

  if (order.sale) {
    await tx.saleItem.deleteMany({
      where: { saleId: order.sale.id },
    });

    await tx.sale.update({
      where: { id: order.sale.id },
      data: {
        date: new Date(),
        customerName: order.customerName,
        total,
        status: SaleStatus.PAID,
        items: {
          createMany: {
            data: saleItemsPayload,
          },
        },
      },
    });
    return;
  }

  await tx.sale.create({
    data: {
      invoiceNo: generateCode("INV"),
      orderId: order.id,
      date: new Date(),
      customerName: order.customerName,
      total,
      status: SaleStatus.PAID,
      createdById: actorUserId || order.createdById,
      items: {
        createMany: {
          data: saleItemsPayload,
        },
      },
    },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    await requireAuth(request, { anyPermission: ["orders:view", "orders:manage"] });
    const { orderId } = await context.params;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
    if (!order) {
      throw new HttpError(404, "order_not_found", "Order not found");
    }

    return jsonOk({ order: mapOrder(order) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await requireAuth(request, { allPermissions: ["orders:manage"] });
    const { orderId } = await context.params;
    const payload = await readJson(request, orderUpdateSchema);

    const updatedOrder = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      });
      if (!order) {
        throw new HttpError(404, "order_not_found", "Order not found");
      }

      if (order.status === OrderStatus.DELIVERED && payload.status && toOrderStatus(payload.status) !== OrderStatus.DELIVERED) {
        throw new HttpError(400, "order_finalized", "Delivered orders cannot be moved back");
      }
      if (order.status === OrderStatus.CANCELLED && payload.status && toOrderStatus(payload.status) !== OrderStatus.CANCELLED) {
        throw new HttpError(400, "order_cancelled", "Cancelled orders cannot be re-opened");
      }

      let tableId = order.tableId;
      if (payload.tableId !== undefined) {
        if (payload.tableId) {
          const table = await tx.diningTable.findUnique({
            where: { id: payload.tableId },
            include: {
              orders: {
                where: { status: { in: ACTIVE_ORDER_STATUSES } },
                select: { id: true },
              },
            },
          });
          if (!table) {
            throw new HttpError(404, "table_not_found", "Table not found");
          }
          if (table.orders.some((tableOrder) => tableOrder.id !== order.id)) {
            throw new HttpError(400, "table_occupied", "Table is occupied by another active order");
          }
          tableId = table.id;
        } else {
          tableId = null;
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

      const nextStatus = payload.status ? toOrderStatus(payload.status) : order.status;

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: payload.status ? toOrderStatus(payload.status) : undefined,
          tableId,
          driverId: payload.driverId === undefined ? undefined : payload.driverId,
          notes: payload.notes === undefined ? undefined : payload.notes,
        },
        include: orderInclude,
      });

      if (order.tableId && order.tableId !== tableId) {
        await tx.diningTable.update({
          where: { id: order.tableId },
          data: { isOccupied: false },
        });
      }

      if (tableId) {
        const shouldOccupy = ACTIVE_ORDER_STATUSES.includes(nextStatus);
        await tx.diningTable.update({
          where: { id: tableId },
          data: { isOccupied: shouldOccupy },
        });
      }

      if (order.tableId && (nextStatus === OrderStatus.CANCELLED || nextStatus === OrderStatus.DELIVERED)) {
        await tx.diningTable.update({
          where: { id: order.tableId },
          data: { isOccupied: false },
        });
      }

      if (nextStatus === OrderStatus.DELIVERED) {
        await upsertApprovedSaleForOrder(tx, order.id, auth.user.id);
      }

      return updated;
    });

    return jsonOk({ order: mapOrder(updatedOrder) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    await requireAuth(request, { anyPermission: ["orders:delete", "orders:manage"] });
    const { orderId } = await context.params;

    await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      });
      if (!order) {
        throw new HttpError(404, "order_not_found", "Order not found");
      }

      await tx.order.delete({ where: { id: order.id } });

      if (order.tableId) {
        const active = await tx.order.findFirst({
          where: {
            tableId: order.tableId,
            status: { in: ACTIVE_ORDER_STATUSES },
          },
          select: { id: true },
        });

        await tx.diningTable.update({
          where: { id: order.tableId },
          data: { isOccupied: Boolean(active) },
        });
      }
    });

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
