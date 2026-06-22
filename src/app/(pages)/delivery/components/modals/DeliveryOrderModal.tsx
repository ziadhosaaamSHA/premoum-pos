import { EntityModal } from "@/components/ui";
import { translateStatus } from "@/lib/format";
import { DeliveryPageState } from "../../hooks/useDeliveryPage";

type DeliveryOrderModalProps = Pick<DeliveryPageState, "selectedOrder" | "setSelectedOrderId">;

export default function DeliveryOrderModal({ selectedOrder, setSelectedOrderId }: DeliveryOrderModalProps) {
  return (
    <EntityModal
      open={Boolean(selectedOrder)}
      title="تفاصيل طلب التوصيل"
      onClose={() => setSelectedOrderId(null)}
      isView={Boolean(selectedOrder)}
      details={
        selectedOrder
          ? [
              { label: "رقم الطلب", value: selectedOrder.code },
              { label: "العميل", value: selectedOrder.customer },
              { label: "النطاق", value: selectedOrder.zoneName || "—" },
              { label: "الطيار", value: selectedOrder.driverName || "—" },
              { label: "الحالة", value: translateStatus(selectedOrder.status) },
            ]
          : []
      }
    >
      {null}
    </EntityModal>
  );
}
