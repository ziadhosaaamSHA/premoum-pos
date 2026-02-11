import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { ACTIVE_ORDER_STATUSES, mapTable } from "@/server/pos/mappers";
import { tableUpdateSchema } from "@/server/validation/schemas";

const tableInclude = {
  orders: {
    where: { status: { in: ACTIVE_ORDER_STATUSES } },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: {
      id: true,
      code: true,
      customerName: true,
      status: true,
    },
  },
} as const;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tableId: string }> }
) {
  try {
    await requireAuth(request, { anyPermission: ["orders:view", "orders:manage"] });
    const { tableId } = await context.params;

    const table = await db.diningTable.findUnique({
      where: { id: tableId },
      include: tableInclude,
    });

    if (!table) {
      throw new HttpError(404, "table_not_found", "Table not found");
    }

    return jsonOk({ table: mapTable(table) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tableId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["orders:manage"] });
    const { tableId } = await context.params;
    const payload = await readJson(request, tableUpdateSchema);

    const updatedTable = await db.$transaction(async (tx) => {
      const table = await tx.diningTable.findUnique({
        where: { id: tableId },
      });
      if (!table) {
        throw new HttpError(404, "table_not_found", "Table not found");
      }

      if (payload.name || payload.number !== undefined) {
        const exists = await tx.diningTable.findFirst({
          where: {
            id: { not: table.id },
            OR: [
              ...(payload.name ? [{ name: payload.name.trim() }] : []),
              ...(payload.number !== undefined ? [{ number: payload.number }] : []),
            ],
          },
          select: { id: true },
        });
        if (exists) {
          throw new HttpError(409, "table_exists", "Another table with this name/number already exists");
        }
      }

      if (payload.orderId !== undefined) {
        if (payload.orderId) {
          const order = await tx.order.findUnique({
            where: { id: payload.orderId },
            select: { id: true, status: true },
          });
          if (!order) {
            throw new HttpError(404, "order_not_found", "Order not found");
          }
          if (!ACTIVE_ORDER_STATUSES.includes(order.status)) {
            throw new HttpError(400, "invalid_order_status", "Only active orders can be assigned to a table");
          }

          await tx.order.update({
            where: { id: order.id },
            data: { tableId: table.id, type: "DINE_IN" },
          });
        } else {
          await tx.order.updateMany({
            where: {
              tableId: table.id,
              status: { in: ACTIVE_ORDER_STATUSES },
            },
            data: { tableId: null },
          });
        }
      }

      if (payload.status === "empty") {
        await tx.order.updateMany({
          where: {
            tableId: table.id,
            status: { in: ACTIVE_ORDER_STATUSES },
          },
          data: { tableId: null },
        });
      }

      const hasActiveOrder = await tx.order.findFirst({
        where: {
          tableId: table.id,
          status: { in: ACTIVE_ORDER_STATUSES },
        },
        select: { id: true },
      });

      const shouldOccupy = payload.status
        ? payload.status === "occupied" || Boolean(hasActiveOrder)
        : Boolean(hasActiveOrder);

      const updated = await tx.diningTable.update({
        where: { id: table.id },
        data: {
          name: payload.name?.trim(),
          number: payload.number,
          isOccupied: shouldOccupy,
        },
        include: tableInclude,
      });

      return updated;
    });

    return jsonOk({ table: mapTable(updatedTable) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ tableId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["orders:manage"] });
    const { tableId } = await context.params;

    await db.$transaction(async (tx) => {
      const table = await tx.diningTable.findUnique({
        where: { id: tableId },
      });
      if (!table) {
        throw new HttpError(404, "table_not_found", "Table not found");
      }

      const activeOrder = await tx.order.findFirst({
        where: {
          tableId: table.id,
          status: { in: ACTIVE_ORDER_STATUSES },
        },
        select: { id: true },
      });
      if (activeOrder) {
        throw new HttpError(400, "table_has_active_order", "Cannot delete table with active orders");
      }

      await tx.diningTable.delete({ where: { id: table.id } });
    });

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
