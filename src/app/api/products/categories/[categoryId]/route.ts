import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapCategory } from "@/server/products/mappers";
import { categoryUpdateSchema } from "@/server/validation/schemas";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ categoryId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["products:view"] });
    const { categoryId } = await context.params;

    const category = await db.category.findUnique({
      where: { id: categoryId },
      include: {
        products: {
          select: { id: true },
        },
      },
    });
    if (!category) {
      throw new HttpError(404, "category_not_found", "Category not found");
    }

    return jsonOk({ category: mapCategory(category) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ categoryId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["products:manage"] });
    const { categoryId } = await context.params;
    const payload = await readJson(request, categoryUpdateSchema);

    const current = await db.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true },
    });
    if (!current) {
      throw new HttpError(404, "category_not_found", "Category not found");
    }

    if (payload.name && payload.name.trim() !== current.name) {
      const exists = await db.category.findUnique({
        where: { name: payload.name.trim() },
        select: { id: true },
      });
      if (exists) {
        throw new HttpError(409, "category_exists", "Category name already exists");
      }
    }

    const updated = await db.category.update({
      where: { id: current.id },
      data: {
        name: payload.name?.trim(),
        description: payload.description === undefined ? undefined : payload.description || null,
      },
      include: {
        products: {
          select: { id: true },
        },
      },
    });

    return jsonOk({ category: mapCategory(updated) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ categoryId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["products:manage"] });
    const { categoryId } = await context.params;

    const category = await db.category.findUnique({
      where: { id: categoryId },
      include: {
        products: {
          select: { id: true },
        },
      },
    });
    if (!category) {
      throw new HttpError(404, "category_not_found", "Category not found");
    }
    const productIds = category.products.map((product) => product.id);

    await db.$transaction(async (tx) => {
      if (productIds.length) {
        await tx.product.deleteMany({
          where: { id: { in: productIds } },
        });
      }

      await tx.category.delete({
        where: { id: category.id },
      });
    });

    return jsonOk({ deleted: true, deletedProducts: productIds.length });
  } catch (error) {
    return jsonError(error);
  }
}
