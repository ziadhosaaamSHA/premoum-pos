import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { ACTIVE_ORDER_STATUSES, mapTable } from "@/server/pos/mappers";
import { tableCreateSchema } from "@/server/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { anyPermission: ["orders:view", "orders:manage"] });
    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();

    const tables = await db.diningTable.findMany({
      orderBy: [{ number: "asc" }, { name: "asc" }],
      include: {
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
      },
    });

    const mapped = tables.map((table) => mapTable(table));
    const filtered = mapped.filter((table) => {
      if (!search) return true;
      return (
        table.name.toLowerCase().includes(search) ||
        String(table.number).includes(search) ||
        table.id.toLowerCase().includes(search)
      );
    });

    return jsonOk({ tables: filtered });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["orders:manage"] });
    const payload = await readJson(request, tableCreateSchema);

    const exists = await db.diningTable.findFirst({
      where: {
        OR: [{ name: payload.name.trim() }, { number: payload.number }],
      },
      select: { id: true },
    });
    if (exists) {
      throw new HttpError(409, "table_exists", "A table with this name or number already exists");
    }

    const table = await db.diningTable.create({
      data: {
        name: payload.name.trim(),
        number: payload.number,
      },
      include: {
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
      },
    });

    return jsonOk({ table: mapTable(table) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
