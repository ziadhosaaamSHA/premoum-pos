import { money, num2, translateStatus } from "@/lib/format";
import { EntityModal, ModalForm } from "@/components/ui";
import { InventoryPageState } from "../../hooks/useInventoryPage";

type PurchaseModalProps = Pick<
  InventoryPageState,
  | "purchaseModal"
  | "setPurchaseModal"
  | "selectedPurchase"
  | "purchaseForm"
  | "setPurchaseForm"
  | "suppliers"
  | "materials"
  | "submitting"
  | "submitPurchase"
>;

export default function PurchaseModal({
  purchaseModal,
  setPurchaseModal,
  selectedPurchase,
  purchaseForm,
  setPurchaseForm,
  suppliers,
  materials,
  submitting,
  submitPurchase,
}: PurchaseModalProps) {
  return (
    <EntityModal
      open={Boolean(purchaseModal)}
      title={
        purchaseModal?.mode === "create"
          ? "إضافة فاتورة مشتريات"
          : purchaseModal?.mode === "edit"
            ? "تعديل فاتورة مشتريات"
            : "عرض فاتورة مشتريات"
      }
      onClose={() => setPurchaseModal(null)}
      isView={purchaseModal?.mode === "view"}
      details={
        selectedPurchase
          ? [
              { label: "الكود", value: selectedPurchase.code },
              { label: "المورد", value: selectedPurchase.supplier },
              { label: "المنتج", value: selectedPurchase.material },
              { label: "الكمية", value: num2(selectedPurchase.quantity) },
              { label: "تكلفة الوحدة", value: money(selectedPurchase.unitCost) },
              { label: "التاريخ", value: selectedPurchase.date },
              { label: "الإجمالي", value: money(selectedPurchase.total) },
              { label: "الحالة", value: translateStatus(selectedPurchase.status) },
              { label: "ملاحظات", value: selectedPurchase.notes, hidden: !selectedPurchase.notes },
            ]
          : []
      }
    >
      <ModalForm onSubmit={submitPurchase} submitting={submitting}>
        <label>التاريخ</label>
        <input
          type="date"
          value={purchaseForm.date}
          onChange={(event) => setPurchaseForm((prev) => ({ ...prev, date: event.target.value }))}
          required
        />
        <label>المورد</label>
        <select
          value={purchaseForm.supplierId}
          onChange={(event) => setPurchaseForm((prev) => ({ ...prev, supplierId: event.target.value }))}
        >
          <option value="">بدون مورد</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
        <label>المنتج</label>
        <select
          value={purchaseForm.materialId}
          onChange={(event) => setPurchaseForm((prev) => ({ ...prev, materialId: event.target.value }))}
          required
        >
          {materials.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <label>الكمية</label>
        <input
          type="number"
          min="0.001"
          step="0.001"
          value={purchaseForm.quantity}
          onChange={(event) => setPurchaseForm((prev) => ({ ...prev, quantity: Number(event.target.value || 0) }))}
          required
        />
        <label>تكلفة الوحدة</label>
        <input
          type="number"
          min="0"
          step="0.001"
          value={purchaseForm.unitCost}
          onChange={(event) => setPurchaseForm((prev) => ({ ...prev, unitCost: Number(event.target.value || 0) }))}
          required
        />
        <label>الإجمالي</label>
        <input type="number" value={purchaseForm.total} readOnly />
        <label>الحالة</label>
        <select
          value={purchaseForm.status}
          onChange={(event) =>
            setPurchaseForm((prev) => ({
              ...prev,
              status: event.target.value as "posted" | "draft" | "cancelled",
            }))
          }
        >
          <option value="posted">مرحلة</option>
          <option value="draft">مسودة</option>
          <option value="cancelled">ملغاة</option>
        </select>
        <label>ملاحظات</label>
        <input
          type="text"
          value={purchaseForm.notes}
          onChange={(event) => setPurchaseForm((prev) => ({ ...prev, notes: event.target.value }))}
        />
      </ModalForm>
    </EntityModal>
  );
}
