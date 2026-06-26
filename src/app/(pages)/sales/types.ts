import { ReceiptSnapshot } from "@/lib/receipt";

export type SaleItemRow = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  isGift: boolean;
};

export type SaleRow = {
  id: string;
  invoiceNo: string;
  date: string;
  customer: string;
  customerPhone: string | null;
  total: number;
  status: "draft" | "paid" | "void";
  items: string[];
  itemRows: SaleItemRow[];
  notes: string | null;
  orderId: string | null;
  orderCode: string | null;
  orderReceipt: ReceiptSnapshot | null;
  paymentPlan: {
    id: string;
    status: string;
    downPayment: number;
    remainingAmount: number;
    installmentCount: number;
    installmentAmount: number;
    firstDueDate: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type RetailReturnExchangeRow = {
  id: string;
  code: string;
  invoiceNo: string;
  customer: string;
  customerPhone: string | null;
  type: "return" | "exchange";
  status: string;
  reason: string | null;
  refundAmount: number;
  exchangeAmount: number;
  notes: string | null;
  createdAt: string;
};

export type RetailPaymentPlanRow = {
  id: string;
  invoiceNo: string;
  customer: string;
  customerPhone: string | null;
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  installmentCount: number;
  installmentAmount: number;
  firstDueDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
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
