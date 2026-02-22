import { NextRequest } from "next/server";
import { OrderStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { ACTIVE_ORDER_STATUSES, fromZoneStatus, mapTable } from "@/server/pos/mappers";
import { jsonError, jsonOk } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { anyPermission: ["pos:use", "orders:view", "orders:manage"] });

    const [categories, products, zones, tables, taxes] = await Promise.all([
      db.category.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
        },
      }),
      db.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        include: {
          recipeItems: {
            select: {
              quantity: true,
              material: {
                select: {
                  stock: true,
                },
              },
            },
          },
        },
      }),
      db.zone.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          limitKm: true,
          fee: true,
          minOrder: true,
          status: true,
        },
      }),
      db.diningTable.findMany({
        orderBy: [{ number: "asc" }, { name: "asc" }],
        include: {
          orders: {
            where: {
              status: { in: ACTIVE_ORDER_STATUSES },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              code: true,
              customerName: true,
              status: true,
            },
          },
        },
      }),
      db.taxRate.findMany({
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          rate: true,
          isDefault: true,
          isActive: true,
        },
      }),
    ]);

    return jsonOk({
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
      })),
      products: products.map((product) => {
        const recipeItems = product.recipeItems || [];
        let maxQty: number | null = null;
        if (recipeItems.length > 0) {
          let available = Infinity;
          for (const recipe of recipeItems) {
            const qty = Number(recipe.quantity || 0);
            const stock = Number(recipe.material?.stock || 0);
            if (qty <= 0) {
              available = 0;
              break;
            }
            const possible = Math.floor(stock / qty);
            available = Math.min(available, possible);
          }
          maxQty = Number.isFinite(available) ? Math.max(0, available) : 0;
        }

        return {
          id: product.id,
          name: product.name,
          categoryId: product.categoryId,
          price: Number(product.price),
          isActive: product.isActive,
          imageUrl: product.imageUrl,
          label: product.name[0] || "P",
          maxQty,
        };
      }),
      zones: zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        limit: Number(zone.limitKm),
        fee: Number(zone.fee),
        minOrder: Number(zone.minOrder),
        status: fromZoneStatus(zone.status),
      })),
      tables: tables.map((table) => mapTable(table)),
      taxes: taxes.map((tax) => ({
        id: tax.id,
        name: tax.name,
        rate: Number(tax.rate),
        isDefault: tax.isDefault,
        isActive: tax.isActive,
      })),
      orderStatuses: Object.values(OrderStatus),
    });
  } catch (error) {
    return jsonError(error);
  }
}
