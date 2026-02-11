import { OrderType } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { ACTIVE_ORDER_STATUSES } from "@/server/pos/mappers";
import { mapDeliveryOrder, mapDriver, mapZone } from "@/server/delivery/mappers";
import { jsonError, jsonOk } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["delivery:view"] });

    const [zones, drivers, deliveryOrders] = await Promise.all([
      db.zone.findMany({
        orderBy: { name: "asc" },
      }),
      db.driver.findMany({
        orderBy: { name: "asc" },
      }),
      db.order.findMany({
        where: { type: OrderType.DELIVERY },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          code: true,
          customerName: true,
          status: true,
          type: true,
          createdAt: true,
          zone: {
            select: { id: true, name: true },
          },
          driver: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    const activeOrderCountByDriver = deliveryOrders
      .filter((order) => order.driver && ACTIVE_ORDER_STATUSES.includes(order.status))
      .reduce<Record<string, number>>((acc, order) => {
        const key = order.driver?.id;
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

    return jsonOk({
      zones: zones.map((zone) => mapZone(zone)),
      drivers: drivers.map((driver) =>
        mapDriver({
          ...driver,
          _count: { orders: activeOrderCountByDriver[driver.id] || 0 },
        })
      ),
      orders: deliveryOrders.map((order) => mapDeliveryOrder(order)),
    });
  } catch (error) {
    return jsonError(error);
  }
}
