"use client";

import { useCallback, useMemo, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";

const typeFilters = [
  { value: "all", label: "الكل" },
  { value: "low_stock", label: "مخزون منخفض" },
  { value: "warning", label: "تحذيرات" },
  { value: "info", label: "معلومات" },
];

export default function NotificationsPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const {
    alertsLoading,
    lastUpdatedAt,
    visibleAlerts,
    unreadCount,
    refresh,
    markAllViewed,
    clearAll,
    dismiss,
  } = useNotifications({ stream: true, pollIntervalMs: 60_000 });

  const formatAlertTime = useCallback((value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("ar-EG", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const formatTimeShort = useCallback((value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  }, []);

  const filteredAlerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleAlerts.filter((alert) => {
      const matchesType = typeFilter === "all" || alert.type === typeFilter;
      const matchesQuery =
        !q ||
        alert.title.toLowerCase().includes(q) ||
        alert.message.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [search, typeFilter, visibleAlerts]);

  const stats = useMemo(() => {
    const lowStockCount = visibleAlerts.filter((alert) => alert.type === "low_stock").length;
    const warningCount = visibleAlerts.filter((alert) => alert.type === "warning").length;
    return {
      total: visibleAlerts.length,
      unread: unreadCount,
      lowStock: lowStockCount,
      warnings: warningCount,
    };
  }, [unreadCount, visibleAlerts]);

  const alertIcon = useCallback((type: "low_stock" | "warning" | "info") => {
    if (type === "low_stock") return "bx bx-line-chart-down";
    if (type === "warning") return "bx bx-error";
    return "bx bx-info-circle";
  }, []);

  return (
    <div className="page notification-page">
      <div className="section-header-actions">
        <div>
          <h2>مركز التنبيهات</h2>
          <p className="muted">تابع تنبيهات المخزون والطلبات والمبيعات في مكان واحد.</p>
        </div>
        <div className="notification-toolbar">
          <div className="search-bar-wrapper">
            <i className="bx bx-search"></i>
            <input
              className="table-search"
              placeholder="ابحث داخل التنبيهات..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="notif-actions">
            <button className="notif-action-btn" type="button" onClick={() => void refresh(true)}>
              تحديث
            </button>
            <button
              className="notif-action-btn"
              type="button"
              onClick={markAllViewed}
              disabled={unreadCount === 0}
            >
              تعليم كمقروء
            </button>
            <button
              className="notif-action-btn danger"
              type="button"
              onClick={clearAll}
              disabled={visibleAlerts.length === 0}
            >
              مسح الكل
            </button>
          </div>
        </div>
      </div>

      <div className="kpis kpis-3">
        <div className="kpi">
          <span>إجمالي التنبيهات</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="kpi">
          <span>غير مقروءة</span>
          <strong>{stats.unread}</strong>
        </div>
        <div className="kpi">
          <span>مخزون منخفض</span>
          <strong>{stats.lowStock}</strong>
        </div>
      </div>

      <div className="notif-meta">
        {lastUpdatedAt ? `آخر تحديث ${formatTimeShort(lastUpdatedAt)}` : "—"}
      </div>

      <div className="subtabs">
        {typeFilters.map((filter) => (
          <button
            key={filter.value}
            className={`subtab ${typeFilter === filter.value ? "active" : ""}`}
            type="button"
            onClick={() => setTypeFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="notification-list">
        {alertsLoading ? (
          <div className="alert-empty">جاري تحديث التنبيهات...</div>
        ) : filteredAlerts.length === 0 ? (
          <div className="alert-empty">لا توجد تنبيهات مطابقة</div>
        ) : (
          filteredAlerts.map((alert) => (
            <div key={alert.id} className={`alert-card ${alert.type}`}>
              <div className="alert-icon">
                <i className={alertIcon(alert.type)}></i>
              </div>
              <div className="alert-content">
                <div className="alert-title-row">
                  <strong>{alert.title}</strong>
                  {alert.createdAt ? <span className="alert-time">{formatAlertTime(alert.createdAt)}</span> : null}
                </div>
                <p>{alert.message}</p>
              </div>
              <button
                className="alert-dismiss"
                type="button"
                title="إخفاء التنبيه"
                onClick={() => dismiss(alert.id)}
              >
                <i className="bx bx-x"></i>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
