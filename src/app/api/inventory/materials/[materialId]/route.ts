import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapMaterial } from "@/server/inventory/mappers";
import { materialUpdateSchema } from "@/server/validation/schemas";

function isPrismaConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2003"
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ materialId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["inventory:view"] });
    const { materialId } = await context.params;

    const material = await db.material.findUnique({
      where: { id: materialId },
    });
    if (!material) {
      throw new HttpError(404, "material_not_found", "Material not found");
    }

    return jsonOk({ material: mapMaterial(material) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ materialId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["inventory:manage"] });
    const { materialId } = await context.params;
    const payload = await readJson(request, materialUpdateSchema);

    const material = await db.material.findUnique({ where: { id: materialId } });
    if (!material) {
      throw new HttpError(404, "material_not_found", "Material not found");
    }

    if (payload.name && payload.name.trim() !== material.name) {
      const exists = await db.material.findUnique({
        where: { name: payload.name.trim() },
        select: { id: true },
      });
      if (exists) {
        throw new HttpError(409, "material_exists", "Material name already exists");
      }
    }

    const updated = await db.material.update({
      where: { id: material.id },
      data: {
        name: payload.name?.trim(),
        unit: payload.unit?.trim(),
        cost: payload.cost,
        stock: payload.stock,
        minStock: payload.minStock,
      },
    });

    return jsonOk({ material: mapMaterial(updated) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ materialId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["inventory:manage"] });
    const { materialId } = await context.params;

    const material = await db.material.findUnique({
      where: { id: materialId },
      select: { id: true },
    });
    if (!material) {
      throw new HttpError(404, "material_not_found", "Material not found");
    }

    await db.material.delete({
      where: { id: material.id },
    });

    return jsonOk({ deleted: true });
  } catch (error) {
    if (isPrismaConstraintError(error)) {
      return jsonError(
        new HttpError(
          400,
          "material_in_use",
          "Material is used in recipes or transactions and cannot be deleted"
        )
      );
    }
    return jsonError(error);
  }
}
