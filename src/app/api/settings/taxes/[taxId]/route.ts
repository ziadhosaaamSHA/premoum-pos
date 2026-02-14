import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { taxUpdateSchema } from "@/server/validation/schemas";

function mapTax(row: {
  id: string;
  name: string;
  rate: unknown;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    rate: Number(row.rate),
    isDefault: row.isDefault,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ taxId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["settings:manage"] });
    const { taxId } = await context.params;
    const payload = await readJson(request, taxUpdateSchema);

    const tax = await db.taxRate.findUnique({ where: { id: taxId } });
    if (!tax) {
      throw new HttpError(404, "tax_not_found", "Tax not found");
    }

    if (payload.name) {
      const name = payload.name.trim();
      const exists = await db.taxRate.findFirst({
        where: {
          id: { not: taxId },
          name,
        },
      });
      if (exists) {
        throw new HttpError(409, "tax_exists", "Tax name already exists");
      }
    }

    const updated = await db.$transaction(async (tx) => {
      if (payload.isDefault) {
        await tx.taxRate.updateMany({ data: { isDefault: false } });
      }

      return tx.taxRate.update({
        where: { id: taxId },
        data: {
          name: payload.name?.trim(),
          rate: payload.rate,
          isDefault: payload.isDefault,
          isActive: payload.isActive,
        },
      });
    });

    return jsonOk({ tax: mapTax(updated) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ taxId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["settings:manage"] });
    const { taxId } = await context.params;

    const tax = await db.taxRate.findUnique({ where: { id: taxId } });
    if (!tax) {
      throw new HttpError(404, "tax_not_found", "Tax not found");
    }

    await db.taxRate.delete({ where: { id: taxId } });

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
