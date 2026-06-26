import { Prisma, SaleStatus } from "@prisma/client";
import { generateCode } from "@/server/pos/mappers";

const saleStatusToUi: Record<SaleStatus, "draft" | "paid" | "void"> = {
  [SaleStatus.DRAFT]: "draft",
  [SaleStatus.PAID]: "paid",
  [SaleStatus.VOID]: "void",
};

const saleStatusFromUi: Record<"draft" | "paid", SaleStatus> = {
  draft: SaleStatus.DRAFT,
  paid: SaleStatus.PAID,
};

export function toSaleStatus(value: "draft" | "paid") {
  return saleStatusFromUi[value];
}

export function fromSaleStatus(value: SaleStatus) {
  return saleStatusToUi[value];
}

type SaleRow = {
  id: string;
  invoiceNo: string;
  date: Date;
  customerName: string;
  customerPhone: string | null;
  total: unknown;
  status: SaleStatus;
  notes: string | null;
  orderId: string | null;
  order: {
    id: string;
    code: string;
    receiptSnapshot: Prisma.JsonValue | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: unknown;
    totalPrice: unknown;
    isGift: boolean;
  }>;
  paymentPlan?: {
    id: string;
    status: string;
    downPayment: unknown;
    remainingAmount: unknown;
    installmentCount: number;
    installmentAmount: unknown;
    firstDueDate: Date | null;
  } | null;
};

export function mapSale(row: SaleRow) {
  return {
    id: row.id,
    invoiceNo: row.invoiceNo,
    date: row.date.toISOString().slice(0, 10),
    customer: row.customerName,
    customerPhone: row.customerPhone,
    total: Number(row.total),
    status: fromSaleStatus(row.status),
    items: row.items.map((item) => item.name),
    itemRows: row.items.map((item) => ({
      id: item.id,
      name: item.name,
      qty: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      isGift: item.isGift,
    })),
    paymentPlan: row.paymentPlan
      ? {
          id: row.paymentPlan.id,
          status: row.paymentPlan.status,
          downPayment: Number(row.paymentPlan.downPayment),
          remainingAmount: Number(row.paymentPlan.remainingAmount),
          installmentCount: row.paymentPlan.installmentCount,
          installmentAmount: Number(row.paymentPlan.installmentAmount),
          firstDueDate: row.paymentPlan.firstDueDate?.toISOString().slice(0, 10) || null,
        }
      : null,
    notes: row.notes,
    orderId: row.orderId,
    orderCode: row.order?.code || null,
    orderReceipt: row.order?.receiptSnapshot ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function buildInvoiceNo() {
  return generateCode("INV");
}

export function parseUiDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}
