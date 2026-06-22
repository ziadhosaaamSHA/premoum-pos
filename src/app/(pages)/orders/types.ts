import { ReceiptSnapshot } from "@/lib/receipt";

export type OrdersTab = "tables" | "current" | "history" | "tracking";

export type OrderStatusUi = "preparing" | "ready" | "out" | "delivered" | "cancelled";

export type OrderRow = {
  id: string;
  code: string;
  type: "dine_in" | "takeaway" | "delivery";
  status: OrderStatusUi;
  customer: string;
  zoneId: string | null;
  zoneName: string | null;
  driverId: string | null;
  tableId: string | null;
  tableName: string | null;
  tableNumber: number | null;
  discount: number;
  taxRate: number;
  taxAmount: number;
  payment: "cash" | "card" | "wallet" | "mixed";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  receiptSnapshot: ReceiptSnapshot | null;
  items: Array<{
    id: string;
    productId: string | null;
    name: string;
    qty: number;
    unitPrice: number;
    totalPrice: number;
  }>;
};

export type TableRow = {
  id: string;
  name: string;
  number: number;
  status: "empty" | "occupied";
  orderId: string | null;
  activeOrder: {
    id: string;
    code: string;
    customer: string;
    status: OrderStatusUi;
  } | null;
};

export type TableForm = {
  id: string;
  name: string;
  number: number;
  status: "empty" | "occupied";
  orderId: string;
};

export const statusOptions = [
  { value: "", label: "كل الحالات" },
  { value: "preparing", label: "قيد التحضير" },
  { value: "ready", label: "جاهز" },
  { value: "out", label: "خارج للتوصيل" },
  { value: "delivered", label: "تم التسليم" },
  { value: "cancelled", label: "ملغي" },
];

export const statusUpdateOptions: Array<{ value: OrderStatusUi; label: string }> = [
  { value: "preparing", label: "قيد التحضير" },
  { value: "ready", label: "جاهز" },
  { value: "out", label: "خارج للتوصيل" },
  { value: "delivered", label: "تم التسليم" },
  { value: "cancelled", label: "ملغي" },
];

export function statusBadge(status: OrderStatusUi) {
  if (status === "delivered") return "ok";
  if (status === "cancelled") return "danger";
  if (status === "ready") return "neutral";
  return "warn";
}
