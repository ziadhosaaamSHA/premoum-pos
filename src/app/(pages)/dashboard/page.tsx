"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";
import { money, num2 } from "@/lib/format";
import TableDataActions from "@/components/ui/TableDataActions";

type DashboardAlert = {
  id: string;
  type: string;
  title: string;
  message: string;
};

type LiveOrderRow = {
  id: string;
  code: string;
  type: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  status: "PREPARING" | "READY" | "OUT" | "DELIVERED" | "CANCELLED";
  customer: string;
  total: number;
  createdAt: string;
};

type TopProductRow = {
  id: string;
  name: string;
  qty: number;
};

type DashboardResponse = {
  kpis: {
    todaySales: number;
    monthSales: number;
    revenue: number;
    expenses: number;
    cogs: number;
    profit: number;
  };
  alerts: DashboardAlert[];
  liveOrders: LiveOrderRow[];
  shiftSummary: {
    ordersCount: number;
    averageTicket: number;
    deliveryOrders: number;
    wasteRate: number;
  };
  topProducts: TopProductRow[];
};

function orderTypeLabel(value: LiveOrderRow["type"]) {
  if (value === "DINE_IN") return "صالة";
  if (value === "TAKEAWAY") return "تيك أواي";
  return "توصيل";
}

function orderStatusLabel(value: LiveOrderRow["status"]) {
  if (value === "PREPARING") return "قيد التحضير";
  if (value === "READY") return "جاهز";
  if (value === "OUT") return "خارج للتوصيل";
  if (value === "DELIVERED") return "تم التسليم";
  return "ملغي";
}

function orderStatusClass(value: LiveOrderRow["status"]) {
  if (value === "READY" || value === "DELIVERED") return "ok";
  if (value === "CANCELLED") return "danger";
  return "warn";
}

export default function DashboardPage() {
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [searchLiveOrders, setSearchLiveOrders] = useState("");
  const [liveStatusFilter, setLiveStatusFilter] = useState("");

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

  const fetchDashboard = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const payload = await apiRequest<DashboardResponse>("/api/dashboard/overview");
        setData(payload);
      } catch (error) {
        handleError(error, "تعذر تحميل بيانات لوحة التحكم");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [handleError]
  );

  useEffect(() => {
    void fetchDashboard(true);
  }, [fetchDashboard]);

  const filteredLiveOrders = useMemo(() => {
    const rows = data?.liveOrders || [];
    const q = searchLiveOrders.trim().toLowerCase();

    return rows.filter((order) => {
      const matchesSearch =
        !q ||
        order.code.toLowerCase().includes(q) ||
        order.customer.toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q);
      const matchesStatus = !liveStatusFilter || order.status === liveStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.liveOrders, liveStatusFilter, searchLiveOrders]);

  if (loading && !data) {
    return (
      <section className="page active">
        <div className="card wide">
          <p className="hint">جارٍ تحميل لوحة التحكم...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page active">
      <section className="kpis kpis-3">
        <div className="kpi">
          <span>مبيعات اليوم</span>
          <strong>{money(data?.kpis.todaySales || 0)}</strong>
          <small>إجمالي العمليات اليوم</small>
        </div>
        <div className="kpi">
          <span>مبيعات الشهر</span>
          <strong>{money(data?.kpis.monthSales || 0)}</strong>
          <small>من بداية الشهر الحالي</small>
        </div>
        <div className="kpi">
          <span>الإيرادات</span>
          <strong>{money(data?.kpis.revenue || 0)}</strong>
          <small>قبل المصروفات</small>
        </div>
        <div className="kpi">
          <span>المصروفات</span>
          <strong>{money(data?.kpis.expenses || 0)}</strong>
          <small>تشغيلية وموارد بشرية</small>
        </div>
        <div className="kpi">
          <span>تكلفة البضاعة (COGS)</span>
          <strong>{money(data?.kpis.cogs || 0)}</strong>
          <small>محسوبة من الوصفات</small>
        </div>
        <div className="kpi">
          <span>الأرباح</span>
          <strong>{money(data?.kpis.profit || 0)}</strong>
          <small>بعد خصم المصروفات و COGS</small>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>تنبيهات ذكية</h2>
          <div className="alerts-grid">
            {!data || data.alerts.length === 0 ? (
              <div className="alert-empty">لا توجد تنبيهات حالياً</div>
            ) : (
              data.alerts.map((alert) => (
                <div key={alert.id} className={`alert-card ${alert.type}`}>
                  <div className="alert-icon">
                    <i className="bx bx-bell"></i>
                  </div>
                  <div className="alert-content">
                    <strong>{alert.title}</strong>
                    <p>{alert.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="section-header-actions">
            <h2>الطلبات الجارية</h2>
            <div className="table-toolbar">
              <div className="search-bar-wrapper">
                <i className="bx bx-search"></i>
                <input
                  type="text"
                  className="table-search"
                  placeholder="بحث في الطلبات..."
                  value={searchLiveOrders}
                  onChange={(event) => setSearchLiveOrders(event.target.value)}
                />
              </div>
              <select className="select-filter" value={liveStatusFilter} onChange={(event) => setLiveStatusFilter(event.target.value)}>
                <option value="">كل الحالات</option>
                <option value="PREPARING">قيد التحضير</option>
                <option value="READY">جاهز</option>
                <option value="OUT">خارج للتوصيل</option>
              </select>
              <TableDataActions
                rows={filteredLiveOrders}
                columns={[
                  { label: "الرقم", value: (row) => row.code },
                  { label: "النوع", value: (row) => orderTypeLabel(row.type) },
                  { label: "الحالة", value: (row) => orderStatusLabel(row.status) },
                  { label: "الإجمالي", value: (row) => row.total },
                ]}
                fileName="dashboard-live-orders"
                printTitle="الطلبات الجارية"
                tableId="dashboard-live-orders-table"
              />
            </div>
          </div>
          <table id="dashboard-live-orders-table">
            <thead>
              <tr>
                <th>الرقم</th>
                <th>النوع</th>
                <th>الحالة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {filteredLiveOrders.length === 0 ? (
                <tr>
                  <td colSpan={4}>لا توجد طلبات حالية</td>
                </tr>
              ) : (
                filteredLiveOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.code}</td>
                    <td>{orderTypeLabel(order.type)}</td>
                    <td>
                      <span className={`badge ${orderStatusClass(order.status)}`}>{orderStatusLabel(order.status)}</span>
                    </td>
                    <td>{money(order.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>ملخص الوردية</h2>
          <div className="list">
            <div className="row-line">
              <span>عدد الطلبات</span>
              <strong>{data?.shiftSummary.ordersCount || 0}</strong>
            </div>
            <div className="row-line">
              <span>متوسط التذكرة</span>
              <strong>{money(data?.shiftSummary.averageTicket || 0)}</strong>
            </div>
            <div className="row-line">
              <span>طلبات التوصيل</span>
              <strong>{data?.shiftSummary.deliveryOrders || 0}</strong>
            </div>
            <div className="row-line">
              <span>نسبة الهدر</span>
              <strong>{num2(data?.shiftSummary.wasteRate || 0)}%</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>أفضل المنتجات مبيعًا</h2>
          <div className="list">
            {(data?.topProducts || []).length === 0 ? (
              <div className="row-line">
                <span>لا توجد بيانات</span>
                <strong>—</strong>
              </div>
            ) : (
              data?.topProducts.map((item) => (
                <div key={item.id} className="row-line">
                  <span>{item.name}</span>
                  <strong>{item.qty} طلب</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
