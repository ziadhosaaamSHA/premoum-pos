import { NextRequest } from "next/server";
import { OrderStatus, SaleStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk } from "@/server/http";
import {
  buildProductCostMap,
  calcOrderFinancials,
  sumOrderFinancials,
} from "@/server/analytics/orderMetrics";

function startOfDay(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["dashboard:view"] });

    const [products, orders, sales, materials, latestWaste, expensesAgg] = await Promise.all([
      db.product.findMany({
        select: {
          id: true,
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
      db.sale.findMany({
        where: { status: SaleStatus.PAID },
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          total: true,
        },
      }),
      db.material.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          stock: true,
          minStock: true,
        },
      }),
      db.waste.findFirst({
        orderBy: { date: "desc" },
        include: {
          material: {
            select: {
              name: true,
            },
          },
        },
      }),
      db.expense.aggregate({
        _sum: {
          amount: true,
        },
      }),
    ]);

    const productCostMap = buildProductCostMap(products);
    const completedOrders = orders.filter((order) => order.status === OrderStatus.DELIVERED);

    const totals = sumOrderFinancials(completedOrders, productCostMap);

    const now = new Date();
    const dayStart = startOfDay(now);
    const monthStart = startOfMonth(now);

    const daySales = sales.filter((sale) => sale.date >= dayStart);
    const monthSales = sales.filter((sale) => sale.date >= monthStart);
    const daySalesTotal = daySales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const monthSalesTotal = monthSales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const revenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0);

    const expenses = Number(expensesAgg._sum.amount || 0);
    const profit = revenue - totals.cogs - expenses;

    const lowStockAlerts = materials
      .filter((material) => Number(material.stock) <= Number(material.minStock))
      .slice(0, 6)
      .map((material) => ({
        id: `material-${material.id}`,
        type: "low_stock",
        title: "مخزون منخفض",
        message: `المادة ${material.name} أقل من الحد الأدنى.`,
      }));

    const wasteAlert = latestWaste
      ? [
          {
            id: `waste-${latestWaste.id}`,
            type: "warning",
            title: "هدر مسجل",
            message: `تم تسجيل هدر ${latestWaste.material.name} بقيمة ${Number(latestWaste.cost).toFixed(2)}.`,
          },
        ]
      : [];

    const liveOrders = orders
      .filter((order) => order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED)
      .map((order) => {
        const financials = calcOrderFinancials(order, productCostMap);
        return {
          id: order.id,
          code: order.code,
          type: order.type,
          status: order.status,
          customer: order.customerName,
          total: financials.total,
          createdAt: order.createdAt.toISOString(),
        };
      });

    const topProductQty = new Map<string, number>();
    for (const order of completedOrders) {
      for (const item of order.items) {
        if (!item.productId) continue;
        topProductQty.set(item.productId, (topProductQty.get(item.productId) || 0) + item.quantity);
      }
    }

    const topProducts = await db.product.findMany({
      where: {
        id: {
          in: Array.from(topProductQty.keys()),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const topProductRows = topProducts
      .map((product) => ({
        id: product.id,
        name: product.name,
        qty: topProductQty.get(product.id) || 0,
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);

    return jsonOk({
      kpis: {
        todaySales: daySalesTotal,
        monthSales: monthSalesTotal,
        revenue,
        expenses,
        cogs: totals.cogs,
        profit,
      },
      alerts: [...lowStockAlerts, ...wasteAlert],
      liveOrders,
      shiftSummary: {
        ordersCount: orders.filter((order) => order.createdAt >= dayStart).length,
        averageTicket: revenue / Math.max(sales.length, 1),
        deliveryOrders: orders.filter((order) => order.type === "DELIVERY").length,
        wasteRate: revenue > 0 ? (Number(latestWaste?.cost || 0) / revenue) * 100 : 0,
      },
      topProducts: topProductRows,
    });
  } catch (error) {
    return jsonError(error);
  }
}
