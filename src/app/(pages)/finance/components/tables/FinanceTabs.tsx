import { Card, DataTable, DataTableColumn, getExportColumns, TableSection, Tabs } from "@/components/ui";
import { money, num2 } from "@/lib/format";
import { FinancePageState } from "../../hooks/useFinancePage";
import { ExpenseRow, FinanceTab, RevenueRow, ShiftRow } from "../../types";

const tabs = [
  { value: "revenue", label: "الإيرادات", icon: "bx bx-trending-up" },
  { value: "expenses", label: "المصروفات", icon: "bx bx-receipt" },
  { value: "profit", label: "الأرباح", icon: "bx bx-line-chart" },
  { value: "shift", label: "تقرير الوردية اليومية", icon: "bx bx-time" },
] satisfies Array<{ value: FinanceTab; label: string; icon: string }>;

type FinanceTabsProps = {
  state: FinancePageState;
};

export default function FinanceTabs({ state }: FinanceTabsProps) {
  const revenueColumns: DataTableColumn<RevenueRow>[] = [
    { header: "الفترة", cell: (row) => row.period, exportValue: (row) => row.period },
    { header: "المصدر", cell: (row) => row.source, exportValue: (row) => row.source },
    { header: "الإجمالي", cell: (row) => money(row.total), exportValue: (row) => row.total },
  ];

  const expenseColumns: DataTableColumn<ExpenseRow>[] = [
    { header: "التاريخ", cell: (row) => row.date, exportValue: (row) => row.date },
    { header: "البند", cell: (row) => row.title, exportValue: (row) => row.title },
    { header: "الجهة", cell: (row) => row.vendor, exportValue: (row) => row.vendor },
    { header: "القيمة", cell: (row) => money(row.amount), exportValue: (row) => row.amount },
    {
      header: "المصدر",
      cell: (row) => <span className={`badge ${row.source === "manual" ? "ok" : "neutral"}`}>{row.source === "manual" ? "يدوي" : "مشتريات"}</span>,
      exportValue: (row) => (row.source === "manual" ? "مصروف يدوي" : "مشتريات مخزون"),
    },
  ];

  const shiftColumns: DataTableColumn<ShiftRow>[] = [
    { header: "الوردية", cell: (row) => row.shift, exportValue: (row) => row.shift },
    { header: "المبيعات", cell: (row) => money(row.sales), exportValue: (row) => row.sales },
    { header: "عدد الطلبات", cell: (row) => row.orders, exportValue: (row) => row.orders },
    { header: "المصروفات", cell: (row) => money(row.expense), exportValue: (row) => row.expense },
    { header: "الصافي", cell: (row) => money(row.net), exportValue: (row) => row.net },
  ];

  return (
    <>
      <Tabs value={state.activeTab} items={tabs} onChange={state.setActiveTab} />
      {state.activeTab === "revenue" ? (
        <TableSection
          title="الإيرادات"
          search={{ value: state.searchRevenue, onChange: state.setSearchRevenue, placeholder: "بحث في الإيرادات..." }}
          filters={[{ value: state.revenuePeriodFilter, onChange: state.setRevenuePeriodFilter, options: [{ value: "", label: "كل الفترات" }, { value: "day", label: "اليوم" }, { value: "week", label: "هذا الأسبوع" }] }]}
          exportActions={{ rows: state.filteredRevenueRows, columns: getExportColumns(revenueColumns), fileName: "finance-revenue", printTitle: "الإيرادات", tableId: "finance-revenue-table" }}
        >
          <DataTable id="finance-revenue-table" rows={state.filteredRevenueRows} columns={revenueColumns} getRowKey={(row) => row.key} />
        </TableSection>
      ) : null}
      {state.activeTab === "expenses" ? (
        <TableSection
          title="المصروفات"
          search={{ value: state.searchExpenses, onChange: state.setSearchExpenses, placeholder: "بحث في المصروفات..." }}
          filters={[
            { value: state.expenseAmountFilter, onChange: state.setExpenseAmountFilter, options: [{ value: "", label: "كل القيم" }, { value: "low", label: "أقل من 1000" }, { value: "high", label: "1000 فأكثر" }] },
            { value: state.expenseSourceFilter, onChange: state.setExpenseSourceFilter, options: [{ value: "", label: "كل المصادر" }, { value: "manual", label: "مصروفات يدوية" }, { value: "purchase", label: "مشتريات مخزون" }] },
          ]}
          primaryAction={{ label: "إضافة مصروف", icon: "bx bx-plus", onClick: () => state.openExpenseModal("create") }}
          exportActions={{ rows: state.filteredExpenses, columns: getExportColumns(expenseColumns), fileName: "finance-expenses", printTitle: "المصروفات", tableId: "finance-expenses-table" }}
        >
          <DataTable
            id="finance-expenses-table"
            rows={state.filteredExpenses}
            columns={expenseColumns}
            getRowKey={(expense) => expense.id}
            actions={(expense) =>
              expense.source === "manual"
                ? {
                    onView: () => state.openExpenseModal("view", expense.id),
                    onEdit: () => state.openExpenseModal("edit", expense.id),
                    onDelete: () => state.deleteExpense(expense.id),
                    deleteMessage: "تم حذف المصروف",
                  }
                : { onView: () => state.openExpenseModal("view", expense.id) }
            }
          />
        </TableSection>
      ) : null}
      {state.activeTab === "profit" ? (
        <div className="subtab-panel active">
          <Card wide>
            <h2>تحليل الأرباح</h2>
            <div className="profit-panel">
              <div className="profit-card">
                <h3>إجمالي الربح</h3>
                <strong>{money(state.data?.profitInsights.totalProfit || 0)}</strong>
                <span className="hint">بعد خصم المصروفات و COGS</span>
              </div>
              <div className="profit-card">
                <h3>هامش الربح</h3>
                <strong>{num2(state.data?.profitInsights.margin || 0)}%</strong>
                <div className="progress-bar">
                  <span style={{ width: `${Math.min(100, state.data?.profitInsights.margin || 0)}%` }}></span>
                </div>
              </div>
              <div className="profit-card">
                <h3>أفضل فئة ربحية</h3>
                <strong>{state.data?.profitInsights.bestCategoryName || "—"}</strong>
                <span className="hint">متوسط هامش {num2(state.data?.profitInsights.bestCategoryMargin || 0)}%</span>
              </div>
              <div className="profit-card">
                <h3>نسبة المصروفات</h3>
                <strong>{num2(state.data?.profitInsights.expenseRatio || 0)}%</strong>
                <div className="progress-bar">
                  <span style={{ width: `${Math.min(100, state.data?.profitInsights.expenseRatio || 0)}%` }}></span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
      {state.activeTab === "shift" ? (
        <TableSection
          title="تقرير الوردية اليومية"
          search={{ value: state.searchShift, onChange: state.setSearchShift, placeholder: "بحث في الورديات..." }}
          filters={[{ value: state.shiftFilter, onChange: state.setShiftFilter, options: [{ value: "", label: "كل الورديات" }, { value: "morning", label: "صباحية" }, { value: "evening", label: "مسائية" }] }]}
          exportActions={{ rows: state.filteredShiftRows, columns: getExportColumns(shiftColumns), fileName: "finance-shifts", printTitle: "تقرير الوردية اليومية", tableId: "finance-shifts-table" }}
        >
          <DataTable id="finance-shifts-table" rows={state.filteredShiftRows} columns={shiftColumns} getRowKey={(row) => row.key} />
        </TableSection>
      ) : null}
    </>
  );
}
