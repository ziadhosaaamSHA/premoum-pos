import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk } from "@/server/http";
import {
  mapCategory,
  mapMaterialReference,
  mapProduct,
} from "@/server/products/mappers";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["products:view"] });

    const [categories, materials, products] = await Promise.all([
      db.category.findMany({
        orderBy: { name: "asc" },
        include: {
          products: {
            select: { id: true },
          },
        },
      }),
      db.material.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          unit: true,
          cost: true,
        },
      }),
      db.product.findMany({
        orderBy: { createdAt: "asc" },
        include: {
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
        },
      }),
    ]);

    return jsonOk({
      categories: categories.map((item) => mapCategory(item)),
      materials: materials.map((item) => mapMaterialReference(item)),
      products: products.map((item) => mapProduct(item)),
    });
  } catch (error) {
    return jsonError(error);
  }
}
