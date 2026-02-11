"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";
import { money, num2 } from "@/lib/format";
import InlineModal from "@/components/ui/InlineModal";
import RowActions from "@/components/ui/RowActions";
import TableDataActions from "@/components/ui/TableDataActions";

type ReportModal = {
  title: string;
  rows: { label: string; value: string }[];
} | null;

type DailyRow = {
  day: string;
  count: number;
  total: number;
};

type MonthlyRow = {
  month: string;
  total: number;
  growth: number;
};

type ProfitRow = {
  id: string;
  name: string;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
};

type ShiftRow = {
  date: string;
  shift: string;
  sales: number;
  profit: number;
};

type ReportsPayload = {
  insights: {
    todaySales: number;
    monthSales: number;
    wasteCost: number;
    inventoryValue: number;
  };
  dailyRows: DailyRow[];
  monthlyRows: MonthlyRow[];
  profitRows: ProfitRow[];
  shiftRows: ShiftRow[];
};

export default function ReportsPage() {
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportsPayload | null>(null);

  const [activeTab, setActiveTab] = useState("daily");
  const [dailySearch, setDailySearch] = useState("");
  const [dailyFilter, setDailyFilter] = useState("");
  const [monthlySearch, setMonthlySearch] = useState("");
  const [monthlyFilter, setMonthlyFilter] = useState("");
  const [profitSearch, setProfitSearch] = useState("");
  const [profitMarginFilter, setProfitMarginFilter] = useState("");
  const [shiftsSearch, setShiftsSearch] = useState("");
  const [shiftsFilter, setShiftsFilter] = useState("");

  const [reportModal, setReportModal] = useState<ReportModal>(null);

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

  const fetchReports = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const payload = await apiRequest<ReportsPayload>("/api/reports/bootstrap");
        setData(payload);
      } catch (error) {
        handleError(error, "تعذر تحميل التقارير");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [handleError]
  );

  useEffect(() => {
    void fetchReports(true);
  }, [fetchReports]);

  const openModal = (title: string, rows: { label: string; value: string }[]) => {
    setReportModal({ title, rows });
  };

  const filteredDaily = useMemo(() => {
    const rows = data?.dailyRows || [];
    const q = dailySearch.trim().toLowerCase();

    return rows.filter((row, index) => {
      const dayKey = index === 0 ? "today" : "yesterday";
      const matchesSearch = !q || row.day.toLowerCase().includes(q) || String(row.total).includes(q);
      const matchesFilter = !dailyFilter || dayKey === dailyFilter;
      return matchesSearch && matchesFilter;
    });
  }, [dailyFilter, dailySearch, data?.dailyRows]);

  const filteredMonthly = useMemo(() => {
    const rows = data?.monthlyRows || [];
    const q = monthlySearch.trim().toLowerCase();

    return rows.filter((row) => {
      const bucket = row.total >= 55_000 ? "high" : "medium";
      const matchesSearch = !q || row.month.toLowerCase().includes(q) || String(row.total).includes(q);
      const matchesFilter = !monthlyFilter || bucket === monthlyFilter;
      return matchesSearch && matchesFilter;
    });
  }, [data?.monthlyRows, monthlyFilter, monthlySearch]);

  const filteredProfit = useMemo(() => {
    const rows = data?.profitRows || [];
    const q = profitSearch.trim().toLowerCase();

    return rows.filter((row) => {
      const marginBand = row.margin >= 60 ? "high" : row.margin >= 50 ? "medium" : "low";
      const matchesSearch = !q || row.name.toLowerCase().includes(q);
      const matchesFilter = !profitMarginFilter || marginBand === profitMarginFilter;
      return matchesSearch && matchesFilter;
    });
  }, [data?.profitRows, profitMarginFilter, profitSearch]);

  const filteredShifts = useMemo(() => {
    const rows = data?.shiftRows || [];
    const q = shiftsSearch.trim().toLowerCase();

    return rows.filter((row) => {
      const shiftKey = row.shift === "صباحية" ? "morning" : "evening";
      const matchesSearch = !q || row.shift.toLowerCase().includes(q) || row.date.toLowerCase().includes(q);
      const matchesFilter = !shiftsFilter || shiftKey === shiftsFilter;
      return matchesSearch && matchesFilter;
    });
  }, [data?.shiftRows, shiftsFilter, shiftsSearch]);

  return (
    <section className="page active">
      <div className="report-grid">
        <div className="report-card">
          <h3>مبيعات اليوم</h3>
          <p>{money(data?.insights.todaySales || 0)}</p>
        </div>
        <div className="report-card">
          <h3>مبيعات شهرية</h3>
          <p>{money(data?.insights.monthSales || 0)}</p>
        </div>
        <div className="report-card">
          <h3>الهدر</h3>
          <p>{money(data?.insights.wasteCost || 0)}</p>
        </div>
        <div className="report-card">
          <h3>تقييم المخزون</h3>
          <p>{money(data?.insights.inventoryValue || 0)}</p>
        </div>
      </div>

      <div className="subtabs">
        <button className={`subtab ${activeTab === "daily" ? "active" : ""}`} onClick={() => setActiveTab("daily")} type="button">
          <i className="bx bx-calendar"></i>
          مبيعات يومية
        </button>
        <button className={`subtab ${activeTab === "monthly" ? "active" : ""}`} onClick={() => setActiveTab("monthly")} type="button">
          <i className="bx bx-calendar-check"></i>
          مبيعات شهرية
        </button>
        <button className={`subtab ${activeTab === "profit" ? "active" : ""}`} onClick={() => setActiveTab("profit")} type="button">
          <i className="bx bx-line-chart"></i>
          تقرير الأرباح
        </button>
        <button className={`subtab ${activeTab === "shifts" ? "active" : ""}`} onClick={() => setActiveTab("shifts")} type="button">
          <i className="bx bx-time"></i>
          تقارير الورديات
        </button>
      </div>

      {activeTab === "daily" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>مبيعات يومية</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في التقرير اليومي..."
                    value={dailySearch}
                    onChange={(event) => setDailySearch(event.target.value)}
                  />
                </div>
                <select className="select-filter" value={dailyFilter} onChange={(event) => setDailyFilter(event.target.value)}>
                  <option value="">كل الأيام</option>
                  <option value="today">اليوم</option>
                  <option value="yesterday">أمس</option>
                </select>
                <TableDataActions
                  rows={filteredDaily}
                  columns={[
                    { label: "اليوم", value: (row) => row.day },
                    { label: "عدد الطلبات", value: (row) => row.count },
                    { label: "الإجمالي", value: (row) => row.total },
                  ]}
                  fileName="reports-daily"
                  printTitle="المبيعات اليومية"
                  tableId="reports-daily-table"
                />
              </div>
            </div>
            {loading && !data ? (
              <p className="hint">جارٍ تحميل البيانات...</p>
            ) : (
              <table id="reports-daily-table">
                <thead>
                  <tr>
                    <th>اليوم</th>
                    <th>عدد الطلبات</th>
                    <th>الإجمالي</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDaily.length === 0 ? (
                    <tr>
                      <td colSpan={4}>لا توجد بيانات</td>
                    </tr>
                  ) : (
                    filteredDaily.map((row) => (
                      <tr key={row.day}>
                        <td>{row.day}</td>
                        <td>{row.count}</td>
                        <td>{money(row.total)}</td>
                        <td>
                          <RowActions
                            onView={() =>
                              openModal("تفاصيل تقرير يومي", [
                                { label: "اليوم", value: row.day },
                                { label: "عدد الطلبات", value: String(row.count) },
                                { label: "الإجمالي", value: money(row.total) },
                              ])
                            }
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === "monthly" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>مبيعات شهرية</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في التقرير الشهري..."
                    value={monthlySearch}
                    onChange={(event) => setMonthlySearch(event.target.value)}
                  />
                </div>
                <select className="select-filter" value={monthlyFilter} onChange={(event) => setMonthlyFilter(event.target.value)}>
                  <option value="">كل الشرائح</option>
                  <option value="high">مبيعات مرتفعة</option>
                  <option value="medium">مبيعات متوسطة</option>
                </select>
                <TableDataActions
                  rows={filteredMonthly}
                  columns={[
                    { label: "الشهر", value: (row) => row.month },
                    { label: "الإجمالي", value: (row) => row.total },
                    { label: "النمو", value: (row) => `${num2(row.growth)}%` },
                  ]}
                  fileName="reports-monthly"
                  printTitle="المبيعات الشهرية"
                  tableId="reports-monthly-table"
                />
              </div>
            </div>
            <table id="reports-monthly-table">
              <thead>
                <tr>
                  <th>الشهر</th>
                  <th>الإجمالي</th>
                  <th>نسبة النمو</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredMonthly.length === 0 ? (
                  <tr>
                    <td colSpan={4}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredMonthly.map((row) => (
                    <tr key={row.month}>
                      <td>{row.month}</td>
                      <td>{money(row.total)}</td>
                      <td>{row.growth >= 0 ? `+${num2(row.growth)}%` : `${num2(row.growth)}%`}</td>
                      <td>
                        <RowActions
                          onView={() =>
                            openModal("تفاصيل تقرير شهري", [
                              { label: "الشهر", value: row.month },
                              { label: "الإجمالي", value: money(row.total) },
                              {
                                label: "نسبة النمو",
                                value: row.growth >= 0 ? `+${num2(row.growth)}%` : `${num2(row.growth)}%`,
                              },
                            ])
                          }
                        />
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
            <div className="section-header-actions">
              <h2>تقرير الأرباح</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في فئات الأرباح..."
                    value={profitSearch}
                    onChange={(event) => setProfitSearch(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={profitMarginFilter}
                  onChange={(event) => setProfitMarginFilter(event.target.value)}
                >
                  <option value="">كل الهوامش</option>
                  <option value="high">هامش مرتفع</option>
                  <option value="medium">هامش متوسط</option>
                  <option value="low">هامش منخفض</option>
                </select>
                <TableDataActions
                  rows={filteredProfit}
                  columns={[
                    { label: "الفئة", value: (row) => row.name },
                    { label: "الإيرادات", value: (row) => row.revenue },
                    { label: "COGS", value: (row) => row.cogs },
                    { label: "الربح", value: (row) => row.profit },
                    { label: "الهامش", value: (row) => `${num2(row.margin)}%` },
                  ]}
                  fileName="reports-profit"
                  printTitle="تقرير الأرباح"
                  tableId="reports-profit-table"
                />
              </div>
            </div>
            <table id="reports-profit-table">
              <thead>
                <tr>
                  <th>الفئة</th>
                  <th>الإيرادات</th>
                  <th>COGS</th>
                  <th>الربح</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfit.length === 0 ? (
                  <tr>
                    <td colSpan={5}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredProfit.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{money(row.revenue)}</td>
                      <td>{money(row.cogs)}</td>
                      <td>{money(row.profit)}</td>
                      <td>
                        <RowActions
                          onView={() =>
                            openModal("تفاصيل أرباح الفئة", [
                              { label: "الفئة", value: row.name },
                              { label: "الإيرادات", value: money(row.revenue) },
                              { label: "COGS", value: money(row.cogs) },
                              { label: "الربح", value: money(row.profit) },
                              { label: "هامش الربح", value: `${num2(row.margin)}%` },
                            ])
                          }
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "shifts" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>تقارير الورديات</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في تقارير الورديات..."
                    value={shiftsSearch}
                    onChange={(event) => setShiftsSearch(event.target.value)}
                  />
                </div>
                <select className="select-filter" value={shiftsFilter} onChange={(event) => setShiftsFilter(event.target.value)}>
                  <option value="">كل الورديات</option>
                  <option value="morning">صباحية</option>
                  <option value="evening">مسائية</option>
                </select>
                <TableDataActions
                  rows={filteredShifts}
                  columns={[
                    { label: "التاريخ", value: (row) => row.date },
                    { label: "الوردية", value: (row) => row.shift },
                    { label: "المبيعات", value: (row) => row.sales },
                    { label: "الربح", value: (row) => row.profit },
                  ]}
                  fileName="reports-shifts"
                  printTitle="تقارير الورديات"
                  tableId="reports-shifts-table"
                />
              </div>
            </div>
            <table id="reports-shifts-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الوردية</th>
                  <th>المبيعات</th>
                  <th>الأرباح</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredShifts.length === 0 ? (
                  <tr>
                    <td colSpan={5}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredShifts.map((row, index) => (
                    <tr key={`${row.date}-${row.shift}-${index}`}>
                      <td>{row.date}</td>
                      <td>{row.shift}</td>
                      <td>{money(row.sales)}</td>
                      <td>{money(row.profit)}</td>
                      <td>
                        <RowActions
                          onView={() =>
                            openModal("تفاصيل الوردية", [
                              { label: "التاريخ", value: row.date },
                              { label: "الوردية", value: row.shift },
                              { label: "المبيعات", value: money(row.sales) },
                              { label: "الأرباح", value: money(row.profit) },
                            ])
                          }
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InlineModal open={Boolean(reportModal)} title={reportModal?.title || "عرض التقرير"} onClose={() => setReportModal(null)}>
        {reportModal ? (
          <div className="modal-body">
            <div className="list">
              {reportModal.rows.map((row) => (
                <div key={row.label} className="row-line">
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </InlineModal>
    </section>
  );
}
