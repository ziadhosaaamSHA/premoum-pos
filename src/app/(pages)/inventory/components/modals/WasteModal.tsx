import { money, num2 } from "@/lib/format";
import { EntityModal, ModalForm } from "@/components/ui";
import { InventoryPageState } from "../../hooks/useInventoryPage";

type WasteModalProps = Pick<
  InventoryPageState,
  | "wasteModal"
  | "setWasteModal"
  | "selectedWaste"
  | "wasteForm"
  | "setWasteForm"
  | "materials"
  | "submitting"
  | "submitWaste"
>;

export default function WasteModal({
  wasteModal,
  setWasteModal,
  selectedWaste,
  wasteForm,
  setWasteForm,
  materials,
  submitting,
  submitWaste,
}: WasteModalProps) {
  return (
    <EntityModal
      open={Boolean(wasteModal)}
      title={wasteModal?.mode === "create" ? "تسجيل هدر" : wasteModal?.mode === "edit" ? "تعديل هدر" : "عرض هدر"}
      onClose={() => setWasteModal(null)}
      isView={wasteModal?.mode === "view"}
      details={
        selectedWaste
          ? [
              { label: "المادة", value: selectedWaste.material },
              { label: "الكمية", value: num2(selectedWaste.qty) },
              { label: "السبب", value: selectedWaste.reason },
              { label: "التكلفة", value: money(selectedWaste.cost) },
            ]
          : []
      }
    >
      <ModalForm onSubmit={submitWaste} submitting={submitting}>
        <label>التاريخ</label>
        <input
          type="date"
          value={wasteForm.date}
          onChange={(event) => setWasteForm((prev) => ({ ...prev, date: event.target.value }))}
          required
        />
        <label>المادة</label>
        <select
          value={wasteForm.materialId}
          onChange={(event) => setWasteForm((prev) => ({ ...prev, materialId: event.target.value }))}
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
          value={wasteForm.qty}
          onChange={(event) => setWasteForm((prev) => ({ ...prev, qty: Number(event.target.value || 0) }))}
          required
        />
        <label>السبب</label>
        <input
          type="text"
          value={wasteForm.reason}
          onChange={(event) => setWasteForm((prev) => ({ ...prev, reason: event.target.value }))}
          required
        />
        <label>التكلفة</label>
        <input
          type="number"
          value={wasteForm.cost}
          onChange={(event) => setWasteForm((prev) => ({ ...prev, cost: Number(event.target.value || 0) }))}
          required
        />
      </ModalForm>
    </EntityModal>
  );
}
