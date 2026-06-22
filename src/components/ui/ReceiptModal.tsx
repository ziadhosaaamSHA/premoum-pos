"use client";

import { useCallback, useEffect, useRef } from "react";
import InlineModal from "@/components/ui/InlineModal";
import { buildReceiptPrintHtml, ReceiptSnapshot } from "@/lib/receipt";
import Button from "./Button";
import ReceiptPreview from "@/components/ui/ReceiptPreview";

type ReceiptModalProps = {
  open: boolean;
  receipt: ReceiptSnapshot | null;
  onClose: () => void;
  autoPrint?: boolean;
};

export default function ReceiptModal({ open, receipt, onClose, autoPrint = false }: ReceiptModalProps) {
  const autoPrintedReceiptRef = useRef<string | null>(null);

  const handlePrint = useCallback(() => {
    if (!receipt) return;
    const html = buildReceiptPrintHtml(receipt);
    const printWindow = window.open("", "_blank", "width=420,height=720");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 250);
  }, [receipt]);

  useEffect(() => {
    if (!autoPrint || !open || !receipt) return;
    if (autoPrintedReceiptRef.current === receipt.code) return;
    autoPrintedReceiptRef.current = receipt.code;
    handlePrint();
  }, [autoPrint, handlePrint, open, receipt]);

  return (
    <InlineModal
      open={open}
      title="إيصال الطلب"
      onClose={onClose}
      tip="معلومة: يمكنك طباعة الإيصال أو مشاركته مع العميل."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            إغلاق
          </Button>
          <Button onClick={handlePrint} disabled={!receipt}>
            طباعة
          </Button>
        </>
      }
    >
      <div className="modal-body">
        {!receipt ? <p className="hint">لا توجد بيانات إيصال متاحة لهذا الطلب.</p> : <ReceiptPreview receipt={receipt} />}
      </div>
    </InlineModal>
  );
}
