import { NextRequest } from "next/server";
import { OrderStatus, PurchaseStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk } from "@/server/http";
import { mapExpense } from "@/server/finance/mappers";
import {
  buildProductCostMap,
  calcOrderFinancials,
  sumOrderFinancials,
  toDateKey,
} from "@/server/analytics/orderMetrics";

function startOfDay(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfWeek(now: Date) {
  const day = now.getDay();
  const diff = (day + 6) % 7;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - diff);
  return start;
}

function shiftNameByHour(hour: number) {
  if (hour >= 8 && hour < 16) return { key: "morning", label: "صباحية" };
  return { key: "evening", label: "مسائية" };
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["finance:view"] });

    const [products, orders, expenses, purchases] = await Promise.all([
      db.product.findMany({
        select: {
          id: true,
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
      db.expense.findMany({
        orderBy: { date: "desc" },
      }),
      db.purchase.findMany({
        where: {
          status: PurchaseStatus.POSTED,
        },
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
    const totals = sumOrderFinancials(orders, productCostMap);

    const now = new Date();
    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now);

    const dayOrders = orders.filter((order) => order.createdAt >= dayStart);
    const weekOrders = orders.filter((order) => order.createdAt >= weekStart);
    const dayTotals = sumOrderFinancials(dayOrders, productCostMap);
    const weekTotals = sumOrderFinancials(weekOrders, productCostMap);

    const manualExpenses = expenses.map((expense) => ({
      ...mapExpense(expense),
      source: "manual" as const,
      sourceId: expense.id,
      readonly: false,
    }));
    const purchaseExpenses = purchases.map((purchase) => {
      const firstItem = purchase.items[0];
      return {
        id: `purchase-${purchase.id}`,
        date: purchase.date.toISOString().slice(0, 10),
        title: firstItem?.material?.name
          ? `مشتريات مخزون - ${firstItem.material.name}`
          : `مشتريات مخزون (${purchase.code})`,
        vendor: purchase.supplier?.name || "—",
        amount: Number(purchase.total),
        notes: purchase.notes,
        source: "purchase" as const,
        sourceId: purchase.id,
        readonly: true,
      };
    });
    const expenseRows = [...manualExpenses, ...purchaseExpenses].sort((a, b) => b.date.localeCompare(a.date));

    const expensesTotal =
      manualExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0) +
      purchaseExpenses.reduce((sum, purchase) => sum + Number(purchase.amount), 0);
    const profit = totals.revenue - totals.cogs - expensesTotal;

    const categoryMap = new Map(products.map((product) => [product.id, product.category]));
    const categoryStats = new Map<string, { name: string; revenue: number; cogs: number }>();

    for (const order of orders) {
      for (const item of order.items) {
        if (!item.productId) continue;
        const category = categoryMap.get(item.productId);
        if (!category) continue;

        const unitRevenue = item.totalPrice !== null && item.totalPrice !== undefined
          ? Number(item.totalPrice) / Math.max(item.quantity, 1)
          : Number(item.unitPrice);
        const unitCost = productCostMap.get(item.productId) || 0;

        const bucket = categoryStats.get(category.id) || {
          name: category.name,
          revenue: 0,
          cogs: 0,
        };

        bucket.revenue += unitRevenue * item.quantity;
        bucket.cogs += unitCost * item.quantity;
        categoryStats.set(category.id, bucket);
      }
    }

    const bestCategory = Array.from(categoryStats.values())
      .map((item) => {
        const profitValue = item.revenue - item.cogs;
        const margin = item.revenue > 0 ? (profitValue / item.revenue) * 100 : 0;
        return {
          ...item,
          profit: profitValue,
          margin,
        };
      })
      .sort((a, b) => b.margin - a.margin)[0];

    const shiftMap = new Map<string, { key: string; shift: string; sales: number; orders: number; expense: number; net: number }>();

    for (const order of dayOrders) {
      const shift = shiftNameByHour(order.createdAt.getHours());
      const totalsForOrder = calcOrderFinancials(order, productCostMap);
      const row = shiftMap.get(shift.key) || {
        key: shift.key,
        shift: shift.label,
        sales: 0,
        orders: 0,
        expense: 0,
        net: 0,
      };
      row.sales += totalsForOrder.total;
      row.orders += 1;
      row.net += totalsForOrder.profit;
      shiftMap.set(shift.key, row);
    }

    const todayDateKey = toDateKey(now);
    const dayExpenses = expenseRows
      .filter((expense) => expense.date === todayDateKey)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

    const shiftRows = Array.from(shiftMap.values()).map((row) => ({
      ...row,
      expense: row.sales > 0 ? dayExpenses * (row.sales / Math.max(dayTotals.total, 1)) : 0,
      net: row.net - (row.sales > 0 ? dayExpenses * (row.sales / Math.max(dayTotals.total, 1)) : 0),
    }));

    return jsonOk({
      kpis: {
        revenue: totals.revenue,
        expenses: expensesTotal,
        profit,
        cogs: totals.cogs,
      },
      revenueRows: [
        {
          key: "day",
          period: "اليوم",
          source: "مبيعات مباشرة",
          total: dayTotals.total,
        },
        {
          key: "week",
          period: "هذا الأسبوع",
          source: "الطلبات المكتملة",
          total: weekTotals.total,
        },
      ],
      expenses: expenseRows,
      profitInsights: {
        totalProfit: profit,
        margin: totals.revenue > 0 ? (profit / totals.revenue) * 100 : 0,
        bestCategoryName: bestCategory?.name || "—",
        bestCategoryMargin: bestCategory?.margin || 0,
        expenseRatio: totals.revenue > 0 ? (expensesTotal / totals.revenue) * 100 : 0,
      },
      shiftRows,
    });
  } catch (error) {
    return jsonError(error);
  }
}
