"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";
import { money, translateStatus } from "@/lib/format";
import InlineModal from "@/components/ui/InlineModal";
import RowActions from "@/components/ui/RowActions";
import TableDataActions from "@/components/ui/TableDataActions";

type OrderStatusUi = "preparing" | "ready" | "out" | "delivered" | "cancelled";

type OrderRow = {
  id: string;
  code: string;
  type: "dine_in" | "takeaway" | "delivery";
  status: OrderStatusUi;
  customer: string;
  zoneId: string | null;
  zoneName: string | null;
  driverId: string | null;
  tableId: string | null;
  tableName: string | null;
  discount: number;
  payment: "cash" | "card" | "wallet" | "mixed";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: Array<{
    id: string;
    productId: string | null;
    name: string;
    qty: number;
    unitPrice: number;
    totalPrice: number;
  }>;
};

type TableRow = {
  id: string;
  name: string;
  number: number;
  status: "empty" | "occupied";
  orderId: string | null;
  activeOrder: {
    id: string;
    code: string;
    customer: string;
    status: OrderStatusUi;
  } | null;
};

type TableForm = {
  id: string;
  name: string;
  number: number;
  status: "empty" | "occupied";
  orderId: string;
};

const statusOptions = [
  { value: "", label: "كل الحالات" },
  { value: "preparing", label: "قيد التحضير" },
  { value: "ready", label: "جاهز" },
  { value: "out", label: "خارج للتوصيل" },
  { value: "delivered", label: "تم التسليم" },
  { value: "cancelled", label: "ملغي" },
];

const statusUpdateOptions: Array<{ value: OrderStatusUi; label: string }> = [
  { value: "preparing", label: "قيد التحضير" },
  { value: "ready", label: "جاهز" },
  { value: "out", label: "خارج للتوصيل" },
  { value: "delivered", label: "تم التسليم" },
  { value: "cancelled", label: "ملغي" },
];

function statusBadge(status: OrderStatusUi) {
  if (status === "delivered") return "ok";
  if (status === "cancelled") return "danger";
  if (status === "ready") return "neutral";
  return "warn";
}

export default function OrdersPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);

  const [activeTab, setActiveTab] = useState("tables");
  const [filterQuery, setFilterQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tableSearch, setTableSearch] = useState("");

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDeleteId, setOrderDeleteId] = useState<string | null>(null);

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableDeleteId, setTableDeleteId] = useState<string | null>(null);
  const [finishTableOrderId, setFinishTableOrderId] = useState<string | null>(null);
  const [tableSubmitting, setTableSubmitting] = useState(false);

  const [tableForm, setTableForm] = useState<TableForm>({
    id: "",
    name: "",
    number: 0,
    status: "empty",
    orderId: "",
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

  const loadData = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const [ordersPayload, tablesPayload] = await Promise.all([
          apiRequest<{ orders: OrderRow[] }>("/api/orders"),
          apiRequest<{ tables: TableRow[] }>("/api/tables"),
        ]);

        setOrders(ordersPayload.orders);
        setTables(tablesPayload.tables);
      } catch (error) {
        handleError(error, "تعذر تحميل الطلبات والطاولات");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [handleError]
  );

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  const filteredOrders = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesQuery =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.code.toLowerCase().includes(q) ||
        order.customer.toLowerCase().includes(q) ||
        order.type.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || order.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [filterQuery, orders, statusFilter]);

  const filteredTables = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((table) => {
      return (
        table.name.toLowerCase().includes(q) ||
        String(table.number).includes(q) ||
        table.id.toLowerCase().includes(q)
      );
    });
  }, [tableSearch, tables]);

  const currentOrders = filteredOrders.filter(
    (order) => order.status !== "delivered" && order.status !== "cancelled"
  );
  const historyOrders = filteredOrders.filter(
    (order) => order.status === "delivered" || order.status === "cancelled"
  );

  const selectedOrder = selectedOrderId
    ? orders.find((order) => order.id === selectedOrderId) || null
    : null;

  const selectedTable = selectedTableId
    ? tables.find((table) => table.id === selectedTableId) || null
    : null;

  const tableOrder = selectedTable?.orderId
    ? orders.find((order) => order.id === selectedTable.orderId) || null
    : null;

  const openTableModal = (table?: TableRow) => {
    if (table) {
      setTableForm({
        id: table.id,
        name: table.name,
        number: table.number,
        status: table.status,
        orderId: table.orderId || "",
      });
    } else {
      setTableForm({ id: "", name: "", number: 0, status: "empty", orderId: "" });
    }
    setTableModalOpen(true);
  };

  const handleTableSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTableSubmitting(true);

    try {
      if (tableForm.id) {
        await apiRequest<{ table: TableRow }>(`/api/tables/${tableForm.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: tableForm.name,
            number: Number(tableForm.number),
            status: tableForm.status,
            orderId: tableForm.status === "occupied" ? tableForm.orderId || null : null,
          }),
        });
        pushToast("تم تحديث بيانات الطاولة", "success");
      } else {
        const created = await apiRequest<{ table: TableRow }>("/api/tables", {
          method: "POST",
          body: JSON.stringify({
            name: tableForm.name,
            number: Number(tableForm.number),
          }),
        });

        if (tableForm.status === "occupied") {
          await apiRequest<{ table: TableRow }>(`/api/tables/${created.table.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              status: "occupied",
              orderId: tableForm.orderId || null,
            }),
          });
        }

        pushToast("تمت إضافة طاولة جديدة", "success");
      }

      setTableModalOpen(false);
      await loadData();
    } catch (error) {
      handleError(error, "تعذر حفظ بيانات الطاولة");
    } finally {
      setTableSubmitting(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await apiRequest<{ deleted: boolean }>(`/api/orders/${orderId}`, {
        method: "DELETE",
      });
      pushToast("تم حذف الطلب", "success");
      await loadData();
    } catch (error) {
      handleError(error, "تعذر حذف الطلب");
    }
  };

  const handleOrderStatusChange = async (orderId: string, status: OrderStatusUi) => {
    try {
      await apiRequest<{ order: OrderRow }>(`/api/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      pushToast("تم تحديث حالة الطلب", "success");
      await loadData();
    } catch (error) {
      handleError(error, "تعذر تحديث حالة الطلب");
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    try {
      await apiRequest<{ deleted: boolean }>(`/api/tables/${tableId}`, {
        method: "DELETE",
      });
      pushToast("تم حذف الطاولة", "success");
      await loadData();
    } catch (error) {
      handleError(error, "تعذر حذف الطاولة");
    }
  };

  const tableAssignableOrders = currentOrders.filter(
    (order) => !order.tableId || order.tableId === tableForm.id
  );

  return (
    <section className="page active">
      <div className="subtabs">
        <button className={`subtab ${activeTab === "tables" ? "active" : ""}`} onClick={() => setActiveTab("tables")} type="button">
          <i className="bx bx-table"></i>
          الطاولات
        </button>
        <button className={`subtab ${activeTab === "current" ? "active" : ""}`} onClick={() => setActiveTab("current")} type="button">
          <i className="bx bx-time-five"></i>
          الطلبات الحالية
        </button>
        <button className={`subtab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")} type="button">
          <i className="bx bx-archive"></i>
          سجل الطلبات
        </button>
        <button className={`subtab ${activeTab === "tracking" ? "active" : ""}`} onClick={() => setActiveTab("tracking")} type="button">
          <i className="bx bx-map"></i>
          متابعة الطلبات
        </button>
      </div>

      {loading ? (
        <div className="card wide">
          <p className="hint">جارٍ تحميل البيانات...</p>
        </div>
      ) : null}

      {!loading && activeTab === "tables" && (
        <div className="subtab-panel active">
          <div className="card">
            <div className="section-header-actions">
              <h2>خريطة الطاولات</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في الطاولات..."
                    value={tableSearch}
                    onChange={(event) => setTableSearch(event.target.value)}
                  />
                </div>
                <button className="primary" type="button" onClick={() => openTableModal()}>
                  <i className="bx bx-plus"></i>
                  إضافة طاولة
                </button>
                <TableDataActions
                  rows={filteredTables}
                  columns={[
                    { label: "الطاولة", value: (row) => row.name },
                    { label: "الرقم", value: (row) => row.number },
                    { label: "الحالة", value: (row) => (row.status === "occupied" ? "مشغولة" : "فارغة") },
                  ]}
                  fileName="orders-tables"
                  printTitle="الطاولات"
                />
              </div>
            </div>
            <div className="table-grid">
              {filteredTables.map((table) => (
                <button
                  key={table.id}
                  type="button"
                  className={`table-card ${table.status === "occupied" ? "occupied" : "empty"}`}
                  onClick={() => setSelectedTableId(table.id)}
                >
                  <i className="bx bx-table"></i>
                  <strong>{table.name}</strong>
                  <span>{table.status === "occupied" ? "مشغولة" : "فارغة"}</span>
                </button>
              ))}
            </div>
            {filteredTables.length === 0 ? <p className="hint">لا توجد طاولات مطابقة لبحثك.</p> : null}
          </div>
        </div>
      )}

      {!loading && activeTab === "current" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>الطلبات الحالية</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في الطلبات..."
                    value={filterQuery}
                    onChange={(event) => setFilterQuery(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <TableDataActions
                  rows={currentOrders}
                  columns={[
                    { label: "رقم الطلب", value: (row) => row.code },
                    { label: "النوع", value: (row) => translateStatus(row.type) },
                    { label: "العميل", value: (row) => row.customer },
                    { label: "الحالة", value: (row) => translateStatus(row.status) },
                    { label: "الإجمالي", value: (row) => row.total },
                  ]}
                  fileName="orders-current"
                  printTitle="الطلبات الحالية"
                  tableId="orders-current-table"
                />
              </div>
            </div>
            <table id="orders-current-table">
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>النوع</th>
                  <th>العميل</th>
                  <th>الحالة</th>
                  <th>الإجمالي</th>
                  <th>تحديث الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {currentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  currentOrders.map((order) => (
                    <tr key={order.id} className={`status-row ${order.status}`}>
                      <td>{order.code}</td>
                      <td>{translateStatus(order.type)}</td>
                      <td>{order.customer}</td>
                      <td>
                        <span className={`badge ${statusBadge(order.status)}`}>
                          {translateStatus(order.status)}
                        </span>
                      </td>
                      <td>{money(order.total)}</td>
                      <td>
                        <select
                          className="select-filter"
                          value={order.status}
                          onChange={(event) =>
                            void handleOrderStatusChange(order.id, event.target.value as OrderStatusUi)
                          }
                        >
                          {statusUpdateOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <RowActions
                          onView={() => setSelectedOrderId(order.id)}
                          onDelete={() => setOrderDeleteId(order.id)}
                          confirmDelete={false}
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

      {!loading && activeTab === "history" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>سجل الطلبات</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في السجل..."
                    value={filterQuery}
                    onChange={(event) => setFilterQuery(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <TableDataActions
                  rows={historyOrders}
                  columns={[
                    { label: "رقم الطلب", value: (row) => row.code },
                    { label: "التاريخ", value: (row) => new Date(row.createdAt).toLocaleDateString("ar-EG") },
                    { label: "النوع", value: (row) => translateStatus(row.type) },
                    { label: "الحالة", value: (row) => translateStatus(row.status) },
                    { label: "الإجمالي", value: (row) => row.total },
                  ]}
                  fileName="orders-history"
                  printTitle="سجل الطلبات"
                  tableId="orders-history-table"
                />
              </div>
            </div>
            <table id="orders-history-table">
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>التاريخ</th>
                  <th>النوع</th>
                  <th>الحالة</th>
                  <th>الإجمالي</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {historyOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  historyOrders.map((order) => (
                    <tr key={order.id} className={`status-row ${order.status}`}>
                      <td>{order.code}</td>
                      <td>{new Date(order.createdAt).toLocaleDateString("ar-EG")}</td>
                      <td>{translateStatus(order.type)}</td>
                      <td>
                        <span className={`badge ${statusBadge(order.status)}`}>
                          {translateStatus(order.status)}
                        </span>
                      </td>
                      <td>{money(order.total)}</td>
                      <td>
                        <RowActions
                          onView={() => setSelectedOrderId(order.id)}
                          onDelete={() => setOrderDeleteId(order.id)}
                          confirmDelete={false}
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

      {!loading && activeTab === "tracking" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>متابعة الطلبات</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث سريع..."
                    value={filterQuery}
                    onChange={(event) => setFilterQuery(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="tracking-board">
              {[
                { key: "preparing", title: "قيد التحضير" },
                { key: "ready", title: "جاهز" },
                { key: "out", title: "خارج للتوصيل" },
                { key: "delivered", title: "تم التسليم" },
              ].map((col) => {
                const items = filteredOrders.filter((order) => order.status === col.key);
                return (
                  <div key={col.key} className="tracking-column">
                    <h4>
                      {col.title} ({items.length})
                    </h4>
                    {items.length === 0 ? (
                      <div className="alert-empty">لا توجد طلبات</div>
                    ) : (
                      items.map((order) => (
                        <div key={order.id} className="tracking-card">
                          <strong>{order.code}</strong>
                          <span>
                            {translateStatus(order.type)} · {order.customer}
                          </span>
                          <span className={`status-pill ${col.key}`}>{translateStatus(order.status)}</span>
                          <select
                            className="select-filter"
                            value={order.status}
                            onChange={(event) =>
                              void handleOrderStatusChange(order.id, event.target.value as OrderStatusUi)
                            }
                          >
                            {statusUpdateOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <InlineModal open={Boolean(selectedOrder)} title="تفاصيل الطلب" onClose={() => setSelectedOrderId(null)}>
        {selectedOrder ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>رقم الطلب</span>
                <strong>{selectedOrder.code}</strong>
              </div>
              <div className="row-line">
                <span>العميل</span>
                <strong>{selectedOrder.customer}</strong>
              </div>
              <div className="row-line">
                <span>الحالة</span>
                <strong>{translateStatus(selectedOrder.status)}</strong>
              </div>
              <div className="row-line">
                <span>نوع الطلب</span>
                <strong>{translateStatus(selectedOrder.type)}</strong>
              </div>
              <div className="row-line">
                <span>طريقة الدفع</span>
                <strong>{translateStatus(selectedOrder.payment)}</strong>
              </div>
              <div className="row-line">
                <span>الإجمالي</span>
                <strong>{money(selectedOrder.total)}</strong>
              </div>
            </div>

            <table className="view-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>الكمية</th>
                  <th>سعر الوحدة</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.qty}</td>
                    <td>{money(item.unitPrice)}</td>
                    <td>{money(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </InlineModal>

      <InlineModal
        open={Boolean(orderDeleteId)}
        title="حذف الطلب"
        onClose={() => setOrderDeleteId(null)}
        footer={
          <>
            <button className="ghost" type="button" onClick={() => setOrderDeleteId(null)}>
              إلغاء
            </button>
            <button
              className="danger-btn"
              type="button"
              onClick={() => {
                if (!orderDeleteId) return;
                void (async () => {
                  await handleDeleteOrder(orderDeleteId);
                  setOrderDeleteId(null);
                })();
              }}
            >
              تأكيد الحذف
            </button>
          </>
        }
      >
        <div className="modal-body">
          <p>سيتم حذف الطلب نهائياً من القائمة.</p>
        </div>
      </InlineModal>

      <InlineModal open={tableModalOpen} title={tableForm.id ? "تعديل طاولة" : "إضافة طاولة"} onClose={() => setTableModalOpen(false)}>
        <form className="form" onSubmit={handleTableSubmit}>
          <label>اسم الطاولة</label>
          <input
            type="text"
            value={tableForm.name}
            onChange={(event) => setTableForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <label>رقم الطاولة</label>
          <input
            type="number"
            value={tableForm.number}
            onChange={(event) =>
              setTableForm((prev) => ({ ...prev, number: Number(event.target.value || 0) }))
            }
            required
          />
          <label>الحالة</label>
          <select
            value={tableForm.status}
            onChange={(event) =>
              setTableForm((prev) => ({ ...prev, status: event.target.value as "empty" | "occupied" }))
            }
          >
            <option value="empty">فارغة</option>
            <option value="occupied">مشغولة</option>
          </select>
          {tableForm.status === "occupied" && (
            <>
              <label>ربط بعملية</label>
              <select
                value={tableForm.orderId}
                onChange={(event) =>
                  setTableForm((prev) => ({ ...prev, orderId: event.target.value }))
                }
              >
                <option value="">بدون ربط</option>
                {tableAssignableOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.code} - {order.customer}
                  </option>
                ))}
              </select>
            </>
          )}
          <button className="primary" type="submit" disabled={tableSubmitting}>
            {tableSubmitting ? "جارٍ الحفظ..." : "حفظ البيانات"}
          </button>
        </form>
      </InlineModal>

      <InlineModal
        open={Boolean(tableDeleteId)}
        title="حذف الطاولة"
        onClose={() => setTableDeleteId(null)}
        footer={
          <>
            <button className="ghost" type="button" onClick={() => setTableDeleteId(null)}>
              إلغاء
            </button>
            <button
              className="danger-btn"
              type="button"
              onClick={() => {
                if (!tableDeleteId) return;
                void (async () => {
                  await handleDeleteTable(tableDeleteId);
                  setTableDeleteId(null);
                })();
              }}
            >
              تأكيد الحذف
            </button>
          </>
        }
      >
        <div className="modal-body">
          <p>سيتم حذف الطاولة بشكل نهائي.</p>
        </div>
      </InlineModal>

      <InlineModal open={Boolean(selectedTable)} title="تفاصيل الطاولة" onClose={() => setSelectedTableId(null)}>
        {selectedTable ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>الاسم</span>
                <strong>{selectedTable.name}</strong>
              </div>
              <div className="row-line">
                <span>رقم الطاولة</span>
                <strong>{selectedTable.number}</strong>
              </div>
              <div className="row-line">
                <span>الحالة</span>
                <strong>{selectedTable.status === "occupied" ? "مشغولة" : "فارغة"}</strong>
              </div>
              {selectedTable.status === "occupied" && tableOrder ? (
                <>
                  <div className="row-line">
                    <span>رقم الطلب</span>
                    <strong>{tableOrder.code}</strong>
                  </div>
                  <div className="row-line">
                    <span>العميل</span>
                    <strong>{tableOrder.customer}</strong>
                  </div>
                  <button
                    className="primary"
                    type="button"
                    onClick={() => {
                      setSelectedOrderId(tableOrder.id);
                      setSelectedTableId(null);
                    }}
                  >
                    عرض تفاصيل الطلب
                  </button>
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => {
                      setFinishTableOrderId(tableOrder.id);
                    }}
                  >
                    إنهاء الطاولة
                  </button>
                </>
              ) : (
                <p className="hint">هذه الطاولة فارغة حالياً.</p>
              )}
              <div className="row-actions">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => {
                    openTableModal(selectedTable);
                    setSelectedTableId(null);
                  }}
                >
                  تعديل الطاولة
                </button>
                <button
                  className="danger-btn"
                  type="button"
                  onClick={() => {
                    setTableDeleteId(selectedTable.id);
                    setSelectedTableId(null);
                  }}
                >
                  حذف الطاولة
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </InlineModal>

      <InlineModal
        open={Boolean(finishTableOrderId)}
        title="إنهاء الطاولة"
        onClose={() => setFinishTableOrderId(null)}
        footer={
          <>
            <button className="ghost" type="button" onClick={() => setFinishTableOrderId(null)}>
              إلغاء
            </button>
            <button
              className="primary"
              type="button"
              onClick={() => {
                if (!finishTableOrderId) return;
                void (async () => {
                  await handleOrderStatusChange(finishTableOrderId, "delivered");
                  setFinishTableOrderId(null);
                  setSelectedTableId(null);
                })();
              }}
            >
              إنهاء الطلب
            </button>
          </>
        }
      >
        <div className="modal-body">
          <p>سيتم إنهاء الطلب المرتبط بالطاولة وتحويله تلقائياً إلى المبيعات كفاتورة معتمدة.</p>
        </div>
      </InlineModal>
    </section>
  );
}
