import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapCategory } from "@/server/products/mappers";
import { categoryCreateSchema } from "@/server/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["products:view"] });
    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();

    const categories = await db.category.findMany({
      orderBy: { name: "asc" },
      include: {
        products: {
          select: { id: true },
        },
      },
    });

    const filtered = categories.filter((item) => {
      if (!search) return true;
      return (
        item.name.toLowerCase().includes(search) ||
        (item.description || "").toLowerCase().includes(search)
      );
    });

    return jsonOk({ categories: filtered.map((item) => mapCategory(item)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["products:manage"] });
    const payload = await readJson(request, categoryCreateSchema);

    const name = payload.name.trim();
    const exists = await db.category.findUnique({
      where: { name },
      select: { id: true },
    });
    if (exists) {
      throw new HttpError(409, "category_exists", "Category name already exists");
    }

    const category = await db.category.create({
      data: {
        name,
        description: payload.description || null,
      },
      include: {
        products: {
          select: { id: true },
        },
      },
    });

    return jsonOk({ category: mapCategory(category) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
