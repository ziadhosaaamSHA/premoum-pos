"use client";

import InlineModal from "@/components/ui/InlineModal";
import { buildReceiptPrintHtml, ReceiptSnapshot } from "@/lib/receipt";
import ReceiptPreview from "@/components/ui/ReceiptPreview";

type ReceiptModalProps = {
  open: boolean;
  receipt: ReceiptSnapshot | null;
  onClose: () => void;
};

export default function ReceiptModal({ open, receipt, onClose }: ReceiptModalProps) {
  const handlePrint = () => {
    if (!receipt) return;
    const html = buildReceiptPrintHtml(receipt);
    const printWindow = window.open("", "_blank", "width=420,height=720");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <InlineModal
      open={open}
      title="إيصال الطلب"
      onClose={onClose}
      tip="معلومة: يمكنك طباعة الإيصال أو مشاركته مع العميل."
      footer={
        <>
          <button className="ghost" type="button" onClick={onClose}>
            إغلاق
          </button>
          <button className="primary" type="button" onClick={handlePrint} disabled={!receipt}>
            طباعة
          </button>
        </>
      }
    >
      <div className="modal-body">
        {!receipt ? <p className="hint">لا توجد بيانات إيصال متاحة لهذا الطلب.</p> : <ReceiptPreview receipt={receipt} />}
      </div>
    </InlineModal>
  );
}
