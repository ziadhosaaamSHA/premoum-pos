import { OrderType } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { ACTIVE_ORDER_STATUSES } from "@/server/pos/mappers";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapDriver } from "@/server/delivery/mappers";
import { driverUpdateSchema } from "@/server/validation/schemas";

async function getActiveOrderCount(driverId: string) {
  return db.order.count({
    where: {
      driverId,
      type: OrderType.DELIVERY,
      status: { in: ACTIVE_ORDER_STATUSES },
    },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ driverId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["delivery:view"] });
    const { driverId } = await context.params;

    const driver = await db.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      throw new HttpError(404, "driver_not_found", "Driver not found");
    }

    const activeOrders = await getActiveOrderCount(driver.id);
    return jsonOk({ driver: mapDriver({ ...driver, _count: { orders: activeOrders } }) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ driverId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["delivery:manage"] });
    const { driverId } = await context.params;
    const payload = await readJson(request, driverUpdateSchema);

    const current = await db.driver.findUnique({
      where: { id: driverId },
      select: { id: true, name: true },
    });
    if (!current) {
      throw new HttpError(404, "driver_not_found", "Driver not found");
    }

    if (payload.name && payload.name.trim() !== current.name) {
      const exists = await db.driver.findFirst({
        where: {
          id: { not: current.id },
          name: payload.name.trim(),
        },
        select: { id: true },
      });
      if (exists) {
        throw new HttpError(409, "driver_exists", "Driver name already exists");
      }
    }

    const updated = await db.driver.update({
      where: { id: current.id },
      data: {
        name: payload.name?.trim(),
        phone: payload.phone === undefined ? undefined : payload.phone || null,
        status: payload.status?.trim(),
      },
    });
    const activeOrders = await getActiveOrderCount(updated.id);

    return jsonOk({ driver: mapDriver({ ...updated, _count: { orders: activeOrders } }) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ driverId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["delivery:manage"] });
    const { driverId } = await context.params;

    const driver = await db.driver.findUnique({
      where: { id: driverId },
      select: { id: true },
    });
    if (!driver) {
      throw new HttpError(404, "driver_not_found", "Driver not found");
    }

    const activeOrders = await getActiveOrderCount(driver.id);
    if (activeOrders > 0) {
      throw new HttpError(400, "driver_has_active_orders", "Driver has active orders");
    }

    await db.driver.delete({
      where: { id: driver.id },
    });

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
