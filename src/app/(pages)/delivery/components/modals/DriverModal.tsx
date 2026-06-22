import { EntityModal, ModalForm } from "@/components/ui";
import { DeliveryPageState } from "../../hooks/useDeliveryPage";

type DriverModalProps = Pick<
  DeliveryPageState,
  "driverForm" | "driverModal" | "selectedDriver" | "setDriverForm" | "setDriverModal" | "submitDriver" | "submitting"
>;

export default function DriverModal({
  driverForm,
  driverModal,
  selectedDriver,
  setDriverForm,
  setDriverModal,
  submitDriver,
  submitting,
}: DriverModalProps) {
  const title = driverModal?.mode === "create" ? "إضافة طيار" : driverModal?.mode === "edit" ? "تعديل طيار" : "تفاصيل الطيار";

  return (
    <EntityModal
      open={Boolean(driverModal)}
      title={title}
      onClose={() => setDriverModal(null)}
      isView={driverModal?.mode === "view" && Boolean(selectedDriver)}
      details={
        selectedDriver
          ? [
              { label: "الاسم", value: selectedDriver.name },
              { label: "الهاتف", value: selectedDriver.phone || "—" },
              { label: "الحالة", value: selectedDriver.status },
              { label: "الطلبات النشطة", value: selectedDriver.activeOrders },
            ]
          : []
      }
    >
      <ModalForm onSubmit={submitDriver} submitting={submitting}>
        <label>الاسم</label>
        <input type="text" value={driverForm.name} onChange={(event) => setDriverForm((prev) => ({ ...prev, name: event.target.value }))} required />
        <label>الهاتف</label>
        <input type="text" value={driverForm.phone} onChange={(event) => setDriverForm((prev) => ({ ...prev, phone: event.target.value }))} />
        <label>الحالة</label>
        <input type="text" value={driverForm.status} onChange={(event) => setDriverForm((prev) => ({ ...prev, status: event.target.value }))} required />
      </ModalForm>
    </EntityModal>
  );
}
