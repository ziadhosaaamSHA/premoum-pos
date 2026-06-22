import InlineModal from "@/components/ui/InlineModal";
import { money } from "@/lib/format";
import { FinishAdjustment, PosOrder } from "../types";

type FinishPreview = {
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
};

type FinishOrderModalProps = {
  open: boolean;
  activeTableOrder: PosOrder | null;
  finishAdjustments: FinishAdjustment[];
  finishPreview: FinishPreview;
  discountRate: number;
  finishSubmitting: boolean;
  onClose: () => void;
  onChangeDeduction: (itemId: string, delta: number) => void;
  onFinish: () => void;
};

export default function FinishOrderModal({
  open,
  activeTableOrder,
  finishAdjustments,
  finishPreview,
  discountRate,
  finishSubmitting,
  onClose,
  onChangeDeduction,
  onFinish,
}: FinishOrderModalProps) {
  return (
    <InlineModal
      open={open}
      title="إنهاء الطاولة"
      onClose={onClose}
      footer={
        <>
          <button className="ghost" type="button" onClick={onClose}>
            إلغاء
          </button>
          <button className="primary" type="button" onClick={onFinish} disabled={finishSubmitting}>
            {finishSubmitting ? "جارٍ الإنهاء..." : "تأكيد إنهاء الطاولة"}
          </button>
        </>
      }
    >
      {activeTableOrder ? (
        <div className="modal-body">
          <div className="list">
            <div className="row-line">
              <span>رقم الطلب</span>
              <strong>{activeTableOrder.code}</strong>
            </div>
            <div className="row-line">
              <span>الطاولة</span>
              <strong>
                {activeTableOrder.tableName} ({activeTableOrder.tableNumber})
              </strong>
            </div>
          </div>

          <table className="view-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الخصم من الصنف</th>
                <th>بعد الخصم</th>
              </tr>
            </thead>
            <tbody>
              {finishAdjustments.map((item) => {
                const remainingQty = item.qty - item.deductQty;
                return (
                  <tr key={item.itemId}>
                    <td>{item.name}</td>
                    <td>{item.qty}</td>
                    <td>{money(item.unitPrice)}</td>
                    <td>
                      <div className="qty-control">
                        <button
                          className="qty-btn"
                          type="button"
                          onClick={() => onChangeDeduction(item.itemId, -1)}
                          disabled={item.deductQty <= 0}
                        >
                          -
                        </button>
                        <span className="qty-value">{item.deductQty}</span>
                        <button
                          className="qty-btn"
                          type="button"
                          onClick={() => onChangeDeduction(item.itemId, 1)}
                          disabled={item.deductQty >= item.qty}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td>{remainingQty}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="cart-summary" style={{ marginTop: 12 }}>
            <div className="summary-row">
              <span>الإجمالي الفرعي بعد التعديل</span>
              <strong>{money(finishPreview.subtotal)}</strong>
            </div>
            <div className="summary-row">
              <span>الخصم النهائي ({discountRate.toFixed(1)}%)</span>
              <strong>{money(finishPreview.discount)}</strong>
            </div>
            <div className="summary-row">
              <span>الضريبة النهائية ({finishPreview.taxRate.toFixed(2)}%)</span>
              <strong>{money(finishPreview.taxAmount)}</strong>
            </div>
            <div className="summary-row highlight">
              <span>الإجمالي النهائي</span>
              <strong>{money(finishPreview.total)}</strong>
            </div>
          </div>
        </div>
      ) : (
        <p className="hint">تعذر تحميل تفاصيل الطلب النشط.</p>
      )}
    </InlineModal>
  );
}
