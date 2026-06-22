import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapSupplier } from "@/server/suppliers/mappers";
import { supplierUpdateSchema } from "@/server/validation/schemas";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ supplierId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["suppliers:view"] });
    const { supplierId } = await context.params;

    const supplier = await db.supplier.findUnique({
      where: { id: supplierId },
      include: {
        purchases: {
          select: { id: true },
        },
      },
    });
    if (!supplier) {
      throw new HttpError(404, "supplier_not_found", "Supplier not found");
    }

    return jsonOk({ supplier: mapSupplier(supplier) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ supplierId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["suppliers:manage"] });
    const { supplierId } = await context.params;
    const payload = await readJson(request, supplierUpdateSchema);

    const current = await db.supplier.findUnique({
      where: { id: supplierId },
      include: {
        purchases: {
          select: { id: true },
        },
      },
    });
    if (!current) {
      throw new HttpError(404, "supplier_not_found", "Supplier not found");
    }

    if (payload.name && payload.name.trim() !== current.name) {
      const exists = await db.supplier.findFirst({
        where: {
          id: { not: current.id },
          name: payload.name.trim(),
        },
        select: { id: true },
      });
      if (exists) {
        throw new HttpError(409, "supplier_exists", "Supplier name already exists");
      }
    }

    const updated = await db.supplier.update({
      where: { id: current.id },
      data: {
        name: payload.name?.trim(),
        phone: payload.phone === undefined ? undefined : payload.phone || null,
        email: payload.email === undefined ? undefined : payload.email || null,
        isActive: payload.status === undefined ? undefined : payload.status === "active",
      },
      include: {
        purchases: {
          select: { id: true },
        },
      },
    });

    return jsonOk({ supplier: mapSupplier(updated) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ supplierId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["suppliers:manage"] });
    const { supplierId } = await context.params;

    const supplier = await db.supplier.findUnique({
      where: { id: supplierId },
      include: {
        purchases: {
          select: { id: true },
        },
      },
    });
    if (!supplier) {
      throw new HttpError(404, "supplier_not_found", "Supplier not found");
    }

    await db.$transaction(async (tx) => {
      if (supplier.purchases.length > 0) {
        await tx.purchase.deleteMany({
          where: { supplierId: supplier.id },
        });
      }

      await tx.supplier.delete({
        where: { id: supplier.id },
      });
    });

    return jsonOk({
      deleted: true,
      mode: supplier.purchases.length > 0 ? "hard_with_purchases" : "hard",
      deletedPurchases: supplier.purchases.length,
    });
  } catch (error) {
    return jsonError(error);
  }
}
