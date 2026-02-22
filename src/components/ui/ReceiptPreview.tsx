"use client";

import { money, translateStatus } from "@/lib/format";
import { paymentLabel, ReceiptSnapshot, RECEIPT_BRAND, formatReceiptDate } from "@/lib/receipt";

type ReceiptPreviewProps = {
  receipt: ReceiptSnapshot;
};

export default function ReceiptPreview({ receipt }: ReceiptPreviewProps) {
  const taxRate = receipt.taxRate || 0;
  const taxAmount = receipt.taxAmount || 0;

  return (
    <div className="receipt-preview">
      <div className="receipt-header">
        <div className="receipt-brand">
          <div className="receipt-logo">
            {receipt.logoUrl ? (
              <img src={receipt.logoUrl} alt={receipt.brandName} className="receipt-logo-image" />
            ) : (
              <span>PP</span>
            )}
          </div>
          <div className="receipt-brand-text">
            <strong>{receipt.brandName}</strong>
            <span>{receipt.brandTagline}</span>
          </div>
        </div>
        <div className="receipt-meta">
          <span>#{receipt.code}</span>
          <span>{formatReceiptDate(receipt.createdAt)}</span>
        </div>
      </div>

      <div className="receipt-info">
        <div className="receipt-line">
          <span>العميل</span>
          <strong>{receipt.customerName}</strong>
        </div>
        <div className="receipt-line">
          <span>نوع الطلب</span>
          <strong>{translateStatus(receipt.orderType)}</strong>
        </div>
        <div className="receipt-line">
          <span>طريقة الدفع</span>
          <strong>{paymentLabel(receipt.payment)}</strong>
        </div>
        {receipt.tableName ? (
          <div className="receipt-line">
            <span>الطاولة</span>
            <strong>
              {receipt.tableNumber ? `${receipt.tableName} (${receipt.tableNumber})` : receipt.tableName}
            </strong>
          </div>
        ) : null}
        {receipt.zoneName ? (
          <div className="receipt-line">
            <span>منطقة التوصيل</span>
            <strong>{receipt.zoneName}</strong>
          </div>
        ) : null}
      </div>

      <div className="receipt-divider"></div>

      <table className="receipt-table">
        <thead>
          <tr>
            <th>الصنف</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((item, index) => (
            <tr key={`${item.name}-${index}`}>
              <td>{item.name}</td>
              <td>{item.qty}</td>
              <td>{money(item.unitPrice)}</td>
              <td>{money(item.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="receipt-totals">
        <div className="receipt-total-line">
          <span>الإجمالي الفرعي</span>
          <strong>{money(receipt.subtotal)}</strong>
        </div>
        {receipt.discount > 0 ? (
          <div className="receipt-total-line">
            <span>خصم</span>
            <strong>{money(receipt.discount)}</strong>
          </div>
        ) : null}
        {taxAmount > 0 ? (
          <div className="receipt-total-line">
            <span>ضريبة ({taxRate.toFixed(2)}%)</span>
            <strong>{money(taxAmount)}</strong>
          </div>
        ) : null}
        {receipt.deliveryFee > 0 ? (
          <div className="receipt-total-line">
            <span>رسوم التوصيل</span>
            <strong>{money(receipt.deliveryFee)}</strong>
          </div>
        ) : null}
        <div className="receipt-total-line grand">
          <span>الإجمالي</span>
          <strong>{money(receipt.total)}</strong>
        </div>
      </div>

      {receipt.notes ? <div className="receipt-notes">ملاحظات: {receipt.notes}</div> : null}

      <div className="receipt-footer">{RECEIPT_BRAND.footer}</div>
    </div>
  );
}
