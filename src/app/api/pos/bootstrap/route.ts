import { NextRequest } from "next/server";
import { OrderStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { ACTIVE_ORDER_STATUSES, fromZoneStatus, mapTable } from "@/server/pos/mappers";
import { jsonError, jsonOk } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { anyPermission: ["pos:use", "orders:view", "orders:manage"] });

    const [categories, products, zones, tables] = await Promise.all([
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
        select: {
          id: true,
          name: true,
          categoryId: true,
          price: true,
          isActive: true,
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
    ]);

    return jsonOk({
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
      })),
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        categoryId: product.categoryId,
        price: Number(product.price),
        isActive: product.isActive,
        label: product.name[0] || "P",
      })),
      zones: zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        limit: Number(zone.limitKm),
        fee: Number(zone.fee),
        minOrder: Number(zone.minOrder),
        status: fromZoneStatus(zone.status),
      })),
      tables: tables.map((table) => mapTable(table)),
      orderStatuses: Object.values(OrderStatus),
    });
  } catch (error) {
    return jsonError(error);
  }
}
