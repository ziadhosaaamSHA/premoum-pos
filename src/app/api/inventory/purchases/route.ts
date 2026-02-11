import { PurchaseStatus, Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapPurchase, parseUiDate, toPurchaseStatus } from "@/server/inventory/mappers";
import { generateCode } from "@/server/pos/mappers";
import { purchaseCreateSchema } from "@/server/validation/schemas";

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

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["inventory:view"] });

    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();
    const status = request.nextUrl.searchParams.get("status")?.trim().toUpperCase();

    const purchases = await db.purchase.findMany({
      where: {
        ...(status ? { status: status as "DRAFT" | "POSTED" | "CANCELLED" } : {}),
      },
      orderBy: { date: "desc" },
      include: {
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
      },
    });

    const filtered = purchases.filter((item) => {
      if (!search) return true;
      return (
        item.code.toLowerCase().includes(search) ||
        item.supplier.name.toLowerCase().includes(search) ||
        item.items.some((purchaseItem) => purchaseItem.material.name.toLowerCase().includes(search)) ||
        item.date.toISOString().slice(0, 10).includes(search)
      );
    });

    return jsonOk({ purchases: filtered.map((item) => mapPurchase(item)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, { allPermissions: ["inventory:manage"] });
    const payload = await readJson(request, purchaseCreateSchema);

    const parsedDate = parseUiDate(payload.date);
    if (!parsedDate) {
      throw new HttpError(400, "invalid_date", "Invalid purchase date");
    }

    const quantity = Number(payload.quantity);
    const unitCost = Number(payload.unitCost);
    const total = payload.total !== undefined ? Number(payload.total) : quantity * unitCost;
    const status = toPurchaseStatus(payload.status);

    const purchase = await db.$transaction(async (tx) => {
      const material = await tx.material.findUnique({
        where: { id: payload.materialId },
        select: { id: true },
      });
      if (!material) {
        throw new HttpError(404, "material_not_found", "Material not found");
      }

      const supplierId = await resolveSupplierId(tx, payload.supplierId);

      const created = await tx.purchase.create({
        data: {
          code: generateCode("PUR"),
          supplierId,
          date: parsedDate,
          total,
          status,
          notes: payload.notes || null,
          createdById: auth.user.id,
          items: {
            create: {
              materialId: material.id,
              quantity,
              unitCost,
              totalCost: quantity * unitCost,
            },
          },
        },
        include: {
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
        },
      });

      if (status === PurchaseStatus.POSTED) {
        await tx.material.update({
          where: { id: material.id },
          data: {
            stock: { increment: quantity },
          },
        });
      }

      return created;
    });

    return jsonOk({ purchase: mapPurchase(purchase) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
