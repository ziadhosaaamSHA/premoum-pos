export type DeliveryTab = "zones" | "drivers" | "tracking";

export type ZoneRow = {
  id: string;
  name: string;
  limit: number;
  fee: number;
  minOrder: number;
  status: "active" | "inactive";
};

export type DriverRow = {
  id: string;
  name: string;
  phone: string;
  status: string;
  activeOrders: number;
};

export type DeliveryOrderRow = {
  id: string;
  code: string;
  customer: string;
  status: "preparing" | "ready" | "out" | "delivered" | "cancelled";
  type: "delivery" | "other";
  zoneId: string | null;
  zoneName: string | null;
  driverId: string | null;
  driverName: string | null;
  createdAt: string;
};

export type ZoneModalState = { mode: "view" | "edit" | "create"; id?: string } | null;
export type DriverModalState = { mode: "view" | "edit" | "create"; id?: string } | null;
