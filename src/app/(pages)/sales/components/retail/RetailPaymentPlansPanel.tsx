import { FormEvent } from "react";
import { money } from "@/lib/format";
import { DataTable, DataTableColumn, getExportColumns, TableSection } from "@/components/ui";
import { SalesPageState } from "../../hooks/useSalesPage";
import { RetailPaymentPlanRow } from "../../types";

type RetailPaymentPlansPanelProps = Pick<
  SalesPageState,
  | "canCreateSales"
  | "filteredPaymentPlans"
  | "handlePaymentPlanSubmit"
  | "paymentPlanForm"
  | "paymentPlanSearch"
  | "setPaymentPlanForm"
  | "setPaymentPlanSearch"
  | "submitting"
>;

export default function RetailPaymentPlansPanel({
  canCreateSales,
  filteredPaymentPlans,
  handlePaymentPlanSubmit,
  paymentPlanForm,
  paymentPlanSearch,
  setPaymentPlanForm,
  setPaymentPlanSearch,
  submitting,
}: RetailPaymentPlansPanelProps) {
  const columns: DataTableColumn<RetailPaymentPlanRow>[] = [
    { header: "الفاتورة", cell: (row) => row.invoiceNo, exportValue: (row) => row.invoiceNo },
    { header: "العميل", cell: (row) => row.customer, exportValue: (row) => row.customer },
    { header: "رقم العميل", cell: (row) => row.customerPhone || "—", exportValue: (row) => row.customerPhone || "" },
    { header: "الإجمالي", cell: (row) => money(row.totalAmount), exportValue: (row) => row.totalAmount },
    { header: "الدفعة", cell: (row) => money(row.downPayment), exportValue: (row) => row.downPayment },
    { header: "المتبقي", cell: (row) => money(row.remainingAmount), exportValue: (row) => row.remainingAmount },
    {
      header: "القسط",
      cell: (row) => `${row.installmentCount} × ${money(row.installmentAmount)}`,
      exportValue: (row) => row.installmentAmount,
    },
    { header: "أول استحقاق", cell: (row) => row.firstDueDate || "—", exportValue: (row) => row.firstDueDate || "" },
  ];

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handlePaymentPlanSubmit(event);
  };

  return (
    <TableSection
      title="خطط الدفع والتقسيط"
      search={{
        value: paymentPlanSearch,
        onChange: setPaymentPlanSearch,
        placeholder: "بحث برقم العميل أو الفاتورة...",
      }}
      exportActions={{
        rows: filteredPaymentPlans,
        columns: getExportColumns(columns),
        fileName: "retail-payment-plans",
        printTitle: "خطط الدفع والتقسيط",
        tableId: "retail-payment-plans-table",
      }}
    >
      {canCreateSales ? (
        <form className="retail-section-form" onSubmit={onSubmit}>
          <div className="retail-form-grid">
            <label>
              رقم الفاتورة
              <input
                type="text"
                value={paymentPlanForm.invoiceNo}
                onChange={(event) => setPaymentPlanForm((prev) => ({ ...prev, invoiceNo: event.target.value }))}
                placeholder="اختياري عند استخدام رقم العميل"
              />
            </label>
            <label>
              رقم العميل / الهاتف
              <input
                type="text"
                value={paymentPlanForm.customerPhone}
                onChange={(event) =>
                  setPaymentPlanForm((prev) => ({ ...prev, customerPhone: event.target.value }))
                }
                placeholder="بحث آخر فاتورة للعميل"
              />
            </label>
            <label>
              اسم العميل
              <input
                type="text"
                value={paymentPlanForm.customerName}
                onChange={(event) =>
                  setPaymentPlanForm((prev) => ({ ...prev, customerName: event.target.value }))
                }
                placeholder="يستخدم إذا لم توجد فاتورة"
              />
            </label>
            <label>
              إجمالي يدوي
              <input
                type="number"
                min={0}
                step={1}
                value={paymentPlanForm.totalAmount}
                onChange={(event) =>
                  setPaymentPlanForm((prev) => ({ ...prev, totalAmount: Number(event.target.value || 0) }))
                }
              />
            </label>
            <label>
              دفعة مقدمة
              <input
                type="number"
                min={0}
                step={1}
                value={paymentPlanForm.downPayment}
                onChange={(event) =>
                  setPaymentPlanForm((prev) => ({ ...prev, downPayment: Number(event.target.value || 0) }))
                }
              />
            </label>
            <label>
              عدد الأقساط
              <input
                type="number"
                min={1}
                max={120}
                step={1}
                value={paymentPlanForm.installmentCount}
                onChange={(event) =>
                  setPaymentPlanForm((prev) => ({ ...prev, installmentCount: Number(event.target.value || 1) }))
                }
              />
            </label>
            <label>
              أول استحقاق
              <input
                type="date"
                value={paymentPlanForm.firstDueDate}
                onChange={(event) =>
                  setPaymentPlanForm((prev) => ({ ...prev, firstDueDate: event.target.value }))
                }
              />
            </label>
            <label>
              ملاحظات
              <input
                type="text"
                value={paymentPlanForm.notes}
                onChange={(event) => setPaymentPlanForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
          </div>
          <button className="primary retail-section-submit" type="submit" disabled={submitting}>
            <i className="bx bx-credit-card"></i>
            {submitting ? "جارٍ الحفظ..." : "تسجيل خطة الدفع"}
          </button>
        </form>
      ) : null}

      <DataTable
        id="retail-payment-plans-table"
        rows={filteredPaymentPlans}
        columns={columns}
        getRowKey={(row) => row.id}
        selectable={false}
      />
    </TableSection>
  );
}
