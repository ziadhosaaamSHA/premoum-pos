import { Button, EntityModal } from "@/components/ui";
import { OrdersPageState } from "../../hooks/useOrdersPage";

type TableDetailsModalProps = Pick<
  OrdersPageState,
  | "handleClearTable"
  | "openTableModal"
  | "router"
  | "selectedTable"
  | "setFinishTableOrderId"
  | "setSelectedTableId"
  | "setTableDeleteId"
  | "tableOrder"
>;

export default function TableDetailsModal({
  handleClearTable,
  openTableModal,
  router,
  selectedTable,
  setFinishTableOrderId,
  setSelectedTableId,
  setTableDeleteId,
  tableOrder,
}: TableDetailsModalProps) {
  return (
    <EntityModal
      open={Boolean(selectedTable)}
      title="تفاصيل الطاولة"
      onClose={() => setSelectedTableId(null)}
      isView={Boolean(selectedTable)}
      details={
        selectedTable
          ? [
              { label: "الاسم", value: selectedTable.name },
              { label: "رقم الطاولة", value: selectedTable.number },
              { label: "الحالة", value: selectedTable.status === "occupied" ? "مشغولة" : "فارغة" },
              ...(selectedTable.status === "occupied" && tableOrder
                ? [
                    { label: "رقم الطلب", value: tableOrder.code },
                    { label: "العميل", value: tableOrder.customer },
                  ]
                : []),
            ]
          : []
      }
      viewExtra={
        selectedTable ? (
          <>
            {selectedTable.status === "occupied" ? (
              tableOrder ? (
                <>
                  <Button
                    onClick={() => {
                      router.push(`/pos?tableId=${selectedTable.id}`);
                      setSelectedTableId(null);
                    }}
                  >
                    فتح الطلب في الكاشير
                  </Button>
                  <Button variant="ghost" onClick={() => setFinishTableOrderId(tableOrder.id)}>
                    إنهاء الطاولة
                  </Button>
                </>
              ) : (
                <>
                  <p className="hint">تم إشغال الطاولة يدوياً بدون ربط طلب.</p>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      void handleClearTable(selectedTable.id);
                      setSelectedTableId(null);
                    }}
                  >
                    تفريغ الطاولة
                  </Button>
                </>
              )
            ) : (
              <>
                <p className="hint">هذه الطاولة فارغة حالياً.</p>
                <Button
                  onClick={() => {
                    router.push(`/pos?tableId=${selectedTable.id}`);
                    setSelectedTableId(null);
                  }}
                >
                  طلب جديد على هذه الطاولة
                </Button>
              </>
            )}
            <div className="row-actions">
              <Button
                variant="ghost"
                onClick={() => {
                  openTableModal(selectedTable);
                  setSelectedTableId(null);
                }}
              >
                تعديل الطاولة
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setTableDeleteId(selectedTable.id);
                  setSelectedTableId(null);
                }}
              >
                حذف الطاولة
              </Button>
            </div>
          </>
        ) : null
      }
    >
      {null}
    </EntityModal>
  );
}
