import { OrderType } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { ACTIVE_ORDER_STATUSES } from "@/server/pos/mappers";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapDriver } from "@/server/delivery/mappers";
import { driverCreateSchema } from "@/server/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["delivery:view"] });
    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();
    const status = request.nextUrl.searchParams.get("status")?.trim().toLowerCase();

    const drivers = await db.driver.findMany({
      where: {
        ...(status ? { status } : {}),
      },
      orderBy: { name: "asc" },
    });

    const activeCounts = await db.order.groupBy({
      by: ["driverId"],
      where: {
        type: OrderType.DELIVERY,
        status: { in: ACTIVE_ORDER_STATUSES },
        driverId: { not: null },
      },
      _count: { _all: true },
    });
    const countsMap = new Map(
      activeCounts.map((row) => [row.driverId || "", row._count._all])
    );

    const filtered = drivers.filter((driver) => {
      if (!search) return true;
      return (
        driver.name.toLowerCase().includes(search) ||
        (driver.phone || "").toLowerCase().includes(search)
      );
    });

    return jsonOk({
      drivers: filtered.map((driver) =>
        mapDriver({
          ...driver,
          _count: { orders: countsMap.get(driver.id) || 0 },
        })
      ),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["delivery:manage"] });
    const payload = await readJson(request, driverCreateSchema);
    const name = payload.name.trim();

    const exists = await db.driver.findFirst({
      where: { name },
      select: { id: true },
    });
    if (exists) {
      throw new HttpError(409, "driver_exists", "Driver name already exists");
    }

    const created = await db.driver.create({
      data: {
        name,
        phone: payload.phone || null,
        status: payload.status.trim(),
      },
    });

    return jsonOk({ driver: mapDriver(created) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
