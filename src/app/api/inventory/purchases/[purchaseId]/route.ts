import { Prisma, PurchaseStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapPurchase, parseUiDate, toPurchaseStatus } from "@/server/inventory/mappers";
import { purchaseUpdateSchema } from "@/server/validation/schemas";

const DIRECT_SUPPLIER_NAME = "بدون مورد";

async function resolveSupplierId(
  tx: Prisma.TransactionClient,
  supplierId: string | null | undefined
) {
  if (supplierId) {
    const supplier = await tx.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, isActive: true },
    });
    if (!supplier) {
      throw new HttpError(404, "supplier_not_found", "Supplier not found");
    }
    if (!supplier.isActive) {
      throw new HttpError(400, "supplier_inactive", "Supplier is inactive");
    }
    return supplier.id;
  }

  const fallback = await tx.supplier.findFirst({
    where: { name: DIRECT_SUPPLIER_NAME },
    select: { id: true, isActive: true },
  });

  if (fallback) {
    if (!fallback.isActive) {
      await tx.supplier.update({
        where: { id: fallback.id },
        data: { isActive: true },
      });
    }
    return fallback.id;
  }

  const created = await tx.supplier.create({
    data: {
      name: DIRECT_SUPPLIER_NAME,
      isActive: true,
    },
    select: { id: true },
  });
  return created.id;
}

const purchaseInclude = {
  supplier: {
    select: { id: true, name: true },
  },
  items: {
    orderBy: { id: "asc" },
    include: {
      material: {
        select: { id: true, name: true },
      },
    },
  },
} as const;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ purchaseId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["inventory:view"] });
    const { purchaseId } = await context.params;

    const purchase = await db.purchase.findUnique({
      where: { id: purchaseId },
      include: purchaseInclude,
    });
    if (!purchase) {
      throw new HttpError(404, "purchase_not_found", "Purchase not found");
    }

    return jsonOk({ purchase: mapPurchase(purchase) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ purchaseId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["inventory:manage"] });
    const { purchaseId } = await context.params;
    const payload = await readJson(request, purchaseUpdateSchema);

    const updated = await db.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: {
          items: {
            orderBy: { id: "asc" },
            select: {
              id: true,
              materialId: true,
              quantity: true,
              unitCost: true,
            },
          },
        },
      });
      if (!purchase) {
        throw new HttpError(404, "purchase_not_found", "Purchase not found");
      }

      const firstItem = purchase.items[0];
      if (!firstItem) {
        throw new HttpError(400, "purchase_missing_item", "Purchase has no items");
      }

      let parsedDate: Date | undefined;
      if (payload.date !== undefined) {
        parsedDate = parseUiDate(payload.date) || undefined;
        if (!parsedDate) {
          throw new HttpError(400, "invalid_date", "Invalid purchase date");
        }
      }

      const nextMaterialId = payload.materialId || firstItem.materialId;
      const nextQuantity = payload.quantity !== undefined ? Number(payload.quantity) : Number(firstItem.quantity);
      const nextUnitCost = payload.unitCost !== undefined ? Number(payload.unitCost) : Number(firstItem.unitCost);
      const nextTotal =
        payload.total !== undefined ? Number(payload.total) : nextQuantity * nextUnitCost;
      const nextStatus = payload.status ? toPurchaseStatus(payload.status) : purchase.status;
      const resolvedSupplierInput =
        payload.supplierId !== undefined ? payload.supplierId : purchase.supplierId;
      const supplierId = await resolveSupplierId(tx, resolvedSupplierInput);

      const material = await tx.material.findUnique({
        where: { id: nextMaterialId },
        select: { id: true },
      });
      if (!material) {
        throw new HttpError(404, "material_not_found", "Material not found");
      }

      const stockDeltaByMaterial = new Map<string, number>();
      const previousWasPosted = purchase.status === PurchaseStatus.POSTED;
      const nextIsPosted = nextStatus === PurchaseStatus.POSTED;

      if (previousWasPosted) {
        stockDeltaByMaterial.set(
          firstItem.materialId,
          (stockDeltaByMaterial.get(firstItem.materialId) || 0) - Number(firstItem.quantity)
        );
      }

      if (nextIsPosted) {
        stockDeltaByMaterial.set(
          nextMaterialId,
          (stockDeltaByMaterial.get(nextMaterialId) || 0) + nextQuantity
        );
      }

      for (const [materialId, delta] of stockDeltaByMaterial.entries()) {
        if (delta === 0) continue;

        if (delta < 0) {
          const decrementBy = Math.abs(delta);
          const result = await tx.material.updateMany({
            where: {
              id: materialId,
              stock: { gte: decrementBy },
            },
            data: {
              stock: { decrement: decrementBy },
            },
          });

          if (result.count === 0) {
            throw new HttpError(
              400,
              "insufficient_stock_for_revert",
              "Cannot update purchase because stock would become negative"
            );
          }
        } else {
          await tx.material.update({
            where: { id: materialId },
            data: {
              stock: { increment: delta },
            },
          });
        }
      }

      await tx.purchaseItem.update({
        where: { id: firstItem.id },
        data: {
          materialId: nextMaterialId,
          quantity: nextQuantity,
          unitCost: nextUnitCost,
          totalCost: nextQuantity * nextUnitCost,
        },
      });

      await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          date: parsedDate,
          supplierId,
          total: nextTotal,
          status: nextStatus,
          notes: payload.notes === undefined ? undefined : payload.notes,
        },
      });

      return tx.purchase.findUniqueOrThrow({
        where: { id: purchase.id },
        include: purchaseInclude,
      });
    });

    return jsonOk({ purchase: mapPurchase(updated) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ purchaseId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["inventory:manage"] });
    const { purchaseId } = await context.params;

    const purchase = await db.purchase.findUnique({
      where: { id: purchaseId },
      select: {
        id: true,
        status: true,
      },
    });
    if (!purchase) {
      throw new HttpError(404, "purchase_not_found", "Purchase not found");
    }

    if (purchase.status !== PurchaseStatus.DRAFT) {
      throw new HttpError(400, "purchase_not_draft", "Only draft purchases can be deleted");
    }

    await db.purchase.delete({
      where: { id: purchase.id },
    });

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
