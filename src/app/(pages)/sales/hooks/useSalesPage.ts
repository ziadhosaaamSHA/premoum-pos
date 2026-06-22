"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";
import { todayISO } from "@/lib/format";
import { SaleRow } from "../types";

export function useSalesPage() {
  const { pushToast } = useToast();
  const { hasPermission, user } = useAuth();

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
  const isOwnerOrAdmin = Boolean(
    user && (user.isOwner || user.roles.some((role) => role.trim().toLowerCase() === "admin"))
  );
  const canDeleteSales = isOwnerOrAdmin;
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
    const included = sales.filter((sale) => sale.status !== "void");
    const totalRevenue = included.reduce((sum, sale) => sum + sale.total, 0);
    const draftCount = included.filter((sale) => sale.status === "draft").length;
    const paidCount = included.filter((sale) => sale.status === "paid").length;
    const voidCount = sales.filter((sale) => sale.status === "void").length;
    return { totalRevenue, draftCount, paidCount, voidCount };
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

  const selectedSale = selectedSaleId ? sales.find((sale) => sale.id === selectedSaleId) || null : null;
  const receiptSale = receiptSaleId ? sales.find((sale) => sale.id === receiptSaleId) || null : null;
  const deleteTargetSale = deleteSaleId ? sales.find((sale) => sale.id === deleteSaleId) || null : null;

  const resetSaleForm = useCallback(() => {
    setSaleForm({ date: todayISO(), customer: "", total: 0, itemsText: "" });
  }, []);

  const startEdit = useCallback(
    (saleId: string) => {
      const sale = sales.find((item) => item.id === saleId);
      if (!sale) return;
      setSaleForm({
        date: sale.date,
        customer: sale.customer,
        total: sale.total,
        itemsText: sale.items.join("، "),
      });
      setEditSaleId(saleId);
    },
    [sales]
  );

  const extractItems = useCallback(() => {
    const items = saleForm.itemsText
      .split(/[،,]/)
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? items : ["بدون عناصر"];
  }, [saleForm.itemsText]);

  const handleCreateSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
    },
    [canCreateSales, extractItems, fetchSales, handleError, pushToast, resetSaleForm, saleForm]
  );

  const handleEditSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!editSaleId || !canEditSales) return;

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
    },
    [canEditSales, editSaleId, extractItems, fetchSales, handleError, pushToast, resetSaleForm, saleForm]
  );

  const approveSale = useCallback(
    async (saleId: string) => {
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
    },
    [canApproveSales, fetchSales, handleError, pushToast]
  );

  const removeSale = useCallback(
    async (saleId: string) => {
      if (!canDeleteSales) return;
      setSubmitting(true);
      try {
        const result = await apiRequest<{ deleted: boolean; mode: "soft" | "hard" }>(`/api/sales/${saleId}`, {
          method: "DELETE",
        });
        setDeleteSaleId(null);
        await fetchSales();
        pushToast(
          result.mode === "soft"
            ? "تم تعليم الفاتورة كمحذوفة واستبعادها من الحسابات"
            : "تم حذف الفاتورة نهائياً من النظام",
          "success"
        );
      } catch (error) {
        handleError(error, "تعذر حذف الفاتورة");
      } finally {
        setSubmitting(false);
      }
    },
    [canDeleteSales, fetchSales, handleError, pushToast]
  );

  const removeSales = useCallback(
    async (saleIds: string[]) => {
      if (!canDeleteSales) return;
      setSubmitting(true);
      try {
        await Promise.all(
          saleIds.map((saleId) =>
            apiRequest<{ deleted: boolean; mode: "soft" | "hard" }>(`/api/sales/${saleId}`, {
              method: "DELETE",
            })
          )
        );
        await fetchSales();
      } catch (error) {
        handleError(error, "تعذر حذف الفواتير المحددة");
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [canDeleteSales, fetchSales, handleError]
  );

  const openCreateModal = useCallback(() => {
    resetSaleForm();
    setCreateOpen(true);
  }, [resetSaleForm]);

  return {
    approveSale,
    approveSaleId,
    canApproveSales,
    canCreateSales,
    canDeleteSales,
    canEditSales,
    createOpen,
    deleteSaleId,
    deleteTargetSale,
    editSaleId,
    filteredSales,
    handleCreateSubmit,
    handleEditSubmit,
    loading,
    openCreateModal,
    receiptSale,
    removeSale,
    removeSales,
    resetSaleForm,
    saleForm,
    searchSales,
    selectedSale,
    setApproveSaleId,
    setCreateOpen,
    setDeleteSaleId,
    setEditSaleId,
    setReceiptSaleId,
    setSaleForm,
    setSearchSales,
    setSelectedSaleId,
    setStatusFilter,
    startEdit,
    statusFilter,
    submitting,
    totals,
  };
}

export type SalesPageState = ReturnType<typeof useSalesPage>;
