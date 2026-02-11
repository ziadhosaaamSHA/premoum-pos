import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapWaste, parseUiDate } from "@/server/inventory/mappers";
import { wasteCreateSchema } from "@/server/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["inventory:view"] });
    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();

    const waste = await db.waste.findMany({
      orderBy: { date: "desc" },
      include: {
        material: {
          select: { id: true, name: true, unit: true },
        },
      },
    });

    const filtered = waste.filter((item) => {
      if (!search) return true;
      return (
        item.material.name.toLowerCase().includes(search) ||
        item.reason.toLowerCase().includes(search) ||
        item.date.toISOString().slice(0, 10).includes(search)
      );
    });

    return jsonOk({ waste: filtered.map((item) => mapWaste(item)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, { allPermissions: ["inventory:manage"] });
    const payload = await readJson(request, wasteCreateSchema);

    const parsedDate = parseUiDate(payload.date);
    if (!parsedDate) {
      throw new HttpError(400, "invalid_date", "Invalid waste date");
    }

    const created = await db.$transaction(async (tx) => {
      const material = await tx.material.findUnique({
        where: { id: payload.materialId },
      });
      if (!material) {
        throw new HttpError(404, "material_not_found", "Material not found");
      }

      const enough = await tx.material.updateMany({
        where: {
          id: material.id,
          stock: { gte: payload.quantity },
        },
        data: {
          stock: { decrement: payload.quantity },
        },
      });
      if (enough.count === 0) {
        throw new HttpError(400, "insufficient_stock", "Insufficient stock for waste quantity");
      }

      const cost = payload.cost ?? Number(material.cost) * payload.quantity;

      return tx.waste.create({
        data: {
          date: parsedDate,
          materialId: material.id,
          quantity: payload.quantity,
          reason: payload.reason.trim(),
          cost,
          createdById: auth.user.id,
        },
        include: {
          material: {
            select: { id: true, name: true, unit: true },
          },
        },
      });
    });

    return jsonOk({ waste: mapWaste(created) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
