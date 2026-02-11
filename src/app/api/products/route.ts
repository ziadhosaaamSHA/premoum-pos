import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapProduct } from "@/server/products/mappers";
import { productCreateSchema } from "@/server/validation/schemas";

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

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["products:view"] });

    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();
    const categoryId = request.nextUrl.searchParams.get("categoryId")?.trim();

    const rows = await db.product.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: { createdAt: "asc" },
      include: productInclude,
    });

    const filtered = rows.filter((row) => {
      if (!search) return true;
      return (
        row.name.toLowerCase().includes(search) ||
        row.category.name.toLowerCase().includes(search)
      );
    });

    return jsonOk({ products: filtered.map((row) => mapProduct(row)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["products:manage"] });
    const payload = await readJson(request, productCreateSchema);

    const name = payload.name.trim();
    const category = await db.category.findUnique({
      where: { id: payload.categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new HttpError(404, "category_not_found", "Category not found");
    }

    const existing = await db.product.findUnique({
      where: { name },
      select: { id: true },
    });
    if (existing) {
      throw new HttpError(409, "product_exists", "Product name already exists");
    }

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

    const created = await db.product.create({
      data: {
        name,
        categoryId: category.id,
        price: payload.price,
        isActive: payload.isActive,
        recipeItems: payload.recipe.length
          ? {
              createMany: {
                data: payload.recipe.map((item) => ({
                  materialId: item.materialId,
                  quantity: item.quantity,
                })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
      include: productInclude,
    });

    return jsonOk({ product: mapProduct(created) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
