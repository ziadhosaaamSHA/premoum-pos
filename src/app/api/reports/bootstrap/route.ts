import { NextRequest } from "next/server";
import { OrderStatus, PurchaseStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk } from "@/server/http";
import { mapPurchase, mapWaste } from "@/server/inventory/mappers";
import {
  buildProductCostMap,
  calcOrderFinancials,
  formatMonthKey,
  toDateKey,
  toMonthKey,
} from "@/server/analytics/orderMetrics";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function shiftNameByHour(hour: number) {
  if (hour >= 8 && hour < 16) return "صباحية";
  return "مسائية";
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["reports:view"] });

    const [products, orders, materials, waste, purchases] = await Promise.all([
      db.product.findMany({
        select: {
          id: true,
          name: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          recipeItems: {
            select: {
              quantity: true,
              material: {
                select: {
                  cost: true,
                },
              },
            },
          },
        },
      }),
      db.order.findMany({
        where: {
          status: {
            not: OrderStatus.CANCELLED,
          },
        },
        orderBy: { createdAt: "desc" },
        include: {
          zone: {
            select: {
              fee: true,
            },
          },
          items: {
            select: {
              productId: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
        },
      }),
      db.material.findMany({
        select: {
          stock: true,
          cost: true,
        },
      }),
      db.waste.findMany({
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          quantity: true,
          reason: true,
          cost: true,
          material: {
            select: {
              id: true,
              name: true,
              unit: true,
            },
          },
        },
      }),
      db.purchase.findMany({
        orderBy: { date: "desc" },
        include: {
          supplier: {
            select: { id: true, name: true },
          },
          items: {
            orderBy: { id: "asc" },
            include: {
              material: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
    ]);

    const productCostMap = buildProductCostMap(products);
    const productCategoryMap = new Map(products.map((product) => [product.id, product.category]));

    const now = new Date();
    const todayKey = toDateKey(now);
    const yesterdayKey = toDateKey(new Date(startOfDay(now).getTime() - 24 * 60 * 60 * 1000));

    const dailyBucket = new Map<string, { count: number; total: number }>();
    const monthlyBucket = new Map<string, number>();
    const categoryBucket = new Map<string, { id: string; name: string; revenue: number; cogs: number; profit: number }>();
    const shiftBucket = new Map<string, { date: string; shift: string; sales: number; profit: number }>();

    for (const order of orders) {
      const financials = calcOrderFinancials(order, productCostMap);
      const dateKey = toDateKey(order.createdAt);
      const monthKey = toMonthKey(order.createdAt);

      const daily = dailyBucket.get(dateKey) || { count: 0, total: 0 };
      daily.count += 1;
      daily.total += financials.total;
      dailyBucket.set(dateKey, daily);

      monthlyBucket.set(monthKey, (monthlyBucket.get(monthKey) || 0) + financials.total);

      const shift = shiftNameByHour(order.createdAt.getHours());
      const shiftKey = `${dateKey}-${shift}`;
      const shiftRow = shiftBucket.get(shiftKey) || { date: dateKey, shift, sales: 0, profit: 0 };
      shiftRow.sales += financials.total;
      shiftRow.profit += financials.profit;
      shiftBucket.set(shiftKey, shiftRow);

      for (const item of order.items) {
        if (!item.productId) continue;
        const category = productCategoryMap.get(item.productId);
        if (!category) continue;

        const unitRevenue = item.totalPrice !== null && item.totalPrice !== undefined
          ? Number(item.totalPrice) / Math.max(item.quantity, 1)
          : Number(item.unitPrice);
        const unitCost = productCostMap.get(item.productId) || 0;

        const bucket = categoryBucket.get(category.id) || {
          id: category.id,
          name: category.name,
          revenue: 0,
          cogs: 0,
          profit: 0,
        };
        bucket.revenue += unitRevenue * item.quantity;
        bucket.cogs += unitCost * item.quantity;
        bucket.profit = bucket.revenue - bucket.cogs;
        categoryBucket.set(category.id, bucket);
      }
    }

    const dailyRows = [
      { day: "اليوم", key: todayKey },
      { day: "أمس", key: yesterdayKey },
    ].map(({ day, key }) => {
      const bucket = dailyBucket.get(key) || { count: 0, total: 0 };
      return {
        day,
        count: bucket.count,
        total: bucket.total,
      };
    });

    const monthlyRows = Array.from(monthlyBucket.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6)
      .reverse()
      .map(([month, total], index, rows) => {
        const prev = rows[index - 1]?.[1] || 0;
        const growth = prev > 0 ? ((total - prev) / prev) * 100 : 0;
        return {
          month: formatMonthKey(month),
          total,
          growth,
        };
      });

    const profitRows = Array.from(categoryBucket.values())
      .map((row) => ({
        ...row,
        margin: row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);

    const shiftRows = Array.from(shiftBucket.values())
      .sort((a, b) => b.date.localeCompare(a.date) || a.shift.localeCompare(b.shift))
      .slice(0, 8);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSales = orders
      .filter((order) => order.createdAt >= monthStart)
      .reduce((sum, order) => sum + calcOrderFinancials(order, productCostMap).total, 0);

    const inventoryValue = materials.reduce(
      (sum, material) => sum + Number(material.stock) * Number(material.cost),
      0
    );

    const wasteCost = waste.reduce((sum, item) => sum + Number(item.cost), 0);
    const purchaseRows = purchases.map((purchase) => mapPurchase(purchase));
    const purchasesTotal = purchases
      .filter((purchase) => purchase.status === PurchaseStatus.POSTED)
      .reduce((sum, purchase) => sum + Number(purchase.total), 0);
    const wasteRows = waste.map((item) => mapWaste(item));

    return jsonOk({
      insights: {
        todaySales: dailyRows[0]?.total || 0,
        monthSales,
        wasteCost,
        purchasesTotal,
        inventoryValue,
      },
      dailyRows,
      monthlyRows,
      profitRows,
      shiftRows,
      purchases: purchaseRows,
      wasteRows,
    });
  } catch (error) {
    return jsonError(error);
  }
}
