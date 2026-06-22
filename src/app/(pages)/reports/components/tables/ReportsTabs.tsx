import { DataTableColumn, RowActions, Tabs } from "@/components/ui";
import { money, num2, translateStatus } from "@/lib/format";
import { ReportsPageState } from "../../hooks/useReportsPage";
import { DailyRow, MonthlyRow, ProfitRow, PurchaseRow, ReportsTab, ShiftRow, WasteRow } from "../../types";
import ReportTablePanel from "./ReportTablePanel";

const tabs = [
  { value: "daily", label: "مبيعات يومية", icon: "bx bx-calendar" },
  { value: "monthly", label: "مبيعات شهرية", icon: "bx bx-calendar-check" },
  { value: "profit", label: "تقرير الأرباح", icon: "bx bx-line-chart" },
  { value: "shifts", label: "تقارير الورديات", icon: "bx bx-time" },
  { value: "purchases", label: "مشتريات المخزون", icon: "bx bx-package" },
  { value: "waste", label: "الهدر", icon: "bx bx-recycle" },
] satisfies Array<{ value: ReportsTab; label: string; icon: string }>;

type ReportsTabsProps = {
  state: ReportsPageState;
};

export default function ReportsTabs({ state }: ReportsTabsProps) {
  const dailyColumns: DataTableColumn<DailyRow>[] = [
    { header: "اليوم", cell: (row) => row.day, exportValue: (row) => row.day },
    { header: "عدد الطلبات", cell: (row) => row.count, exportValue: (row) => row.count },
    { header: "الإجمالي", cell: (row) => money(row.total), exportValue: (row) => row.total },
    {
      header: "الإجراءات",
      cell: (row) => (
        <RowActions
          onView={() =>
            state.openModal("تفاصيل تقرير يومي", [
              { label: "اليوم", value: row.day },
              { label: "عدد الطلبات", value: String(row.count) },
              { label: "الإجمالي", value: money(row.total) },
            ])
          }
        />
      ),
    },
  ];

  const monthlyColumns: DataTableColumn<MonthlyRow>[] = [
    { header: "الشهر", cell: (row) => row.month, exportValue: (row) => row.month },
    { header: "الإجمالي", cell: (row) => money(row.total), exportValue: (row) => row.total },
    {
      header: "نسبة النمو",
      cell: (row) => (row.growth >= 0 ? `+${num2(row.growth)}%` : `${num2(row.growth)}%`),
      exportValue: (row) => `${num2(row.growth)}%`,
    },
    {
      header: "الإجراءات",
      cell: (row) => (
        <RowActions
          onView={() =>
            state.openModal("تفاصيل تقرير شهري", [
              { label: "الشهر", value: row.month },
              { label: "الإجمالي", value: money(row.total) },
              { label: "نسبة النمو", value: row.growth >= 0 ? `+${num2(row.growth)}%` : `${num2(row.growth)}%` },
            ])
          }
        />
      ),
    },
  ];

  const profitColumns: DataTableColumn<ProfitRow>[] = [
    { header: "الفئة", cell: (row) => row.name, exportValue: (row) => row.name },
    { header: "الإيرادات", cell: (row) => money(row.revenue), exportValue: (row) => row.revenue },
    { header: "COGS", cell: (row) => money(row.cogs), exportValue: (row) => row.cogs },
    { header: "الربح", cell: (row) => money(row.profit), exportValue: (row) => row.profit },
    {
      header: "الإجراءات",
      cell: (row) => (
        <RowActions
          onView={() =>
            state.openModal("تفاصيل أرباح الفئة", [
              { label: "الفئة", value: row.name },
              { label: "الإيرادات", value: money(row.revenue) },
              { label: "COGS", value: money(row.cogs) },
              { label: "الربح", value: money(row.profit) },
              { label: "هامش الربح", value: `${num2(row.margin)}%` },
            ])
          }
        />
      ),
    },
  ];

  const shiftColumns: DataTableColumn<ShiftRow>[] = [
    { header: "التاريخ", cell: (row) => row.date, exportValue: (row) => row.date },
    { header: "الوردية", cell: (row) => row.shift, exportValue: (row) => row.shift },
    { header: "المبيعات", cell: (row) => money(row.sales), exportValue: (row) => row.sales },
    { header: "الأرباح", cell: (row) => money(row.profit), exportValue: (row) => row.profit },
    {
      header: "الإجراءات",
      cell: (row) => (
        <RowActions
          onView={() =>
            state.openModal("تفاصيل الوردية", [
              { label: "التاريخ", value: row.date },
              { label: "الوردية", value: row.shift },
              { label: "المبيعات", value: money(row.sales) },
              { label: "الأرباح", value: money(row.profit) },
            ])
          }
        />
      ),
    },
  ];

  const purchaseColumns: DataTableColumn<PurchaseRow>[] = [
    { header: "الكود", cell: (row) => row.code, exportValue: (row) => row.code },
    { header: "المورد", cell: (row) => row.supplier, exportValue: (row) => row.supplier },
    { header: "الخامة", cell: (row) => row.material, exportValue: (row) => row.material },
    { header: "الكمية", cell: (row) => num2(row.quantity), exportValue: (row) => row.quantity },
    { header: "الإجمالي", cell: (row) => money(row.total), exportValue: (row) => row.total },
    {
      header: "الحالة",
      cell: (row) => (
        <span className={`badge ${row.status === "posted" ? "ok" : row.status === "draft" ? "warn" : "danger"}`}>
          {translateStatus(row.status)}
        </span>
      ),
      exportValue: (row) => translateStatus(row.status),
    },
    { header: "التاريخ", cell: (row) => row.date, exportValue: (row) => row.date },
  ];

  const wasteColumns: DataTableColumn<WasteRow>[] = [
    { header: "التاريخ", cell: (row) => row.date, exportValue: (row) => row.date },
    { header: "الخامة", cell: (row) => row.material, exportValue: (row) => row.material },
    { header: "الكمية", cell: (row) => `${num2(row.qty)} ${row.unit}`, exportValue: (row) => row.qty },
    { header: "التكلفة", cell: (row) => money(row.cost), exportValue: (row) => row.cost },
    { header: "السبب", cell: (row) => row.reason, exportValue: (row) => row.reason },
  ];

  return (
    <>
      <Tabs value={state.activeTab} items={tabs} onChange={state.setActiveTab} />
      {state.activeTab === "daily" ? (
        <ReportTablePanel
          title="مبيعات يومية"
          tableId="reports-daily-table"
          fileName="reports-daily"
          rows={state.filteredDaily}
          columns={dailyColumns}
          getRowKey={(row) => row.day}
          loading={state.loading && !state.data}
          search={{ value: state.dailySearch, onChange: state.setDailySearch, placeholder: "بحث في التقرير اليومي..." }}
          filters={[{ value: state.dailyFilter, onChange: state.setDailyFilter, options: [{ value: "", label: "كل الأيام" }, { value: "today", label: "اليوم" }, { value: "yesterday", label: "أمس" }] }]}
        />
      ) : null}
      {state.activeTab === "monthly" ? (
        <ReportTablePanel
          title="مبيعات شهرية"
          tableId="reports-monthly-table"
          fileName="reports-monthly"
          rows={state.filteredMonthly}
          columns={monthlyColumns}
          getRowKey={(row) => row.month}
          search={{ value: state.monthlySearch, onChange: state.setMonthlySearch, placeholder: "بحث في التقرير الشهري..." }}
          filters={[{ value: state.monthlyFilter, onChange: state.setMonthlyFilter, options: [{ value: "", label: "كل الشرائح" }, { value: "high", label: "مبيعات مرتفعة" }, { value: "medium", label: "مبيعات متوسطة" }] }]}
        />
      ) : null}
      {state.activeTab === "profit" ? (
        <ReportTablePanel
          title="تقرير الأرباح"
          tableId="reports-profit-table"
          fileName="reports-profit"
          rows={state.filteredProfit}
          columns={profitColumns}
          getRowKey={(row) => row.id}
          search={{ value: state.profitSearch, onChange: state.setProfitSearch, placeholder: "بحث في فئات الأرباح..." }}
          filters={[{ value: state.profitMarginFilter, onChange: state.setProfitMarginFilter, options: [{ value: "", label: "كل الهوامش" }, { value: "high", label: "هامش مرتفع" }, { value: "medium", label: "هامش متوسط" }, { value: "low", label: "هامش منخفض" }] }]}
        />
      ) : null}
      {state.activeTab === "shifts" ? (
        <ReportTablePanel
          title="تقارير الورديات"
          tableId="reports-shifts-table"
          fileName="reports-shifts"
          rows={state.filteredShifts}
          columns={shiftColumns}
          getRowKey={(row, index) => `${row.date}-${row.shift}-${index}`}
          search={{ value: state.shiftsSearch, onChange: state.setShiftsSearch, placeholder: "بحث في تقارير الورديات..." }}
          filters={[{ value: state.shiftsFilter, onChange: state.setShiftsFilter, options: [{ value: "", label: "كل الورديات" }, { value: "morning", label: "صباحية" }, { value: "evening", label: "مسائية" }] }]}
        />
      ) : null}
      {state.activeTab === "purchases" ? (
        <ReportTablePanel
          title="مشتريات المخزون"
          tableId="reports-purchases-table"
          fileName="reports-purchases"
          rows={state.filteredPurchases}
          columns={purchaseColumns}
          getRowKey={(row) => row.id}
          search={{ value: state.purchaseSearch, onChange: state.setPurchaseSearch, placeholder: "بحث في المشتريات..." }}
          filters={[{ value: state.purchaseStatusFilter, onChange: state.setPurchaseStatusFilter, options: [{ value: "", label: "كل الحالات" }, { value: "posted", label: "مرحلة" }, { value: "draft", label: "مسودة" }, { value: "cancelled", label: "ملغية" }] }]}
        />
      ) : null}
      {state.activeTab === "waste" ? (
        <ReportTablePanel
          title="الهدر"
          tableId="reports-waste-table"
          fileName="reports-waste"
          rows={state.filteredWaste}
          columns={wasteColumns}
          getRowKey={(row) => row.id}
          search={{ value: state.wasteSearch, onChange: state.setWasteSearch, placeholder: "بحث في الهدر..." }}
          filters={[{ value: state.wasteCostFilter, onChange: state.setWasteCostFilter, options: [{ value: "", label: "كل القيم" }, { value: "low", label: "أقل من 100" }, { value: "high", label: "100 فأكثر" }] }]}
        />
      ) : null}
    </>
  );
}
