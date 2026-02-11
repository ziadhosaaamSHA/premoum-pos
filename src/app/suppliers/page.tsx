"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";
import { translateStatus } from "@/lib/format";
import InlineModal from "@/components/ui/InlineModal";
import RowActions from "@/components/ui/RowActions";
import TableDataActions from "@/components/ui/TableDataActions";

type SupplierRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
  purchasesCount: number;
  createdAt: string;
  updatedAt: string;
};

type SupplierModalState = { mode: "view" | "edit" | "create"; id?: string } | null;

export default function SuppliersPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [supplierModal, setSupplierModal] = useState<SupplierModalState>(null);
  const [supplierForm, setSupplierForm] = useState<{
    name: string;
    phone: string;
    email: string;
    status: "active" | "inactive";
  }>({
    name: "",
    phone: "",
    email: "",
    status: "active",
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

  const loadSuppliers = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const data = await apiRequest<{ suppliers: SupplierRow[] }>("/api/suppliers");
        setSuppliers(data.suppliers);
      } catch (error) {
        handleError(error, "تعذر تحميل الموردين");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [handleError]
  );

  useEffect(() => {
    void loadSuppliers(true);
  }, [loadSuppliers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesSearch =
        !q ||
        supplier.name.toLowerCase().includes(q) ||
        supplier.phone.includes(q) ||
        supplier.email.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || supplier.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, suppliers]);

  const selectedSupplier = supplierModal?.id
    ? suppliers.find((item) => item.id === supplierModal.id) || null
    : null;

  const openSupplierModal = (mode: "view" | "edit" | "create", id?: string) => {
    if (mode === "create") {
      setSupplierForm({ name: "", phone: "", email: "", status: "active" });
      setSupplierModal({ mode: "create" });
      return;
    }

    const supplier = suppliers.find((item) => item.id === id);
    if (!supplier) return;

    setSupplierForm({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      status: supplier.status,
    });
    setSupplierModal({ mode, id: supplier.id });
  };

  const submitSupplier = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supplierModal) return;

    setSubmitting(true);
    try {
      if (supplierModal.mode === "create") {
        await apiRequest<{ supplier: SupplierRow }>("/api/suppliers", {
          method: "POST",
          body: JSON.stringify(supplierForm),
        });
        pushToast("تمت إضافة المورد", "success");
      } else if (supplierModal.id) {
        await apiRequest<{ supplier: SupplierRow }>(`/api/suppliers/${supplierModal.id}`, {
          method: "PATCH",
          body: JSON.stringify(supplierForm),
        });
        pushToast("تم تحديث المورد", "success");
      }
      setSupplierModal(null);
      await loadSuppliers();
    } catch (error) {
      handleError(error, "تعذر حفظ بيانات المورد");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page active">
      <div className="card wide">
        <div className="section-header-actions">
          <h2>الموردون</h2>
          <div className="table-toolbar">
            <div className="search-bar-wrapper">
              <i className="bx bx-search"></i>
              <input
                type="text"
                className="table-search"
                placeholder="بحث في الموردين..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select className="select-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
            <button className="primary" type="button" onClick={() => openSupplierModal("create")}>
              <i className="bx bx-plus"></i>
              مورد جديد
            </button>
            <TableDataActions
              rows={filtered}
              columns={[
                { label: "المورد", value: (row) => row.name },
                { label: "الهاتف", value: (row) => row.phone || "—" },
                { label: "البريد", value: (row) => row.email || "—" },
                { label: "الحالة", value: (row) => translateStatus(row.status) },
                { label: "عدد المشتريات", value: (row) => row.purchasesCount },
              ]}
              fileName="suppliers"
              printTitle="الموردون"
              tableId="suppliers-table"
            />
          </div>
        </div>

        {loading ? (
          <p className="hint">جارٍ تحميل الموردين...</p>
        ) : (
          <table id="suppliers-table">
            <thead>
              <tr>
                <th>المورد</th>
                <th>الهاتف</th>
                <th>البريد</th>
                <th>الحالة</th>
                <th>عدد المشتريات</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>لا توجد بيانات</td>
                </tr>
              ) : (
                filtered.map((supplier) => (
                  <tr key={supplier.id} data-status={supplier.status}>
                    <td>{supplier.name}</td>
                    <td>{supplier.phone || "—"}</td>
                    <td>{supplier.email || "—"}</td>
                    <td>
                      <span className={`badge ${supplier.status === "active" ? "ok" : "neutral"}`}>
                        {translateStatus(supplier.status)}
                      </span>
                    </td>
                    <td>{supplier.purchasesCount}</td>
                    <td>
                      <RowActions
                        onView={() => openSupplierModal("view", supplier.id)}
                        onEdit={() => openSupplierModal("edit", supplier.id)}
                        onDelete={async () => {
                          await apiRequest<{ deleted: boolean; mode: string }>(`/api/suppliers/${supplier.id}`, {
                            method: "DELETE",
                          });
                          await loadSuppliers();
                        }}
                        confirmDeleteText="سيتم حذف المورد أو تعطيله تلقائياً إذا كان مرتبطاً بمشتريات. متابعة؟"
                        deleteMessage="تم تنفيذ إجراء حذف المورد"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <InlineModal
        open={Boolean(supplierModal)}
        title={
          supplierModal?.mode === "create"
            ? "إضافة مورد"
            : supplierModal?.mode === "edit"
              ? "تعديل المورد"
              : "تفاصيل المورد"
        }
        onClose={() => setSupplierModal(null)}
      >
        {supplierModal?.mode === "view" && selectedSupplier ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>الاسم</span>
                <strong>{selectedSupplier.name}</strong>
              </div>
              <div className="row-line">
                <span>الهاتف</span>
                <strong>{selectedSupplier.phone || "—"}</strong>
              </div>
              <div className="row-line">
                <span>البريد</span>
                <strong>{selectedSupplier.email || "—"}</strong>
              </div>
              <div className="row-line">
                <span>الحالة</span>
                <strong>{translateStatus(selectedSupplier.status)}</strong>
              </div>
              <div className="row-line">
                <span>عدد المشتريات</span>
                <strong>{selectedSupplier.purchasesCount}</strong>
              </div>
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={submitSupplier}>
            <label>اسم المورد</label>
            <input
              type="text"
              value={supplierForm.name}
              onChange={(event) => setSupplierForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <label>الهاتف</label>
            <input
              type="text"
              value={supplierForm.phone}
              onChange={(event) => setSupplierForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <label>البريد الإلكتروني</label>
            <input
              type="email"
              value={supplierForm.email}
              onChange={(event) => setSupplierForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <label>الحالة</label>
            <select
              value={supplierForm.status}
              onChange={(event) =>
                setSupplierForm((prev) => ({ ...prev, status: event.target.value as "active" | "inactive" }))
              }
            >
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
          </form>
        )}
      </InlineModal>
    </section>
  );
}
