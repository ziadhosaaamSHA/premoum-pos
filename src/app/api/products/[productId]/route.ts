import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapProduct } from "@/server/products/mappers";
import { productUpdateSchema } from "@/server/validation/schemas";

const productInclude = {
  category: {
    select: { id: true, name: true },
  },
  recipeItems: {
    orderBy: { id: "asc" },
    include: {
      material: {
        select: {
          id: true,
          name: true,
          unit: true,
          cost: true,
        },
      },
    },
  },
} as const;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["products:view"] });
    const { productId } = await context.params;

    const product = await db.product.findUnique({
      where: { id: productId },
      include: productInclude,
    });
    if (!product) {
      throw new HttpError(404, "product_not_found", "Product not found");
    }

    return jsonOk({ product: mapProduct(product) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["products:manage"] });
    const { productId } = await context.params;
    const payload = await readJson(request, productUpdateSchema);

    const current = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });
    if (!current) {
      throw new HttpError(404, "product_not_found", "Product not found");
    }

    if (payload.name && payload.name.trim() !== current.name) {
      const exists = await db.product.findUnique({
        where: { name: payload.name.trim() },
        select: { id: true },
      });
      if (exists) {
        throw new HttpError(409, "product_exists", "Product name already exists");
      }
    }

    if (payload.categoryId) {
      const category = await db.category.findUnique({
        where: { id: payload.categoryId },
        select: { id: true },
      });
      if (!category) {
        throw new HttpError(404, "category_not_found", "Category not found");
      }
    }

    if (payload.recipe) {
      const materialIds = Array.from(new Set(payload.recipe.map((item) => item.materialId)));
      if (materialIds.length) {
        const materials = await db.material.findMany({
          where: { id: { in: materialIds } },
          select: { id: true },
        });
        if (materials.length !== materialIds.length) {
          throw new HttpError(400, "invalid_materials", "One or more recipe materials are invalid");
        }
      }
    }

    const updated = await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: current.id },
        data: {
          name: payload.name?.trim(),
          categoryId: payload.categoryId,
          price: payload.price,
          isActive: payload.isActive,
          imageUrl: payload.imageUrl === undefined ? undefined : payload.imageUrl?.trim() || null,
        },
      });

      if (payload.recipe) {
        await tx.recipeItem.deleteMany({ where: { productId: current.id } });
        if (payload.recipe.length) {
          await tx.recipeItem.createMany({
            data: payload.recipe.map((item) => ({
              productId: current.id,
              materialId: item.materialId,
              quantity: item.quantity,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id: current.id },
        include: productInclude,
      });
    });

    return jsonOk({ product: mapProduct(updated) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["products:manage"] });
    const { productId } = await context.params;

    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      throw new HttpError(404, "product_not_found", "Product not found");
    }

    await db.product.delete({
      where: { id: product.id },
    });

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
