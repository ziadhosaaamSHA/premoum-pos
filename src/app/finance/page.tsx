"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";
import { money, num2, todayISO } from "@/lib/format";
import InlineModal from "@/components/ui/InlineModal";
import RowActions from "@/components/ui/RowActions";
import TableDataActions from "@/components/ui/TableDataActions";

type ExpenseRow = {
  id: string;
  date: string;
  title: string;
  vendor: string;
  amount: number;
  notes: string | null;
  source: "manual" | "purchase";
  sourceId: string;
};

type RevenueRow = {
  key: string;
  period: string;
  source: string;
  total: number;
};

type ShiftRow = {
  key: string;
  shift: string;
  sales: number;
  orders: number;
  expense: number;
  net: number;
};

type FinancePayload = {
  kpis: {
    revenue: number;
    expenses: number;
    profit: number;
    cogs: number;
  };
  revenueRows: RevenueRow[];
  expenses: ExpenseRow[];
  profitInsights: {
    totalProfit: number;
    margin: number;
    bestCategoryName: string;
    bestCategoryMargin: number;
    expenseRatio: number;
  };
  shiftRows: ShiftRow[];
};

type ExpenseModalState = { mode: "view" | "edit" | "create"; id?: string } | null;

export default function FinancePage() {
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<FinancePayload | null>(null);

  const [activeTab, setActiveTab] = useState("revenue");
  const [searchRevenue, setSearchRevenue] = useState("");
  const [revenuePeriodFilter, setRevenuePeriodFilter] = useState("");
  const [searchExpenses, setSearchExpenses] = useState("");
  const [expenseAmountFilter, setExpenseAmountFilter] = useState("");
  const [expenseSourceFilter, setExpenseSourceFilter] = useState("");
  const [searchShift, setSearchShift] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");

  const [expenseModal, setExpenseModal] = useState<ExpenseModalState>(null);
  const [expenseForm, setExpenseForm] = useState({
    date: todayISO(),
    title: "",
    vendor: "",
    amount: 0,
    notes: "",
  });

  const handleError = useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof ApiError) {
        pushToast(error.message || fallback, "error");
        return;
      }
      pushToast(fallback, "error");
    },
    [pushToast]
  );

  const fetchFinance = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const payload = await apiRequest<FinancePayload>("/api/finance/bootstrap");
        setData(payload);
      } catch (error) {
        handleError(error, "تعذر تحميل بيانات المالية");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [handleError]
  );

  useEffect(() => {
    void fetchFinance(true);
  }, [fetchFinance]);

  const filteredExpenses = useMemo(() => {
    const rows = data?.expenses || [];
    const q = searchExpenses.trim().toLowerCase();

    return rows.filter((expense) => {
      const matchesSearch =
        !q ||
        expense.title.toLowerCase().includes(q) ||
        expense.vendor.toLowerCase().includes(q) ||
        expense.date.toLowerCase().includes(q);
      const matchesAmount =
        !expenseAmountFilter ||
        (expenseAmountFilter === "low" && expense.amount < 1000) ||
        (expenseAmountFilter === "high" && expense.amount >= 1000);
      const matchesSource = !expenseSourceFilter || expense.source === expenseSourceFilter;
      return matchesSearch && matchesAmount && matchesSource;
    });
  }, [data?.expenses, expenseAmountFilter, expenseSourceFilter, searchExpenses]);

  const filteredRevenueRows = useMemo(() => {
    const rows = data?.revenueRows || [];
    const q = searchRevenue.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch = !q || row.period.toLowerCase().includes(q) || row.source.toLowerCase().includes(q);
      const matchesPeriod = !revenuePeriodFilter || row.key === revenuePeriodFilter;
      return matchesSearch && matchesPeriod;
    });
  }, [data?.revenueRows, revenuePeriodFilter, searchRevenue]);

  const filteredShiftRows = useMemo(() => {
    const rows = data?.shiftRows || [];
    const q = searchShift.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch = !q || row.shift.toLowerCase().includes(q);
      const matchesShift = !shiftFilter || row.key === shiftFilter;
      return matchesSearch && matchesShift;
    });
  }, [data?.shiftRows, searchShift, shiftFilter]);

  const selectedExpense = expenseModal?.id
    ? data?.expenses.find((item) => item.id === expenseModal.id) || null
    : null;

  const openExpenseModal = (mode: "view" | "edit" | "create", expenseId?: string) => {
    if (mode === "create") {
      setExpenseForm({
        date: todayISO(),
        title: "",
        vendor: "",
        amount: 0,
        notes: "",
      });
      setExpenseModal({ mode: "create" });
      return;
    }

    const expense = data?.expenses.find((item) => item.id === expenseId);
    if (!expense) return;
    if (mode === "edit" && expense.source !== "manual") return;

    setExpenseForm({
      date: expense.date,
      title: expense.title,
      vendor: expense.vendor === "—" ? "" : expense.vendor,
      amount: expense.amount,
      notes: expense.notes || "",
    });
    setExpenseModal({ mode, id: expense.id });
  };

  const submitExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!expenseModal) return;

    setSubmitting(true);
    try {
      const payload = {
        date: expenseForm.date,
        title: expenseForm.title,
        vendor: expenseForm.vendor || null,
        amount: expenseForm.amount,
        notes: expenseForm.notes || null,
      };

      if (expenseModal.mode === "create") {
        await apiRequest<{ expense: ExpenseRow }>("/api/finance/expenses", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        pushToast("تمت إضافة المصروف", "success");
      } else if (expenseModal.mode === "edit" && expenseModal.id) {
        await apiRequest<{ expense: ExpenseRow }>(`/api/finance/expenses/${expenseModal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        pushToast("تم تحديث المصروف", "success");
      }

      setExpenseModal(null);
      await fetchFinance();
    } catch (error) {
      handleError(error, "تعذر حفظ المصروف");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      await apiRequest<{ deleted: boolean }>(`/api/finance/expenses/${expenseId}`, {
        method: "DELETE",
      });
      await fetchFinance();
    } catch (error) {
      handleError(error, "تعذر حذف المصروف");
      throw error;
    }
  };

  if (loading && !data) {
    return (
      <section className="page active">
        <div className="card wide">
          <p className="hint">جارٍ تحميل بيانات المالية...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page active">
      <section className="kpis">
        <div className="kpi">
          <span>الإيرادات</span>
          <strong>{money(data?.kpis.revenue || 0)}</strong>
          <small>إجمالي المبيعات</small>
        </div>
        <div className="kpi">
          <span>المصروفات</span>
          <strong>{money(data?.kpis.expenses || 0)}</strong>
          <small>تشغيلية وموارد بشرية</small>
        </div>
        <div className="kpi">
          <span>الأرباح</span>
          <strong>{money(data?.kpis.profit || 0)}</strong>
          <small>بعد خصم COGS</small>
        </div>
        <div className="kpi">
          <span>تكلفة البضاعة</span>
          <strong>{money(data?.kpis.cogs || 0)}</strong>
          <small>مأخوذة من الوصفات</small>
        </div>
      </section>

      <div className="subtabs">
        <button
          className={`subtab ${activeTab === "revenue" ? "active" : ""}`}
          onClick={() => setActiveTab("revenue")}
          type="button"
        >
          <i className="bx bx-trending-up"></i>
          الإيرادات
        </button>
        <button
          className={`subtab ${activeTab === "expenses" ? "active" : ""}`}
          onClick={() => setActiveTab("expenses")}
          type="button"
        >
          <i className="bx bx-receipt"></i>
          المصروفات
        </button>
        <button
          className={`subtab ${activeTab === "profit" ? "active" : ""}`}
          onClick={() => setActiveTab("profit")}
          type="button"
        >
          <i className="bx bx-line-chart"></i>
          الأرباح
        </button>
        <button
          className={`subtab ${activeTab === "shift" ? "active" : ""}`}
          onClick={() => setActiveTab("shift")}
          type="button"
        >
          <i className="bx bx-time"></i>
          تقرير الوردية اليومية
        </button>
      </div>

      {activeTab === "revenue" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>الإيرادات</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في الإيرادات..."
                    value={searchRevenue}
                    onChange={(event) => setSearchRevenue(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={revenuePeriodFilter}
                  onChange={(event) => setRevenuePeriodFilter(event.target.value)}
                >
                  <option value="">كل الفترات</option>
                  <option value="day">اليوم</option>
                  <option value="week">هذا الأسبوع</option>
                </select>
                <TableDataActions
                  rows={filteredRevenueRows}
                  columns={[
                    { label: "الفترة", value: (row) => row.period },
                    { label: "المصدر", value: (row) => row.source },
                    { label: "الإجمالي", value: (row) => row.total },
                  ]}
                  fileName="finance-revenue"
                  printTitle="الإيرادات"
                  tableId="finance-revenue-table"
                />
              </div>
            </div>
            <table id="finance-revenue-table">
              <thead>
                <tr>
                  <th>الفترة</th>
                  <th>المصدر</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {filteredRevenueRows.length === 0 ? (
                  <tr>
                    <td colSpan={3}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredRevenueRows.map((row) => (
                    <tr key={row.key}>
                      <td>{row.period}</td>
                      <td>{row.source}</td>
                      <td>{money(row.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "expenses" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>المصروفات</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في المصروفات..."
                    value={searchExpenses}
                    onChange={(event) => setSearchExpenses(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={expenseAmountFilter}
                  onChange={(event) => setExpenseAmountFilter(event.target.value)}
                >
                  <option value="">كل القيم</option>
                  <option value="low">أقل من 1000</option>
                  <option value="high">1000 فأكثر</option>
                </select>
                <select
                  className="select-filter"
                  value={expenseSourceFilter}
                  onChange={(event) => setExpenseSourceFilter(event.target.value)}
                >
                  <option value="">كل المصادر</option>
                  <option value="manual">مصروفات يدوية</option>
                  <option value="purchase">مشتريات مخزون</option>
                </select>
                <button className="primary" type="button" onClick={() => openExpenseModal("create")}
                >
                  <i className="bx bx-plus"></i>
                  إضافة مصروف
                </button>
                <TableDataActions
                  rows={filteredExpenses}
                  columns={[
                    { label: "التاريخ", value: (row) => row.date },
                    { label: "البند", value: (row) => row.title },
                    { label: "الجهة", value: (row) => row.vendor },
                    { label: "القيمة", value: (row) => row.amount },
                    { label: "المصدر", value: (row) => (row.source === "manual" ? "مصروف يدوي" : "مشتريات مخزون") },
                  ]}
                  fileName="finance-expenses"
                  printTitle="المصروفات"
                  tableId="finance-expenses-table"
                />
              </div>
            </div>
            <table id="finance-expenses-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>البند</th>
                  <th>الجهة</th>
                  <th>القيمة</th>
                  <th>المصدر</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{expense.date}</td>
                      <td>{expense.title}</td>
                      <td>{expense.vendor}</td>
                      <td>{money(expense.amount)}</td>
                      <td>
                        <span className={`badge ${expense.source === "manual" ? "ok" : "neutral"}`}>
                          {expense.source === "manual" ? "يدوي" : "مشتريات"}
                        </span>
                      </td>
                      <td>
                        {expense.source === "manual" ? (
                          <RowActions
                            onView={() => openExpenseModal("view", expense.id)}
                            onEdit={() => openExpenseModal("edit", expense.id)}
                            onDelete={() => deleteExpense(expense.id)}
                            deleteMessage="تم حذف المصروف"
                          />
                        ) : (
                          <RowActions onView={() => openExpenseModal("view", expense.id)} />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "profit" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <h2>تحليل الأرباح</h2>
            <div className="profit-panel">
              <div className="profit-card">
                <h3>إجمالي الربح</h3>
                <strong>{money(data?.profitInsights.totalProfit || 0)}</strong>
                <span className="hint">بعد خصم المصروفات و COGS</span>
              </div>
              <div className="profit-card">
                <h3>هامش الربح</h3>
                <strong>{num2(data?.profitInsights.margin || 0)}%</strong>
                <div className="progress-bar">
                  <span style={{ width: `${Math.min(100, data?.profitInsights.margin || 0)}%` }}></span>
                </div>
              </div>
              <div className="profit-card">
                <h3>أفضل فئة ربحية</h3>
                <strong>{data?.profitInsights.bestCategoryName || "—"}</strong>
                <span className="hint">متوسط هامش {num2(data?.profitInsights.bestCategoryMargin || 0)}%</span>
              </div>
              <div className="profit-card">
                <h3>نسبة المصروفات</h3>
                <strong>{num2(data?.profitInsights.expenseRatio || 0)}%</strong>
                <div className="progress-bar">
                  <span style={{ width: `${Math.min(100, data?.profitInsights.expenseRatio || 0)}%` }}></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "shift" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>تقرير الوردية اليومية</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في الورديات..."
                    value={searchShift}
                    onChange={(event) => setSearchShift(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={shiftFilter}
                  onChange={(event) => setShiftFilter(event.target.value)}
                >
                  <option value="">كل الورديات</option>
                  <option value="morning">صباحية</option>
                  <option value="evening">مسائية</option>
                </select>
                <TableDataActions
                  rows={filteredShiftRows}
                  columns={[
                    { label: "الوردية", value: (row) => row.shift },
                    { label: "المبيعات", value: (row) => row.sales },
                    { label: "عدد الطلبات", value: (row) => row.orders },
                    { label: "المصروفات", value: (row) => row.expense },
                    { label: "الصافي", value: (row) => row.net },
                  ]}
                  fileName="finance-shifts"
                  printTitle="تقرير الوردية اليومية"
                  tableId="finance-shifts-table"
                />
              </div>
            </div>
            <table id="finance-shifts-table">
              <thead>
                <tr>
                  <th>الوردية</th>
                  <th>المبيعات</th>
                  <th>عدد الطلبات</th>
                  <th>المصروفات</th>
                  <th>الصافي</th>
                </tr>
              </thead>
              <tbody>
                {filteredShiftRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredShiftRows.map((row) => (
                    <tr key={row.key}>
                      <td>{row.shift}</td>
                      <td>{money(row.sales)}</td>
                      <td>{row.orders}</td>
                      <td>{money(row.expense)}</td>
                      <td>{money(row.net)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InlineModal
        open={Boolean(expenseModal)}
        title={
          expenseModal?.mode === "create"
            ? "إضافة مصروف"
            : expenseModal?.mode === "edit"
              ? "تعديل مصروف"
              : "تفاصيل المصروف"
        }
        onClose={() => setExpenseModal(null)}
      >
        {expenseModal?.mode === "view" && selectedExpense ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>التاريخ</span>
                <strong>{selectedExpense.date}</strong>
              </div>
              <div className="row-line">
                <span>البند</span>
                <strong>{selectedExpense.title}</strong>
              </div>
              <div className="row-line">
                <span>الجهة</span>
                <strong>{selectedExpense.vendor}</strong>
              </div>
              <div className="row-line">
                <span>القيمة</span>
                <strong>{money(selectedExpense.amount)}</strong>
              </div>
              <div className="row-line">
                <span>ملاحظات</span>
                <strong>{selectedExpense.notes || "—"}</strong>
              </div>
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={submitExpense}>
            <label>التاريخ</label>
            <input
              type="date"
              value={expenseForm.date}
              onChange={(event) => setExpenseForm((prev) => ({ ...prev, date: event.target.value }))}
              required
            />
            <label>البند</label>
            <input
              type="text"
              value={expenseForm.title}
              onChange={(event) => setExpenseForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
            <label>الجهة</label>
            <input
              type="text"
              value={expenseForm.vendor}
              onChange={(event) => setExpenseForm((prev) => ({ ...prev, vendor: event.target.value }))}
            />
            <label>القيمة</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={expenseForm.amount}
              onChange={(event) => setExpenseForm((prev) => ({ ...prev, amount: Number(event.target.value || 0) }))}
              required
            />
            <label>ملاحظات</label>
            <textarea
              rows={3}
              value={expenseForm.notes}
              onChange={(event) => setExpenseForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : expenseModal?.mode === "create" ? "حفظ المصروف" : "حفظ التغييرات"}
            </button>
          </form>
        )}
      </InlineModal>
    </section>
  );
}
