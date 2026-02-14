import { OrderStatus, OrderType, PaymentMethod, Prisma, ZoneStatus } from "@prisma/client";

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT,
];

const orderTypeToUi: Record<OrderType, "dine_in" | "takeaway" | "delivery"> = {
  [OrderType.DINE_IN]: "dine_in",
  [OrderType.TAKEAWAY]: "takeaway",
  [OrderType.DELIVERY]: "delivery",
};

const orderTypeFromUi: Record<"dine_in" | "takeaway" | "delivery", OrderType> = {
  dine_in: OrderType.DINE_IN,
  takeaway: OrderType.TAKEAWAY,
  delivery: OrderType.DELIVERY,
};

const orderStatusToUi: Record<OrderStatus, "preparing" | "ready" | "out" | "delivered" | "cancelled"> = {
  [OrderStatus.PREPARING]: "preparing",
  [OrderStatus.READY]: "ready",
  [OrderStatus.OUT]: "out",
  [OrderStatus.DELIVERED]: "delivered",
  [OrderStatus.CANCELLED]: "cancelled",
};

const orderStatusFromUi: Record<"preparing" | "ready" | "out" | "delivered" | "cancelled", OrderStatus> = {
  preparing: OrderStatus.PREPARING,
  ready: OrderStatus.READY,
  out: OrderStatus.OUT,
  delivered: OrderStatus.DELIVERED,
  cancelled: OrderStatus.CANCELLED,
};

const paymentToUi: Record<PaymentMethod, "cash" | "card" | "wallet" | "mixed"> = {
  [PaymentMethod.CASH]: "cash",
  [PaymentMethod.CARD]: "card",
  [PaymentMethod.WALLET]: "wallet",
  [PaymentMethod.MIXED]: "mixed",
};

const paymentFromUi: Record<"cash" | "card" | "wallet" | "mixed", PaymentMethod> = {
  cash: PaymentMethod.CASH,
  card: PaymentMethod.CARD,
  wallet: PaymentMethod.WALLET,
  mixed: PaymentMethod.MIXED,
};

const zoneStatusToUi: Record<ZoneStatus, "active" | "inactive"> = {
  [ZoneStatus.ACTIVE]: "active",
  [ZoneStatus.INACTIVE]: "inactive",
};

export function toOrderType(value: "dine_in" | "takeaway" | "delivery") {
  return orderTypeFromUi[value];
}

export function fromOrderType(value: OrderType) {
  return orderTypeToUi[value];
}

export function toOrderStatus(value: "preparing" | "ready" | "out" | "delivered" | "cancelled") {
  return orderStatusFromUi[value];
}

export function fromOrderStatus(value: OrderStatus) {
  return orderStatusToUi[value];
}

export function toPaymentMethod(value: "cash" | "card" | "wallet" | "mixed") {
  return paymentFromUi[value];
}

export function fromPaymentMethod(value: PaymentMethod) {
  return paymentToUi[value];
}

export function fromZoneStatus(value: ZoneStatus) {
  return zoneStatusToUi[value];
}

export function generateCode(prefix: string) {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${y}${m}${d}-${rand}`;
}

type OrderItemRow = {
  id: string;
  productId: string | null;
  quantity: number;
  unitPrice: unknown;
  totalPrice: unknown;
  product: { name: string } | null;
};

type OrderRow = {
  id: string;
  code: string;
  type: OrderType;
  status: OrderStatus;
  customerName: string;
  zoneId: string | null;
  driverId: string | null;
  tableId: string | null;
  discount: unknown;
  taxRate: unknown;
  taxAmount: unknown;
  payment: PaymentMethod;
  notes: string | null;
  receiptSnapshot: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemRow[];
  zone: { id: string; name: string; fee: unknown } | null;
  table: { id: string; name: string; number: number } | null;
};

export function mapOrder(row: OrderRow) {
  const items = row.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.product?.name || "منتج",
    qty: item.quantity,
    unitPrice: Number(item.unitPrice),
    totalPrice: Number(item.totalPrice),
  }));

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFee = row.type === OrderType.DELIVERY ? Number(row.zone?.fee || 0) : 0;
  const discount = Number(row.discount || 0);
  const taxRate = Number(row.taxRate || 0);
  const base = Math.max(0, subtotal - discount);
  const storedTaxAmount = Number(row.taxAmount || 0);
  const taxAmount = storedTaxAmount > 0 ? storedTaxAmount : base * (taxRate / 100);
  const total = base + deliveryFee + taxAmount;

  return {
    id: row.id,
    code: row.code,
    type: fromOrderType(row.type),
    status: fromOrderStatus(row.status),
    customer: row.customerName,
    zoneId: row.zoneId,
    zoneName: row.zone?.name || null,
    driverId: row.driverId,
    tableId: row.tableId,
    tableName: row.table?.name || null,
    tableNumber: row.table?.number ?? null,
    discount,
    taxRate,
    taxAmount,
    payment: fromPaymentMethod(row.payment),
    notes: row.notes,
    receiptSnapshot: row.receiptSnapshot ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items,
    subtotal,
    deliveryFee,
    total,
  };
}

type TableRow = {
  id: string;
  name: string;
  number: number;
  isOccupied: boolean;
  orders: Array<{
    id: string;
    code: string;
    customerName: string;
    status: OrderStatus;
  }>;
};

export function mapTable(row: TableRow) {
  const activeOrder = row.orders[0] || null;
  return {
    id: row.id,
    name: row.name,
    number: row.number,
    status: activeOrder || row.isOccupied ? "occupied" : "empty",
    orderId: activeOrder?.id || null,
    activeOrder: activeOrder
      ? {
          id: activeOrder.id,
          code: activeOrder.code,
          customer: activeOrder.customerName,
          status: fromOrderStatus(activeOrder.status),
        }
      : null,
  };
}
