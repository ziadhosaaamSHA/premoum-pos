import { Button, EntityModal } from "@/components/ui";
import { money, translateStatus } from "@/lib/format";
import { OrdersPageState } from "../../hooks/useOrdersPage";

type OrderDetailsModalProps = Pick<OrdersPageState, "selectedOrder" | "setReceiptOrderId" | "setSelectedOrderId">;

export default function OrderDetailsModal({
  selectedOrder,
  setReceiptOrderId,
  setSelectedOrderId,
}: OrderDetailsModalProps) {
  return (
    <EntityModal
      open={Boolean(selectedOrder)}
      title="تفاصيل الطلب"
      onClose={() => setSelectedOrderId(null)}
      isView={Boolean(selectedOrder)}
      details={
        selectedOrder
          ? [
              { label: "رقم الطلب", value: selectedOrder.code },
              { label: "العميل", value: selectedOrder.customer },
              { label: "الحالة", value: translateStatus(selectedOrder.status) },
              { label: "نوع الطلب", value: translateStatus(selectedOrder.type) },
              { label: "طريقة الدفع", value: translateStatus(selectedOrder.payment) },
              { label: "الإجمالي", value: money(selectedOrder.total) },
            ]
          : []
      }
      viewExtra={
        selectedOrder ? (
          <>
            <div className="row-actions" style={{ marginTop: 12 }}>
              <Button
                variant="ghost"
                onClick={() => {
                  setReceiptOrderId(selectedOrder.id);
                  setSelectedOrderId(null);
                }}
              >
                طباعة الإيصال
              </Button>
            </div>
            <table className="view-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>الكمية</th>
                  <th>سعر الوحدة</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.qty}</td>
                    <td>{money(item.unitPrice)}</td>
                    <td>{money(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null
      }
    >
      {null}
    </EntityModal>
  );
}
