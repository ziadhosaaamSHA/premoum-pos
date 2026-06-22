import { InlineModal, ModalForm } from "@/components/ui";
import { OrdersPageState } from "../../hooks/useOrdersPage";

type TableFormModalProps = Pick<
  OrdersPageState,
  | "handleTableSubmit"
  | "setTableForm"
  | "setTableModalOpen"
  | "tableAssignableOrders"
  | "tableForm"
  | "tableModalOpen"
  | "tableSubmitting"
>;

export default function TableFormModal({
  handleTableSubmit,
  setTableForm,
  setTableModalOpen,
  tableAssignableOrders,
  tableForm,
  tableModalOpen,
  tableSubmitting,
}: TableFormModalProps) {
  return (
    <InlineModal
      open={tableModalOpen}
      title={tableForm.id ? "تعديل طاولة" : "إضافة طاولة"}
      onClose={() => setTableModalOpen(false)}
    >
      <ModalForm onSubmit={handleTableSubmit} submitting={tableSubmitting} submitLabel="حفظ البيانات">
        <label>اسم الطاولة</label>
        <input
          type="text"
          value={tableForm.name}
          onChange={(event) => setTableForm((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
        <label>رقم الطاولة</label>
        <input
          type="number"
          value={tableForm.number}
          onChange={(event) => setTableForm((prev) => ({ ...prev, number: Number(event.target.value || 0) }))}
          required
        />
        <label>الحالة</label>
        <select
          value={tableForm.status}
          onChange={(event) =>
            setTableForm((prev) => ({ ...prev, status: event.target.value as "empty" | "occupied" }))
          }
        >
          <option value="empty">فارغة</option>
          <option value="occupied">مشغولة</option>
        </select>
        {tableForm.status === "occupied" ? (
          <>
            <label>ربط بعملية</label>
            <select
              value={tableForm.orderId}
              onChange={(event) => setTableForm((prev) => ({ ...prev, orderId: event.target.value }))}
            >
              <option value="">بدون ربط</option>
              {tableAssignableOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.code} - {order.customer}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </ModalForm>
    </InlineModal>
  );
}
