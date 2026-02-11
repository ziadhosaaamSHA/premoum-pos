import { OrderStatus, OrderType, ZoneStatus } from "@prisma/client";
import { fromOrderStatus } from "@/server/pos/mappers";

const zoneStatusToUi: Record<ZoneStatus, "active" | "inactive"> = {
  [ZoneStatus.ACTIVE]: "active",
  [ZoneStatus.INACTIVE]: "inactive",
};

export function toZoneStatus(value: "active" | "inactive") {
  return value === "active" ? ZoneStatus.ACTIVE : ZoneStatus.INACTIVE;
}

export function fromZoneStatus(value: ZoneStatus) {
  return zoneStatusToUi[value];
}

type ZoneRow = {
  id: string;
  name: string;
  limitKm: unknown;
  fee: unknown;
  minOrder: unknown;
  status: ZoneStatus;
};

export function mapZone(row: ZoneRow) {
  return {
    id: row.id,
    name: row.name,
    limit: Number(row.limitKm),
    fee: Number(row.fee),
    minOrder: Number(row.minOrder),
    status: fromZoneStatus(row.status),
  };
}

type DriverRow = {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  activeOrders: number;
  _count?: {
    orders: number;
  };
};

export function mapDriver(row: DriverRow) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || "",
    status: row.status,
    activeOrders: row._count?.orders ?? row.activeOrders,
  };
}

type DeliveryOrderRow = {
  id: string;
  code: string;
  customerName: string;
  status: OrderStatus;
  type: OrderType;
  zone: { id: string; name: string } | null;
  driver: { id: string; name: string } | null;
  createdAt: Date;
};

export function mapDeliveryOrder(row: DeliveryOrderRow) {
  return {
    id: row.id,
    code: row.code,
    customer: row.customerName,
    status: fromOrderStatus(row.status),
    type: row.type === OrderType.DELIVERY ? "delivery" : "other",
    zoneId: row.zone?.id || null,
    zoneName: row.zone?.name || null,
    driverId: row.driver?.id || null,
    driverName: row.driver?.name || null,
    createdAt: row.createdAt.toISOString(),
  };
}
