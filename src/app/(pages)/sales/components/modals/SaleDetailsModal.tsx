import { Button, EntityModal, ReceiptPreview } from "@/components/ui";
import { money } from "@/lib/format";
import { SalesPageState } from "../../hooks/useSalesPage";
import { saleStatusLabel } from "../../types";

type SaleDetailsModalProps = Pick<SalesPageState, "selectedSale" | "setReceiptSaleId" | "setSelectedSaleId">;

export default function SaleDetailsModal({
  selectedSale,
  setReceiptSaleId,
  setSelectedSaleId,
}: SaleDetailsModalProps) {
  return (
    <EntityModal
      open={Boolean(selectedSale)}
      title="تفاصيل الفاتورة"
      onClose={() => setSelectedSaleId(null)}
      isView={Boolean(selectedSale)}
      details={
        selectedSale
          ? [
              { label: "رقم الفاتورة", value: selectedSale.invoiceNo },
              { label: "العميل", value: selectedSale.customer },
              { label: "رقم العميل", value: selectedSale.customerPhone || "—" },
              { label: "الإجمالي", value: money(selectedSale.total) },
              { label: "الحالة", value: saleStatusLabel(selectedSale.status) },
              ...(selectedSale.orderId
                ? [
                    {
                      label: "مصدر الفاتورة",
                      value: `مرتبطة بطلب ${
                        selectedSale.orderCode ? `(${selectedSale.orderCode})` : `(${selectedSale.orderId})`
                      }`,
                    },
                  ]
                : []),
            ]
          : []
      }
      viewExtra={
        selectedSale ? (
          <>
            {selectedSale.orderReceipt ? (
              <>
                <div style={{ marginTop: 12 }}>
                  <ReceiptPreview receipt={selectedSale.orderReceipt} />
                </div>
                <div className="row-actions" style={{ marginTop: 12 }}>
                  <Button variant="ghost" onClick={() => setReceiptSaleId(selectedSale.id)}>
                    طباعة إيصال الطلب
                  </Button>
                </div>
              </>
            ) : null}
            <div className="list" style={{ marginTop: 12 }}>
              {selectedSale.itemRows.map((item) => (
                <div key={item.id} className="row-line">
                  <span>{item.name}{item.isGift ? " · هدية" : ""}</span>
                  <strong>{item.qty}</strong>
                </div>
              ))}
            </div>
          </>
        ) : null
      }
    >
      {null}
    </EntityModal>
  );
}
