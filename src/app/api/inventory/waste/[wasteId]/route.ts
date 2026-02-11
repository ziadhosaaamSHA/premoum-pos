import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapWaste, parseUiDate } from "@/server/inventory/mappers";
import { wasteUpdateSchema } from "@/server/validation/schemas";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ wasteId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["inventory:view"] });
    const { wasteId } = await context.params;

    const waste = await db.waste.findUnique({
      where: { id: wasteId },
      include: {
        material: { select: { id: true, name: true, unit: true } },
      },
    });
    if (!waste) {
      throw new HttpError(404, "waste_not_found", "Waste record not found");
    }

    return jsonOk({ waste: mapWaste(waste) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ wasteId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["inventory:manage"] });
    const { wasteId } = await context.params;
    const payload = await readJson(request, wasteUpdateSchema);

    const updated = await db.$transaction(async (tx) => {
      const current = await tx.waste.findUnique({
        where: { id: wasteId },
      });
      if (!current) {
        throw new HttpError(404, "waste_not_found", "Waste record not found");
      }

      const nextMaterialId = payload.materialId || current.materialId;
      const nextQuantity = payload.quantity ?? Number(current.quantity);

      const nextMaterial = await tx.material.findUnique({
        where: { id: nextMaterialId },
      });
      if (!nextMaterial) {
        throw new HttpError(404, "material_not_found", "Material not found");
      }

      if (nextMaterialId === current.materialId) {
        const currentQuantity = Number(current.quantity);
        const delta = nextQuantity - currentQuantity;
        if (delta > 0) {
          const enough = await tx.material.updateMany({
            where: {
              id: current.materialId,
              stock: { gte: delta },
            },
            data: {
              stock: { decrement: delta },
            },
          });
          if (enough.count === 0) {
            throw new HttpError(400, "insufficient_stock", "Insufficient stock for waste quantity");
          }
        } else if (delta < 0) {
          await tx.material.update({
            where: { id: current.materialId },
            data: {
              stock: { increment: Math.abs(delta) },
            },
          });
        }
      } else {
        await tx.material.update({
          where: { id: current.materialId },
          data: {
            stock: { increment: Number(current.quantity) },
          },
        });
        const enough = await tx.material.updateMany({
          where: {
            id: nextMaterialId,
            stock: { gte: nextQuantity },
          },
          data: {
            stock: { decrement: nextQuantity },
          },
        });
        if (enough.count === 0) {
          throw new HttpError(400, "insufficient_stock", "Insufficient stock for waste quantity");
        }
      }

      let parsedDate: Date | undefined;
      if (payload.date !== undefined) {
        const parsed = parseUiDate(payload.date);
        if (!parsed) {
          throw new HttpError(400, "invalid_date", "Invalid waste date");
        }
        parsedDate = parsed;
      }

      const cost = payload.cost ?? Number(nextMaterial.cost) * nextQuantity;

      return tx.waste.update({
        where: { id: current.id },
        data: {
          date: parsedDate,
          materialId: nextMaterialId,
          quantity: nextQuantity,
          reason: payload.reason?.trim(),
          cost,
        },
        include: {
          material: { select: { id: true, name: true, unit: true } },
        },
      });
    });

    return jsonOk({ waste: mapWaste(updated) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ wasteId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["inventory:manage"] });
    const { wasteId } = await context.params;

    await db.$transaction(async (tx) => {
      const waste = await tx.waste.findUnique({
        where: { id: wasteId },
      });
      if (!waste) {
        throw new HttpError(404, "waste_not_found", "Waste record not found");
      }

      await tx.material.update({
        where: { id: waste.materialId },
        data: { stock: { increment: Number(waste.quantity) } },
      });

      await tx.waste.delete({
        where: { id: waste.id },
      });
    });

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
