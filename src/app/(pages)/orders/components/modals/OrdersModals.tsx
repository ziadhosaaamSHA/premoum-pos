import { ConfirmModal, ReceiptModal } from "@/components/ui";
import { OrdersPageState } from "../../hooks/useOrdersPage";
import OrderDetailsModal from "./OrderDetailsModal";
import TableDetailsModal from "./TableDetailsModal";
import TableFormModal from "./TableFormModal";

type OrdersModalsProps = {
  state: OrdersPageState;
};

export default function OrdersModals({ state }: OrdersModalsProps) {
  return (
    <>
      <OrderDetailsModal {...state} />
      <TableFormModal {...state} />
      <TableDetailsModal {...state} />

      <ConfirmModal
        open={Boolean(state.orderDeleteId)}
        title="حذف الطلب"
        message="سيتم حذف الطلب نهائياً من القائمة."
        confirmLabel="تأكيد الحذف"
        destructive
        onClose={() => state.setOrderDeleteId(null)}
        onConfirm={() => {
          if (!state.orderDeleteId) return;
          const orderId = state.orderDeleteId;
          void (async () => {
            await state.handleDeleteOrder(orderId);
            state.setOrderDeleteId(null);
          })();
        }}
      />

      <ConfirmModal
        open={Boolean(state.tableDeleteId)}
        title="حذف الطاولة"
        message="سيتم حذف الطاولة بشكل نهائي."
        confirmLabel="تأكيد الحذف"
        destructive
        onClose={() => state.setTableDeleteId(null)}
        onConfirm={() => {
          if (!state.tableDeleteId) return;
          const tableId = state.tableDeleteId;
          void (async () => {
            await state.handleDeleteTable(tableId);
            state.setTableDeleteId(null);
          })();
        }}
      />

      <ConfirmModal
        open={Boolean(state.finishTableOrderId)}
        title="إنهاء الطاولة"
        message="سيتم إنهاء الطلب المرتبط بالطاولة وتحويله تلقائياً إلى المبيعات كفاتورة معتمدة."
        confirmLabel="إنهاء الطلب"
        onClose={() => state.setFinishTableOrderId(null)}
        onConfirm={() => {
          if (!state.finishTableOrderId) return;
          const orderId = state.finishTableOrderId;
          void (async () => {
            await state.handleOrderStatusChange(orderId, "delivered");
            state.setFinishTableOrderId(null);
            state.setSelectedTableId(null);
          })();
        }}
      />

      <ReceiptModal
        open={Boolean(state.receiptOrder)}
        receipt={state.receiptSnapshot}
        onClose={() => state.setReceiptOrderId(null)}
      />
    </>
  );
}
