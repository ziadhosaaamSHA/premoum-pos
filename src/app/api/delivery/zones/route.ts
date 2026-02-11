import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapZone, toZoneStatus } from "@/server/delivery/mappers";
import { zoneCreateSchema } from "@/server/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["delivery:view"] });
    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();
    const status = request.nextUrl.searchParams.get("status")?.trim();

    const zones = await db.zone.findMany({
      where: {
        ...(status ? { status: status === "active" ? "ACTIVE" : "INACTIVE" } : {}),
      },
      orderBy: { name: "asc" },
    });

    const filtered = zones.filter((zone) => {
      if (!search) return true;
      return zone.name.toLowerCase().includes(search);
    });

    return jsonOk({ zones: filtered.map((zone) => mapZone(zone)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["delivery:manage"] });
    const payload = await readJson(request, zoneCreateSchema);

    const name = payload.name.trim();
    const exists = await db.zone.findUnique({
      where: { name },
      select: { id: true },
    });
    if (exists) {
      throw new HttpError(409, "zone_exists", "Zone name already exists");
    }

    const created = await db.zone.create({
      data: {
        name,
        limitKm: payload.limit,
        fee: payload.fee,
        minOrder: payload.minOrder,
        status: toZoneStatus(payload.status),
      },
    });

    return jsonOk({ zone: mapZone(created) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
