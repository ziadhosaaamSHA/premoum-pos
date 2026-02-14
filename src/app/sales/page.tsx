"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { ApiError, apiRequest } from "@/lib/api";
import { money, todayISO } from "@/lib/format";
import { ReceiptSnapshot } from "@/lib/receipt";
import InlineModal from "@/components/ui/InlineModal";
import ReceiptPreview from "@/components/ui/ReceiptPreview";
import ReceiptModal from "@/components/ui/ReceiptModal";
import RowActions from "@/components/ui/RowActions";
import TableDataActions from "@/components/ui/TableDataActions";

type SaleItemRow = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
};

type SaleRow = {
  id: string;
  invoiceNo: string;
  date: string;
  customer: string;
  total: number;
  status: "draft" | "paid" | "void";
  items: string[];
  itemRows: SaleItemRow[];
  notes: string | null;
  orderId: string | null;
  orderCode: string | null;
  orderReceipt: ReceiptSnapshot | null;
  createdAt: string;
  updatedAt: string;
};

export default function SalesPage() {
  const { pushToast } = useToast();
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [searchSales, setSearchSales] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editSaleId, setEditSaleId] = useState<string | null>(null);
  const [approveSaleId, setApproveSaleId] = useState<string | null>(null);
  const [deleteSaleId, setDeleteSaleId] = useState<string | null>(null);
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [saleForm, setSaleForm] = useState({
    date: todayISO(),
    customer: "",
    total: 0,
    itemsText: "",
  });

  const canCreateSales = hasPermission("sales:manage");
  const canEditSales = hasPermission("sales:manage") || hasPermission("sales:edit");
  const canDeleteSales = hasPermission("sales:manage") || hasPermission("sales:delete");
  const canApproveSales = hasPermission("sales:manage") || hasPermission("sales:approve");

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

  const fetchSales = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const data = await apiRequest<{ sales: SaleRow[] }>("/api/sales");
        setSales(data.sales);
      } catch (error) {
        handleError(error, "تعذر تحميل المبيعات");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [handleError]
  );

  useEffect(() => {
    void fetchSales(true);
  }, [fetchSales]);

  const totals = useMemo(() => {
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const draftCount = sales.filter((sale) => sale.status === "draft").length;
    const paidCount = sales.filter((sale) => sale.status === "paid").length;
    return { totalRevenue, draftCount, paidCount };
  }, [sales]);

  const filteredSales = useMemo(() => {
    const q = searchSales.trim().toLowerCase();
    return sales.filter((sale) => {
      const matchesQuery =
        !q ||
        sale.invoiceNo.toLowerCase().includes(q) ||
        sale.customer.toLowerCase().includes(q) ||
        sale.date.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || sale.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [searchSales, sales, statusFilter]);

  const selectedSale = selectedSaleId
    ? sales.find((sale) => sale.id === selectedSaleId) || null
    : null;

  const receiptSale = receiptSaleId
    ? sales.find((sale) => sale.id === receiptSaleId) || null
    : null;

  const startEdit = (saleId: string) => {
    const sale = sales.find((item) => item.id === saleId);
    if (!sale) return;
    setSaleForm({
      date: sale.date,
      customer: sale.customer,
      total: sale.total,
      itemsText: sale.items.join("، "),
    });
    setEditSaleId(saleId);
  };

  const resetSaleForm = () => {
    setSaleForm({ date: todayISO(), customer: "", total: 0, itemsText: "" });
  };

  const extractItems = () => {
    const items = saleForm.itemsText
      .split(/[،,]/)
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? items : ["بدون عناصر"];
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreateSales) return;
    setSubmitting(true);
    try {
      await apiRequest<{ sale: SaleRow }>("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          date: saleForm.date,
          customerName: saleForm.customer,
          total: saleForm.total,
          status: "draft",
          items: extractItems(),
        }),
      });
      setCreateOpen(false);
      resetSaleForm();
      await fetchSales();
      pushToast("تمت إضافة فاتورة جديدة", "success");
    } catch (error) {
      handleError(error, "تعذر إضافة الفاتورة");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editSaleId) return;
    if (!canEditSales) return;

    setSubmitting(true);
    try {
      await apiRequest<{ sale: SaleRow }>(`/api/sales/${editSaleId}`, {
        method: "PATCH",
        body: JSON.stringify({
          date: saleForm.date,
          customerName: saleForm.customer,
          total: saleForm.total,
          items: extractItems(),
        }),
      });
      setEditSaleId(null);
      resetSaleForm();
      await fetchSales();
      pushToast("تم تحديث الفاتورة", "success");
    } catch (error) {
      handleError(error, "تعذر تحديث الفاتورة");
    } finally {
      setSubmitting(false);
    }
  };

  const approveSale = async (saleId: string) => {
    if (!canApproveSales) return;
    setSubmitting(true);
    try {
      await apiRequest<{ sale: SaleRow }>(`/api/sales/${saleId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "paid" }),
      });
      setApproveSaleId(null);
      await fetchSales();
      pushToast("تم اعتماد الفاتورة", "success");
    } catch (error) {
      handleError(error, "تعذر اعتماد الفاتورة");
    } finally {
      setSubmitting(false);
    }
  };

  const removeSale = async (saleId: string) => {
    if (!canDeleteSales) return;
    setSubmitting(true);
    try {
      await apiRequest<{ deleted: boolean }>(`/api/sales/${saleId}`, {
        method: "DELETE",
      });
      setDeleteSaleId(null);
      await fetchSales();
      pushToast("تم حذف الفاتورة", "success");
    } catch (error) {
      handleError(error, "تعذر حذف الفاتورة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page active">
      <div className="sales-insights">
        <div className="kpi">
          <span>إجمالي المبيعات</span>
          <strong>{money(totals.totalRevenue)}</strong>
          <small>قيمة الفواتير المسجلة</small>
        </div>
        <div className="kpi">
          <span>فواتير مدفوعة</span>
          <strong>{totals.paidCount}</strong>
          <small>تم تحصيلها بالكامل</small>
        </div>
        <div className="kpi">
          <span>فواتير مسودة</span>
          <strong>{totals.draftCount}</strong>
          <small>بانتظار الاعتماد</small>
        </div>
      </div>

      <div className="card wide">
        <div className="section-header-actions">
          <h2>فواتير المبيعات</h2>
          <div className="table-toolbar">
            <div className="search-bar-wrapper">
              <i className="bx bx-search"></i>
              <input
                type="text"
                className="table-search"
                placeholder="بحث في الفواتير..."
                value={searchSales}
                onChange={(event) => setSearchSales(event.target.value)}
              />
            </div>
            <select className="select-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">كل الحالات</option>
              <option value="paid">مدفوع</option>
              <option value="draft">مسودة</option>
            </select>
            {canCreateSales && (
              <button
                className="primary"
                type="button"
                onClick={() => {
                  resetSaleForm();
                  setCreateOpen(true);
                }}
              >
                <i className="bx bx-plus"></i>
                إضافة فاتورة
              </button>
            )}
            <TableDataActions
              rows={filteredSales}
              columns={[
                { label: "رقم الفاتورة", value: (row) => row.invoiceNo },
                { label: "التاريخ", value: (row) => row.date },
                { label: "العميل", value: (row) => row.customer },
                { label: "الإجمالي", value: (row) => row.total },
                { label: "الحالة", value: (row) => (row.status === "paid" ? "مدفوع" : "مسودة") },
              ]}
              fileName="sales-invoices"
              printTitle="فواتير المبيعات"
              tableId="sales-table"
            />
          </div>
        </div>

        {loading ? (
          <p className="hint">جارٍ تحميل الفواتير...</p>
        ) : (
          <table id="sales-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>التاريخ</th>
                <th>العميل</th>
                <th>الإجمالي</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6}>لا توجد بيانات</td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.invoiceNo}</td>
                    <td>{sale.date}</td>
                    <td>{sale.customer}</td>
                    <td>{money(sale.total)}</td>
                    <td>
                      <span className={`badge ${sale.status === "paid" ? "ok" : "warn"}`}>
                        {sale.status === "paid" ? "مدفوع" : "مسودة"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        {sale.status === "draft" && !sale.orderId && canApproveSales ? (
                          <button
                            className="action-btn approve"
                            type="button"
                            title="اعتماد الفاتورة"
                            onClick={() => setApproveSaleId(sale.id)}
                          >
                            <i className="bx bx-check-circle"></i>
                          </button>
                        ) : null}
                        <RowActions
                          onView={() => setSelectedSaleId(sale.id)}
                          onEdit={canEditSales ? () => startEdit(sale.id) : undefined}
                          onDelete={canDeleteSales ? () => setDeleteSaleId(sale.id) : undefined}
                          onPrint={sale.orderReceipt ? () => setReceiptSaleId(sale.id) : undefined}
                          printMessage="تم فتح إيصال الطلب"
                          disableEdit={!canEditSales || sale.status !== "draft" || Boolean(sale.orderId)}
                          disableDelete={!canDeleteSales || sale.status !== "draft" || Boolean(sale.orderId)}
                          confirmDelete={false}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <InlineModal
        open={createOpen}
        title="إضافة فاتورة"
        onClose={() => {
          setCreateOpen(false);
          resetSaleForm();
        }}
      >
        <form className="form" onSubmit={handleCreateSubmit}>
          <label>التاريخ</label>
          <input
            type="date"
            value={saleForm.date}
            onChange={(event) => setSaleForm((prev) => ({ ...prev, date: event.target.value }))}
            required
          />
          <label>اسم العميل</label>
          <input
            type="text"
            value={saleForm.customer}
            onChange={(event) => setSaleForm((prev) => ({ ...prev, customer: event.target.value }))}
            required
          />
          <label>الإجمالي</label>
          <input
            type="number"
            value={saleForm.total}
            onChange={(event) => setSaleForm((prev) => ({ ...prev, total: Number(event.target.value || 0) }))}
            required
          />
          <label>العناصر (مفصولة بفاصلة)</label>
          <input
            type="text"
            value={saleForm.itemsText}
            onChange={(event) => setSaleForm((prev) => ({ ...prev, itemsText: event.target.value }))}
            placeholder="مثال: عصير مانجو، مياه"
          />
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "حفظ الفاتورة"}
          </button>
        </form>
      </InlineModal>

      <InlineModal open={Boolean(selectedSale)} title="تفاصيل الفاتورة" onClose={() => setSelectedSaleId(null)}>
        {selectedSale ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>رقم الفاتورة</span>
                <strong>{selectedSale.invoiceNo}</strong>
              </div>
              <div className="row-line">
                <span>العميل</span>
                <strong>{selectedSale.customer}</strong>
              </div>
              <div className="row-line">
                <span>الإجمالي</span>
                <strong>{money(selectedSale.total)}</strong>
              </div>
              <div className="row-line">
                <span>الحالة</span>
                <strong>{selectedSale.status === "paid" ? "مدفوع" : "مسودة"}</strong>
              </div>
              {selectedSale.orderId ? (
                <div className="row-line">
                  <span>مصدر الفاتورة</span>
                  <strong>
                    مرتبطة بطلب {selectedSale.orderCode ? `(${selectedSale.orderCode})` : `(${selectedSale.orderId})`}
                  </strong>
                </div>
              ) : null}
            </div>
            {selectedSale.orderReceipt ? (
              <>
                <div style={{ marginTop: 12 }}>
                  <ReceiptPreview receipt={selectedSale.orderReceipt} />
                </div>
                <div className="row-actions" style={{ marginTop: 12 }}>
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => setReceiptSaleId(selectedSale.id)}
                  >
                    طباعة إيصال الطلب
                  </button>
                </div>
              </>
            ) : null}
            <div className="list" style={{ marginTop: 12 }}>
              {selectedSale.itemRows.map((item) => (
                <div key={item.id} className="row-line">
                  <span>{item.name}</span>
                  <strong>{item.qty}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </InlineModal>

      <InlineModal open={Boolean(editSaleId)} title="تعديل الفاتورة" onClose={() => setEditSaleId(null)}>
        <form className="form" onSubmit={handleEditSubmit}>
          <label>التاريخ</label>
          <input
            type="date"
            value={saleForm.date}
            onChange={(event) => setSaleForm((prev) => ({ ...prev, date: event.target.value }))}
            required
          />
          <label>اسم العميل</label>
          <input
            type="text"
            value={saleForm.customer}
            onChange={(event) => setSaleForm((prev) => ({ ...prev, customer: event.target.value }))}
            required
          />
          <label>الإجمالي</label>
          <input
            type="number"
            value={saleForm.total}
            onChange={(event) => setSaleForm((prev) => ({ ...prev, total: Number(event.target.value || 0) }))}
            required
          />
          <label>العناصر (مفصولة بفاصلة)</label>
          <input
            type="text"
            value={saleForm.itemsText}
            onChange={(event) => setSaleForm((prev) => ({ ...prev, itemsText: event.target.value }))}
          />
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </button>
        </form>
      </InlineModal>

      <InlineModal
        open={Boolean(approveSaleId)}
        title="اعتماد الفاتورة"
        onClose={() => setApproveSaleId(null)}
        footer={
          <>
            <button className="ghost" type="button" onClick={() => setApproveSaleId(null)}>
              إلغاء
            </button>
            <button
              className="primary"
              type="button"
              disabled={submitting}
              onClick={() => {
                if (!approveSaleId) return;
                void approveSale(approveSaleId);
              }}
            >
              تأكيد الاعتماد
            </button>
          </>
        }
      >
        <div className="modal-body">
          <p>سيتم تغيير حالة الفاتورة إلى مدفوعة.</p>
        </div>
      </InlineModal>

      <InlineModal
        open={Boolean(deleteSaleId)}
        title="حذف الفاتورة"
        onClose={() => setDeleteSaleId(null)}
        footer={
          <>
            <button className="ghost" type="button" onClick={() => setDeleteSaleId(null)}>
              إلغاء
            </button>
            <button
              className="danger-btn"
              type="button"
              disabled={submitting}
              onClick={() => {
                if (!deleteSaleId) return;
                void removeSale(deleteSaleId);
              }}
            >
              تأكيد الحذف
            </button>
          </>
        }
      >
        <div className="modal-body">
          <p>يمكن حذف الفواتير المسودة اليدوية فقط.</p>
        </div>
      </InlineModal>

      <ReceiptModal
        open={Boolean(receiptSale)}
        receipt={receiptSale?.orderReceipt ?? null}
        onClose={() => setReceiptSaleId(null)}
      />
    </section>
  );
}
