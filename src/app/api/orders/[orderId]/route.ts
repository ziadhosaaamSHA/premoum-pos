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
import { fetchBranding } from "@/server/settings/branding";
import { orderUpdateSchema } from "@/server/validation/schemas";
import { buildReceiptSnapshot } from "@/lib/receipt";

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
    const branding = await fetchBranding(db);

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

      if (payload.itemDeductions && payload.itemDeductions.length > 0) {
        if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
          throw new HttpError(400, "order_finalized", "Finalized orders cannot be adjusted");
        }

        const requestedItemIds = Array.from(
          new Set(payload.itemDeductions.map((item) => item.itemId))
        );

        const orderItems = await tx.orderItem.findMany({
          where: {
            orderId: order.id,
            id: { in: requestedItemIds },
          },
          include: {
            product: {
              select: {
                id: true,
                recipeItems: {
                  select: {
                    materialId: true,
                    quantity: true,
                  },
                },
              },
            },
          },
        });

        if (orderItems.length !== requestedItemIds.length) {
          throw new HttpError(400, "invalid_deduction_items", "One or more deducted items are invalid");
        }

        const orderItemMap = new Map(orderItems.map((item) => [item.id, item]));
        const materialRestore = new Map<string, number>();

        for (const deduction of payload.itemDeductions) {
          const line = orderItemMap.get(deduction.itemId);
          if (!line) {
            throw new HttpError(400, "invalid_deduction_item", "Invalid deduction line");
          }

          const deductQty = Math.min(line.quantity, deduction.quantity);
          if (deductQty <= 0) continue;

          const remainingQty = line.quantity - deductQty;
          if (remainingQty <= 0) {
            await tx.orderItem.delete({ where: { id: line.id } });
          } else {
            await tx.orderItem.update({
              where: { id: line.id },
              data: {
                quantity: remainingQty,
                totalPrice: Number(line.unitPrice) * remainingQty,
              },
            });
          }

          for (const recipe of line.product?.recipeItems || []) {
            const restoreQty = Number(recipe.quantity || 0) * deductQty;
            if (restoreQty > 0) {
              materialRestore.set(
                recipe.materialId,
                (materialRestore.get(recipe.materialId) || 0) + restoreQty
              );
            }
          }
        }

        for (const [materialId, qty] of materialRestore.entries()) {
          await tx.material.update({
            where: { id: materialId },
            data: {
              stock: { increment: qty },
            },
          });
        }
      }

      const subtotalAggregate = await tx.orderItem.aggregate({
        where: { orderId: order.id },
        _sum: { totalPrice: true },
      });
      const subtotal = Number(subtotalAggregate._sum.totalPrice || 0);
      const nextDiscountRaw =
        payload.discount !== undefined ? Number(payload.discount) : Number(order.discount || 0);
      const nextDiscount = Math.min(subtotal, Math.max(0, nextDiscountRaw));
      const orderTaxRate = Number(order.taxRate || 0);
      const taxableBase = Math.max(0, subtotal - nextDiscount);
      const nextTaxAmount = taxableBase * (orderTaxRate / 100);

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: payload.status ? toOrderStatus(payload.status) : undefined,
          tableId,
          driverId: payload.driverId === undefined ? undefined : payload.driverId,
          discount: payload.discount === undefined ? undefined : nextDiscount,
          taxAmount: nextTaxAmount,
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

      const mapped = mapOrder(updated);
      const receiptSnapshot = buildReceiptSnapshot({
        code: mapped.code,
        createdAt: mapped.createdAt,
        customerName: mapped.customer,
        orderType: mapped.type,
        payment: mapped.payment,
        brandName: branding.brandName,
        brandTagline: branding.brandTagline || undefined,
        logoUrl: branding.logoUrl || null,
        tableName: mapped.tableName,
        tableNumber: mapped.tableNumber ?? null,
        zoneName: mapped.zoneName,
        items: mapped.items.map((item) => ({
          name: item.name,
          qty: item.qty,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        discount: mapped.discount,
        taxRate: mapped.taxRate,
        taxAmount: mapped.taxAmount,
        deliveryFee: mapped.deliveryFee,
        total: mapped.total,
        notes: mapped.notes,
      });

      const withReceipt = await tx.order.update({
        where: { id: order.id },
        data: { receiptSnapshot: receiptSnapshot as Prisma.InputJsonValue },
        include: orderInclude,
      });

      if (nextStatus === OrderStatus.DELIVERED) {
        await upsertApprovedSaleForOrder(tx, order.id, auth.user.id);
      }

      return withReceipt;
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
