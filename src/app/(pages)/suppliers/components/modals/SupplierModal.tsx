import { translateStatus } from "@/lib/format";
import { EntityModal, ModalForm } from "@/components/ui";
import { SuppliersPageState } from "../../hooks/useSuppliersPage";

type SupplierModalProps = Pick<
  SuppliersPageState,
  | "supplierModal"
  | "setSupplierModal"
  | "selectedSupplier"
  | "supplierForm"
  | "setSupplierForm"
  | "submitting"
  | "submitSupplier"
>;

export default function SupplierModal({
  supplierModal,
  setSupplierModal,
  selectedSupplier,
  supplierForm,
  setSupplierForm,
  submitting,
  submitSupplier,
}: SupplierModalProps) {
  return (
    <EntityModal
      open={Boolean(supplierModal)}
      title={
        supplierModal?.mode === "create"
          ? "إضافة مورد"
          : supplierModal?.mode === "edit"
            ? "تعديل المورد"
            : "تفاصيل المورد"
      }
      onClose={() => setSupplierModal(null)}
      isView={supplierModal?.mode === "view"}
      details={
        selectedSupplier
          ? [
              { label: "الاسم", value: selectedSupplier.name },
              { label: "الهاتف", value: selectedSupplier.phone || "—" },
              { label: "البريد", value: selectedSupplier.email || "—" },
              { label: "الحالة", value: translateStatus(selectedSupplier.status) },
              { label: "عدد المشتريات", value: selectedSupplier.purchasesCount },
            ]
          : []
      }
    >
      <ModalForm onSubmit={submitSupplier} submitting={submitting}>
        <label>اسم المورد</label>
        <input
          type="text"
          value={supplierForm.name}
          onChange={(event) => setSupplierForm((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
        <label>الهاتف</label>
        <input
          type="text"
          value={supplierForm.phone}
          onChange={(event) => setSupplierForm((prev) => ({ ...prev, phone: event.target.value }))}
        />
        <label>البريد الإلكتروني</label>
        <input
          type="email"
          value={supplierForm.email}
          onChange={(event) => setSupplierForm((prev) => ({ ...prev, email: event.target.value }))}
        />
        <label>الحالة</label>
        <select
          value={supplierForm.status}
          onChange={(event) =>
            setSupplierForm((prev) => ({ ...prev, status: event.target.value as "active" | "inactive" }))
          }
        >
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>
      </ModalForm>
    </EntityModal>
  );
}
