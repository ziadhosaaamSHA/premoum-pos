import { ReceiptSnapshot } from "@/lib/receipt";

export type SaleItemRow = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
};

export type SaleRow = {
  id: string;
  invoiceNo: string;
  date: string;
  customer: string;
  total: number;
  status: "draft" | "paid" | "void";
  items: string[];
  itemRows: SaleItemRow[];
  notes: string | null;
  orderId: string | null;
  orderCode: string | null;
  orderReceipt: ReceiptSnapshot | null;
  createdAt: string;
  updatedAt: string;
};

export function saleStatusLabel(status: SaleRow["status"]) {
  if (status === "paid") return "مدفوع";
  if (status === "void") return "محذوف";
  return "مسودة";
}

export function saleStatusBadge(status: SaleRow["status"]) {
  if (status === "paid") return "ok";
  if (status === "void") return "danger";
  return "warn";
}
