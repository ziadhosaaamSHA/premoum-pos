import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapMaterial } from "@/server/inventory/mappers";
import { materialCreateSchema } from "@/server/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["inventory:view"] });
    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();

    const materials = await db.material.findMany({
      orderBy: { name: "asc" },
    });

    const filtered = materials.filter((item) => {
      if (!search) return true;
      return item.name.toLowerCase().includes(search) || item.unit.toLowerCase().includes(search);
    });

    return jsonOk({ materials: filtered.map((item) => mapMaterial(item)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["inventory:manage"] });
    const payload = await readJson(request, materialCreateSchema);

    const exists = await db.material.findUnique({
      where: { name: payload.name.trim() },
      select: { id: true },
    });
    if (exists) {
      throw new HttpError(409, "material_exists", "Material name already exists");
    }

    const material = await db.material.create({
      data: {
        name: payload.name.trim(),
        unit: payload.unit.trim(),
        cost: payload.cost,
        stock: payload.stock,
        minStock: payload.minStock,
      },
    });

    return jsonOk({ material: mapMaterial(material) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
