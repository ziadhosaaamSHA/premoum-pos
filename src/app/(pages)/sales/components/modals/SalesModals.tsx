import { ConfirmModal, ReceiptModal } from "@/components/ui";
import { SalesPageState } from "../../hooks/useSalesPage";
import SaleDetailsModal from "./SaleDetailsModal";
import SaleFormModal from "./SaleFormModal";

type SalesModalsProps = {
  state: SalesPageState;
};

export default function SalesModals({ state }: SalesModalsProps) {
  return (
    <>
      <SaleFormModal {...state} />
      <SaleDetailsModal {...state} />

      <ConfirmModal
        open={Boolean(state.approveSaleId)}
        title="اعتماد الفاتورة"
        message="سيتم تغيير حالة الفاتورة إلى مدفوعة."
        confirmLabel="تأكيد الاعتماد"
        onClose={() => state.setApproveSaleId(null)}
        onConfirm={() => {
          if (!state.approveSaleId) return;
          void state.approveSale(state.approveSaleId);
        }}
      />

      <ConfirmModal
        open={Boolean(state.deleteSaleId)}
        title="حذف الفاتورة"
        message={
          state.deleteTargetSale?.status === "void"
            ? "سيتم حذف الفاتورة نهائياً من النظام في هذه الخطوة ولا يمكن استعادتها لاحقاً."
            : "سيتم تعليم الفاتورة كمحذوفة واستبعادها من إجماليات النظام. الحذف التالي يحذفها نهائياً."
        }
        confirmLabel="تأكيد الحذف"
        destructive
        onClose={() => state.setDeleteSaleId(null)}
        onConfirm={() => {
          if (!state.deleteSaleId) return;
          void state.removeSale(state.deleteSaleId);
        }}
      />

      <ReceiptModal
        open={Boolean(state.receiptSale)}
        receipt={state.receiptSale?.orderReceipt ?? null}
        onClose={() => state.setReceiptSaleId(null)}
      />
    </>
  );
}
