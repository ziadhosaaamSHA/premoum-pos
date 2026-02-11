import { OrderType } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { ACTIVE_ORDER_STATUSES } from "@/server/pos/mappers";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapZone, toZoneStatus } from "@/server/delivery/mappers";
import { zoneUpdateSchema } from "@/server/validation/schemas";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ zoneId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["delivery:view"] });
    const { zoneId } = await context.params;

    const zone = await db.zone.findUnique({ where: { id: zoneId } });
    if (!zone) {
      throw new HttpError(404, "zone_not_found", "Zone not found");
    }
    return jsonOk({ zone: mapZone(zone) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ zoneId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["delivery:manage"] });
    const { zoneId } = await context.params;
    const payload = await readJson(request, zoneUpdateSchema);

    const current = await db.zone.findUnique({
      where: { id: zoneId },
      select: { id: true, name: true },
    });
    if (!current) {
      throw new HttpError(404, "zone_not_found", "Zone not found");
    }

    if (payload.name && payload.name.trim() !== current.name) {
      const exists = await db.zone.findUnique({
        where: { name: payload.name.trim() },
        select: { id: true },
      });
      if (exists) {
        throw new HttpError(409, "zone_exists", "Zone name already exists");
      }
    }

    const updated = await db.zone.update({
      where: { id: current.id },
      data: {
        name: payload.name?.trim(),
        limitKm: payload.limit,
        fee: payload.fee,
        minOrder: payload.minOrder,
        status: payload.status ? toZoneStatus(payload.status) : undefined,
      },
    });

    return jsonOk({ zone: mapZone(updated) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ zoneId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["delivery:manage"] });
    const { zoneId } = await context.params;

    const zone = await db.zone.findUnique({
      where: { id: zoneId },
      select: { id: true },
    });
    if (!zone) {
      throw new HttpError(404, "zone_not_found", "Zone not found");
    }

    const activeOrders = await db.order.count({
      where: {
        zoneId: zone.id,
        type: OrderType.DELIVERY,
        status: { in: ACTIVE_ORDER_STATUSES },
      },
    });
    if (activeOrders > 0) {
      throw new HttpError(400, "zone_has_active_orders", "Zone has active delivery orders");
    }

    await db.zone.delete({
      where: { id: zone.id },
    });

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
