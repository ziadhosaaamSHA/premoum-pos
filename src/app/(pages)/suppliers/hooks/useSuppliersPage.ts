import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";
import { SupplierModalState, SupplierRow } from "../types";

export function useSuppliersPage() {
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

  const submitSupplier = async (event: FormEvent<HTMLFormElement>) => {
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

  return {
    loading,
    submitting,
    suppliers,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    supplierModal,
    setSupplierModal,
    supplierForm,
    setSupplierForm,
    filtered,
    selectedSupplier,
    loadSuppliers,
    openSupplierModal,
    submitSupplier,
  };
}

export type SuppliersPageState = ReturnType<typeof useSuppliersPage>;
