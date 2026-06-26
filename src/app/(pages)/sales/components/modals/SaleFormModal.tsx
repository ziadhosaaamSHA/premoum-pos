import { InlineModal, ModalForm } from "@/components/ui";
import { SalesPageState } from "../../hooks/useSalesPage";

type SaleFormModalProps = Pick<
  SalesPageState,
  | "createOpen"
  | "editSaleId"
  | "handleCreateSubmit"
  | "handleEditSubmit"
  | "resetSaleForm"
  | "saleForm"
  | "setCreateOpen"
  | "setEditSaleId"
  | "setSaleForm"
  | "submitting"
>;

function SaleFormFields({
  saleForm,
  setSaleForm,
}: Pick<SaleFormModalProps, "saleForm" | "setSaleForm">) {
  return (
    <>
      <label>التاريخ</label>
      <input
        type="date"
        value={saleForm.date}
        onChange={(event) => setSaleForm((prev) => ({ ...prev, date: event.target.value }))}
        required
      />
      <label>اسم العميل</label>
      <input
        type="text"
        value={saleForm.customer}
        onChange={(event) => setSaleForm((prev) => ({ ...prev, customer: event.target.value }))}
        required
      />
      <label>رقم العميل / الهاتف</label>
      <input
        type="text"
        value={saleForm.customerPhone}
        onChange={(event) => setSaleForm((prev) => ({ ...prev, customerPhone: event.target.value }))}
        placeholder="اختياري"
      />
      <label>الإجمالي</label>
      <input
        type="number"
        value={saleForm.total}
        onChange={(event) => setSaleForm((prev) => ({ ...prev, total: Number(event.target.value || 0) }))}
        required
      />
      <label>العناصر (مفصولة بفاصلة)</label>
      <input
        type="text"
        value={saleForm.itemsText}
        onChange={(event) => setSaleForm((prev) => ({ ...prev, itemsText: event.target.value }))}
        placeholder="مثال: عصير مانجو، مياه"
      />
    </>
  );
}

export default function SaleFormModal({
  createOpen,
  editSaleId,
  handleCreateSubmit,
  handleEditSubmit,
  resetSaleForm,
  saleForm,
  setCreateOpen,
  setEditSaleId,
  setSaleForm,
  submitting,
}: SaleFormModalProps) {
  return (
    <>
      <InlineModal
        open={createOpen}
        title="إضافة فاتورة"
        onClose={() => {
          setCreateOpen(false);
          resetSaleForm();
        }}
      >
        <ModalForm onSubmit={handleCreateSubmit} submitting={submitting} submitLabel="حفظ الفاتورة">
          <SaleFormFields saleForm={saleForm} setSaleForm={setSaleForm} />
        </ModalForm>
      </InlineModal>

      <InlineModal open={Boolean(editSaleId)} title="تعديل الفاتورة" onClose={() => setEditSaleId(null)}>
        <ModalForm onSubmit={handleEditSubmit} submitting={submitting}>
          <SaleFormFields saleForm={saleForm} setSaleForm={setSaleForm} />
        </ModalForm>
      </InlineModal>
    </>
  );
}
