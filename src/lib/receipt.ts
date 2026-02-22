import { money, translateStatus } from "@/lib/format";

export type ReceiptItem = {
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
};

export type ReceiptSnapshot = {
  version: 1;
  brandName: string;
  brandTagline: string;
  logoUrl: string | null;
  code: string;
  createdAt: string;
  customerName: string;
  orderType: "dine_in" | "takeaway" | "delivery";
  payment: "cash" | "card" | "wallet" | "mixed";
  tableName: string | null;
  tableNumber: number | null;
  zoneName: string | null;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  deliveryFee: number;
  total: number;
  notes: string | null;
};

export const RECEIPT_BRAND = {
  name: "Premium POS",
  tagline: "مطعم ومقهى",
  footer: "شكراً لزيارتكم - نراكم قريباً",
};

export type ReceiptSource = {
  code: string;
  createdAt: string | Date;
  customerName: string;
  orderType: ReceiptSnapshot["orderType"];
  payment: ReceiptSnapshot["payment"];
  tableName?: string | null;
  tableNumber?: number | null;
  zoneName?: string | null;
  items: ReceiptItem[];
  discount?: number;
  taxRate?: number;
  taxAmount?: number;
  deliveryFee?: number;
  total?: number;
  notes?: string | null;
  brandName?: string;
  brandTagline?: string;
  logoUrl?: string | null;
};

export function buildReceiptSnapshot(source: ReceiptSource): ReceiptSnapshot {
  const createdAt = typeof source.createdAt === "string" ? source.createdAt : source.createdAt.toISOString();
  const items = source.items.map((item) => ({
    name: item.name,
    qty: Number(item.qty || 0),
    unitPrice: Number(item.unitPrice || 0),
    totalPrice: Number(item.totalPrice || 0),
  }));
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const discount = Number(source.discount || 0);
  const deliveryFee = Number(source.deliveryFee || 0);
  const taxRate = Number(source.taxRate || 0);
  const base = Math.max(0, subtotal - discount);
  const taxAmount =
    source.taxAmount !== undefined ? Number(source.taxAmount) : base * (taxRate / 100);
  const total =
    source.total !== undefined ? Number(source.total) : base + deliveryFee + taxAmount;

  return {
    version: 1,
    brandName: source.brandName || RECEIPT_BRAND.name,
    brandTagline: source.brandTagline || RECEIPT_BRAND.tagline,
    logoUrl: source.logoUrl ?? null,
    code: source.code,
    createdAt,
    customerName: source.customerName,
    orderType: source.orderType,
    payment: source.payment,
    tableName: source.tableName ?? null,
    tableNumber: source.tableNumber ?? null,
    zoneName: source.zoneName ?? null,
    items,
    subtotal,
    discount,
    taxRate,
    taxAmount,
    deliveryFee,
    total,
    notes: source.notes ?? null,
  };
}

const paymentLabels: Record<ReceiptSnapshot["payment"], string> = {
  cash: "نقدي",
  card: "بطاقة",
  wallet: "محفظة",
  mixed: "مختلط",
};

export function paymentLabel(value: ReceiptSnapshot["payment"]) {
  return paymentLabels[value] || value;
}

export function formatReceiptDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function escapeAttr(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function buildReceiptPrintHtml(receipt: ReceiptSnapshot) {
  const taxRate = receipt.taxRate || 0;
  const taxAmount = receipt.taxAmount || 0;
  const infoLines = [
    { label: "العميل", value: receipt.customerName },
    { label: "نوع الطلب", value: translateStatus(receipt.orderType) },
    { label: "طريقة الدفع", value: paymentLabel(receipt.payment) },
    receipt.tableName
      ? {
          label: "الطاولة",
          value: receipt.tableNumber ? `${receipt.tableName} (${receipt.tableNumber})` : receipt.tableName,
        }
      : null,
    receipt.zoneName ? { label: "منطقة التوصيل", value: receipt.zoneName } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const itemRows = receipt.items
    .map(
      (item) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.qty}</td>
          <td>${money(item.unitPrice)}</td>
          <td>${money(item.totalPrice)}</td>
        </tr>
      `
    )
    .join("");

  const totalsRows = `
      <div class="total-line">
        <span>الإجمالي الفرعي</span>
        <strong>${money(receipt.subtotal)}</strong>
      </div>
      ${receipt.discount > 0 ? `
        <div class="total-line">
          <span>خصم</span>
          <strong>${money(receipt.discount)}</strong>
        </div>
      ` : ""}
      ${taxAmount > 0 ? `
        <div class="total-line">
          <span>ضريبة (${taxRate.toFixed(2)}%)</span>
          <strong>${money(taxAmount)}</strong>
        </div>
      ` : ""}
      ${receipt.deliveryFee > 0 ? `
        <div class="total-line">
          <span>رسوم التوصيل</span>
          <strong>${money(receipt.deliveryFee)}</strong>
        </div>
      ` : ""}
      <div class="total-line grand">
        <span>الإجمالي</span>
        <strong>${money(receipt.total)}</strong>
      </div>
  `;

  const notesBlock = receipt.notes
    ? `<div class="notes">ملاحظات: ${receipt.notes}</div>`
    : "";

  const logoHtml = receipt.logoUrl
    ? `<img class="logo-image" src="${escapeAttr(receipt.logoUrl)}" alt="${escapeAttr(receipt.brandName)}" />`
    : `<span class="logo-fallback">PP</span>`;

  return `
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>إيصال ${receipt.code}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: "Cairo", "Readex Pro", Arial, sans-serif;
        background: #f4f3ef;
        color: #1b1b1b;
        padding: 24px;
      }
      .receipt {
        width: 360px;
        margin: 0 auto;
        background: #fff;
        border: 1px dashed #e6e1db;
        border-radius: 16px;
        padding: 16px;
      }
      .receipt-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .logo {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: #e06d4c;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        overflow: hidden;
      }
      .logo-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .logo-fallback {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .brand-text strong {
        display: block;
        font-size: 15px;
      }
      .brand-text span {
        font-size: 11px;
        color: #6b6b6b;
      }
      .meta {
        text-align: left;
        font-size: 11px;
        color: #6b6b6b;
      }
      .meta div {
        margin-bottom: 4px;
      }
      .info {
        display: grid;
        gap: 6px;
        margin-bottom: 12px;
        font-size: 12px;
      }
      .info-line {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .divider {
        border-top: 1px dashed #e6e1db;
        margin: 10px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      th, td {
        border-bottom: 1px dashed #e6e1db;
        padding: 6px 0;
        text-align: right;
      }
      th {
        font-weight: 600;
        color: #6b6b6b;
      }
      .totals {
        margin-top: 10px;
        border-top: 1px dashed #e6e1db;
        padding-top: 10px;
        font-size: 12px;
      }
      .total-line {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .total-line.grand {
        font-weight: 700;
        font-size: 14px;
      }
      .notes {
        margin-top: 10px;
        font-size: 11px;
        color: #6b6b6b;
      }
      .footer {
        margin-top: 12px;
        text-align: center;
        font-size: 11px;
        color: #6b6b6b;
      }
      @media print {
        body { background: #fff; padding: 0; }
        .receipt { width: 100%; border: none; }
      }
    </style>
  </head>
  <body>
    <div class="receipt">
      <div class="receipt-header">
        <div class="brand">
          <div class="logo">${logoHtml}</div>
          <div class="brand-text">
            <strong>${receipt.brandName}</strong>
            <span>${receipt.brandTagline}</span>
          </div>
        </div>
        <div class="meta">
          <div>رقم الطلب: ${receipt.code}</div>
          <div>${formatReceiptDate(receipt.createdAt)}</div>
        </div>
      </div>
      <div class="info">
        ${infoLines
          .map((line) => `<div class="info-line"><span>${line.label}</span><strong>${line.value}</strong></div>`)
          .join("")}
      </div>
      <div class="divider"></div>
      <table>
        <thead>
          <tr>
            <th>الصنف</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
      <div class="totals">
        ${totalsRows}
      </div>
      ${notesBlock}
      <div class="footer">${RECEIPT_BRAND.footer}</div>
    </div>
  </body>
</html>
  `;
}
