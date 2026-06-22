import { money, num2 } from "@/lib/format";
import { EntityModal, ModalForm } from "@/components/ui";
import { InventoryPageState } from "../../hooks/useInventoryPage";

type MaterialModalProps = Pick<
  InventoryPageState,
  | "materialModal"
  | "setMaterialModal"
  | "selectedMaterial"
  | "materialForm"
  | "setMaterialForm"
  | "submitting"
  | "submitMaterial"
>;

export default function MaterialModal({
  materialModal,
  setMaterialModal,
  selectedMaterial,
  materialForm,
  setMaterialForm,
  submitting,
  submitMaterial,
}: MaterialModalProps) {
  return (
    <EntityModal
      open={Boolean(materialModal)}
      title={
        materialModal?.mode === "create"
          ? "إضافة مادة خام"
          : materialModal?.mode === "edit"
            ? "تعديل مادة خام"
            : "عرض مادة خام"
      }
      onClose={() => setMaterialModal(null)}
      isView={materialModal?.mode === "view"}
      details={
        selectedMaterial
          ? [
              { label: "الاسم", value: selectedMaterial.name },
              { label: "الوحدة", value: selectedMaterial.unit },
              { label: "التكلفة", value: money(selectedMaterial.cost) },
              { label: "المتاح", value: num2(selectedMaterial.stock) },
              { label: "الحد الأدنى", value: num2(selectedMaterial.minStock) },
            ]
          : []
      }
    >
      <ModalForm onSubmit={submitMaterial} submitting={submitting}>
        <label>اسم المادة</label>
        <input
          type="text"
          value={materialForm.name}
          onChange={(event) => setMaterialForm((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
        <label>الوحدة</label>
        <input
          type="text"
          value={materialForm.unit}
          onChange={(event) => setMaterialForm((prev) => ({ ...prev, unit: event.target.value }))}
          required
        />
        <label>تكلفة الوحدة</label>
        <input
          type="number"
          value={materialForm.cost}
          onChange={(event) => setMaterialForm((prev) => ({ ...prev, cost: Number(event.target.value || 0) }))}
          required
        />
        <label>المتاح</label>
        <input
          type="number"
          value={materialForm.stock}
          onChange={(event) => setMaterialForm((prev) => ({ ...prev, stock: Number(event.target.value || 0) }))}
          required
        />
        <label>الحد الأدنى</label>
        <input
          type="number"
          value={materialForm.minStock}
          onChange={(event) => setMaterialForm((prev) => ({ ...prev, minStock: Number(event.target.value || 0) }))}
          required
        />
      </ModalForm>
    </EntityModal>
  );
}
