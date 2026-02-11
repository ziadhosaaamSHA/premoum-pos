import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapSupplier } from "@/server/suppliers/mappers";
import { supplierCreateSchema } from "@/server/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["suppliers:view"] });

    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();
    const status = request.nextUrl.searchParams.get("status")?.trim();

    const rows = await db.supplier.findMany({
      where: {
        ...(status ? { isActive: status === "active" } : {}),
      },
      orderBy: { name: "asc" },
      include: {
        purchases: {
          select: { id: true },
        },
      },
    });

    const filtered = rows.filter((row) => {
      if (!search) return true;
      return (
        row.name.toLowerCase().includes(search) ||
        (row.phone || "").toLowerCase().includes(search) ||
        (row.email || "").toLowerCase().includes(search)
      );
    });

    return jsonOk({ suppliers: filtered.map((row) => mapSupplier(row)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["suppliers:manage"] });
    const payload = await readJson(request, supplierCreateSchema);

    const name = payload.name.trim();

    const existing = await db.supplier.findFirst({
      where: {
        name,
      },
      include: {
        purchases: {
          select: { id: true },
        },
      },
    });

    if (existing) {
      throw new HttpError(409, "supplier_exists", "Supplier name already exists");
    }

    const supplier = await db.supplier.create({
      data: {
        name,
        phone: payload.phone || null,
        email: payload.email || null,
        isActive: payload.status === "active",
      },
      include: {
        purchases: {
          select: { id: true },
        },
      },
    });

    return jsonOk({ supplier: mapSupplier(supplier) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
