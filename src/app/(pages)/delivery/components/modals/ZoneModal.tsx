import { EntityModal, ModalForm } from "@/components/ui";
import { money } from "@/lib/format";
import { translateStatus } from "@/lib/format";
import { DeliveryPageState } from "../../hooks/useDeliveryPage";

type ZoneModalProps = Pick<
  DeliveryPageState,
  "selectedZone" | "setZoneForm" | "setZoneModal" | "submitZone" | "submitting" | "zoneForm" | "zoneModal"
>;

export default function ZoneModal({
  selectedZone,
  setZoneForm,
  setZoneModal,
  submitZone,
  submitting,
  zoneForm,
  zoneModal,
}: ZoneModalProps) {
  const title = zoneModal?.mode === "create" ? "إضافة نطاق" : zoneModal?.mode === "edit" ? "تعديل نطاق" : "تفاصيل النطاق";

  return (
    <EntityModal
      open={Boolean(zoneModal)}
      title={title}
      onClose={() => setZoneModal(null)}
      isView={zoneModal?.mode === "view" && Boolean(selectedZone)}
      details={
        selectedZone
          ? [
              { label: "الاسم", value: selectedZone.name },
              { label: "الحد الأقصى", value: `${selectedZone.limit} كم` },
              { label: "الرسوم", value: money(selectedZone.fee) },
              { label: "الحد الأدنى", value: money(selectedZone.minOrder) },
              { label: "الحالة", value: translateStatus(selectedZone.status) },
            ]
          : []
      }
    >
      <ModalForm onSubmit={submitZone} submitting={submitting}>
        <label>اسم النطاق</label>
        <input type="text" value={zoneForm.name} onChange={(event) => setZoneForm((prev) => ({ ...prev, name: event.target.value }))} required />
        <label>الحد الأقصى (كم)</label>
        <input type="number" value={zoneForm.limit} onChange={(event) => setZoneForm((prev) => ({ ...prev, limit: Number(event.target.value || 0) }))} required />
        <label>رسوم التوصيل</label>
        <input type="number" value={zoneForm.fee} onChange={(event) => setZoneForm((prev) => ({ ...prev, fee: Number(event.target.value || 0) }))} required />
        <label>الحد الأدنى للطلب</label>
        <input type="number" value={zoneForm.minOrder} onChange={(event) => setZoneForm((prev) => ({ ...prev, minOrder: Number(event.target.value || 0) }))} required />
        <label>الحالة</label>
        <select value={zoneForm.status} onChange={(event) => setZoneForm((prev) => ({ ...prev, status: event.target.value as "active" | "inactive" }))}>
          <option value="active">سارية</option>
          <option value="inactive">موقوفة</option>
        </select>
      </ModalForm>
    </EntityModal>
  );
}
