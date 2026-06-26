import { FormEvent } from "react";
import { money } from "@/lib/format";
import { DataTable, DataTableColumn, getExportColumns, TableSection } from "@/components/ui";
import { SalesPageState } from "../../hooks/useSalesPage";
import { RetailReturnExchangeRow } from "../../types";

type RetailReturnsPanelProps = Pick<
  SalesPageState,
  | "canCreateSales"
  | "filteredReturnExchanges"
  | "handleReturnExchangeSubmit"
  | "returnForm"
  | "returnSearch"
  | "setReturnForm"
  | "setReturnSearch"
  | "submitting"
>;

const typeLabel: Record<RetailReturnExchangeRow["type"], string> = {
  return: "إرجاع",
  exchange: "استبدال",
};

export default function RetailReturnsPanel({
  canCreateSales,
  filteredReturnExchanges,
  handleReturnExchangeSubmit,
  returnForm,
  returnSearch,
  setReturnForm,
  setReturnSearch,
  submitting,
}: RetailReturnsPanelProps) {
  const columns: DataTableColumn<RetailReturnExchangeRow>[] = [
    { header: "الكود", cell: (row) => row.code, exportValue: (row) => row.code },
    { header: "الفاتورة", cell: (row) => row.invoiceNo, exportValue: (row) => row.invoiceNo },
    { header: "رقم العميل", cell: (row) => row.customerPhone || "—", exportValue: (row) => row.customerPhone || "" },
    { header: "النوع", cell: (row) => typeLabel[row.type], exportValue: (row) => typeLabel[row.type] },
    { header: "استرداد", cell: (row) => money(row.refundAmount), exportValue: (row) => row.refundAmount },
    { header: "استبدال", cell: (row) => money(row.exchangeAmount), exportValue: (row) => row.exchangeAmount },
    { header: "التاريخ", cell: (row) => row.createdAt, exportValue: (row) => row.createdAt },
  ];

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleReturnExchangeSubmit(event);
  };

  return (
    <TableSection
      title="الإرجاع والاستبدال"
      search={{
        value: returnSearch,
        onChange: setReturnSearch,
        placeholder: "بحث برقم العميل أو الفاتورة...",
      }}
      exportActions={{
        rows: filteredReturnExchanges,
        columns: getExportColumns(columns),
        fileName: "retail-returns-exchanges",
        printTitle: "الإرجاع والاستبدال",
        tableId: "retail-returns-table",
      }}
    >
      {canCreateSales ? (
        <form className="retail-section-form" onSubmit={onSubmit}>
          <div className="retail-form-grid">
            <label>
              رقم الفاتورة
              <input
                type="text"
                value={returnForm.invoiceNo}
                onChange={(event) => setReturnForm((prev) => ({ ...prev, invoiceNo: event.target.value }))}
                placeholder="اختياري عند استخدام رقم العميل"
              />
            </label>
            <label>
              رقم العميل / الهاتف
              <input
                type="text"
                value={returnForm.customerPhone}
                onChange={(event) => setReturnForm((prev) => ({ ...prev, customerPhone: event.target.value }))}
                placeholder="بحث آخر فاتورة للعميل"
              />
            </label>
            <label>
              اسم العميل
              <input
                type="text"
                value={returnForm.customerName}
                onChange={(event) => setReturnForm((prev) => ({ ...prev, customerName: event.target.value }))}
                placeholder="يستخدم إذا لم توجد فاتورة"
              />
            </label>
            <label>
              النوع
              <select
                value={returnForm.type}
                onChange={(event) =>
                  setReturnForm((prev) => ({ ...prev, type: event.target.value as RetailReturnExchangeRow["type"] }))
                }
              >
                <option value="return">إرجاع</option>
                <option value="exchange">استبدال</option>
              </select>
            </label>
            <label>
              قيمة الاسترداد
              <input
                type="number"
                min={0}
                step={1}
                value={returnForm.refundAmount}
                onChange={(event) =>
                  setReturnForm((prev) => ({ ...prev, refundAmount: Number(event.target.value || 0) }))
                }
              />
            </label>
            <label>
              قيمة الاستبدال
              <input
                type="number"
                min={0}
                step={1}
                value={returnForm.exchangeAmount}
                onChange={(event) =>
                  setReturnForm((prev) => ({ ...prev, exchangeAmount: Number(event.target.value || 0) }))
                }
              />
            </label>
            <label>
              السبب
              <input
                type="text"
                value={returnForm.reason}
                onChange={(event) => setReturnForm((prev) => ({ ...prev, reason: event.target.value }))}
              />
            </label>
            <label>
              ملاحظات
              <input
                type="text"
                value={returnForm.notes}
                onChange={(event) => setReturnForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
          </div>
          <button className="primary retail-section-submit" type="submit" disabled={submitting}>
            <i className="bx bx-revision"></i>
            {submitting ? "جارٍ الحفظ..." : "تسجيل العملية"}
          </button>
        </form>
      ) : null}

      <DataTable
        id="retail-returns-table"
        rows={filteredReturnExchanges}
        columns={columns}
        getRowKey={(row) => row.id}
        selectable={false}
      />
    </TableSection>
  );
}
