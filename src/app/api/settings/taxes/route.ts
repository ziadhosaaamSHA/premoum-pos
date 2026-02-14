import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { taxCreateSchema } from "@/server/validation/schemas";

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

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { anyPermission: ["settings:view", "settings:manage"] });

    const taxes = await db.taxRate.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return jsonOk({ taxes: taxes.map((tax) => mapTax(tax)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["settings:manage"] });
    const payload = await readJson(request, taxCreateSchema);

    const name = payload.name.trim();
    const rate = Number(payload.rate);
    const isDefault = Boolean(payload.isDefault);
    const isActive = payload.isActive !== undefined ? Boolean(payload.isActive) : true;

    const existing = await db.taxRate.findFirst({ where: { name } });
    if (existing) {
      throw new HttpError(409, "tax_exists", "Tax name already exists");
    }

    const tax = await db.$transaction(async (tx) => {
      if (isDefault) {
        await tx.taxRate.updateMany({ data: { isDefault: false } });
      }

      return tx.taxRate.create({
        data: {
          name,
          rate,
          isDefault,
          isActive: isDefault ? true : isActive,
        },
      });
    });

    return jsonOk({ tax: mapTax(tax) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
