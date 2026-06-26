"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";
import { isRetailMode, type BusinessMode } from "@/lib/businessMode";
import { todayISO } from "@/lib/format";
import { RetailPaymentPlanRow, RetailReturnExchangeRow, SaleRow } from "../types";

type SalesTab = "invoices" | "returns" | "payment_plans";

export function useSalesPage() {
  const { pushToast } = useToast();
  const { hasPermission, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [businessMode, setBusinessMode] = useState<BusinessMode>("cafe_restaurant");
  const [activeTab, setActiveTab] = useState<SalesTab>("invoices");
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [returnExchanges, setReturnExchanges] = useState<RetailReturnExchangeRow[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<RetailPaymentPlanRow[]>([]);
  const [searchSales, setSearchSales] = useState("");
  const [returnSearch, setReturnSearch] = useState("");
  const [paymentPlanSearch, setPaymentPlanSearch] = useState("");
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
    customerPhone: "",
    total: 0,
    itemsText: "",
  });
  const [returnForm, setReturnForm] = useState({
    invoiceNo: "",
    customerPhone: "",
    customerName: "",
    type: "return" as "return" | "exchange",
    reason: "",
    refundAmount: 0,
    exchangeAmount: 0,
    notes: "",
  });
  const [paymentPlanForm, setPaymentPlanForm] = useState({
    invoiceNo: "",
    customerPhone: "",
    customerName: "",
    totalAmount: 0,
    downPayment: 0,
    installmentCount: 3,
    firstDueDate: "",
    notes: "",
  });

  const canCreateSales = hasPermission("sales:manage");
  const canEditSales = hasPermission("sales:manage") || hasPermission("sales:edit");
  const isOwnerOrAdmin = Boolean(
    user && (user.isOwner || user.roles.some((role) => role.trim().toLowerCase() === "admin"))
  );
  const canDeleteSales = isOwnerOrAdmin;
  const canApproveSales = hasPermission("sales:manage") || hasPermission("sales:approve");
  const retailMode = isRetailMode(businessMode);

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
        const [data, setup] = await Promise.all([
          apiRequest<{ sales: SaleRow[] }>("/api/sales"),
          apiRequest<{ setup: { completedAt: string | null; businessMode: BusinessMode } }>("/api/system/setup"),
        ]);
        setSales(data.sales);
        const nextBusinessMode = setup.setup.businessMode || "cafe_restaurant";
        setBusinessMode(nextBusinessMode);
        if (isRetailMode(nextBusinessMode)) {
          const [returnData, paymentPlanData] = await Promise.all([
            apiRequest<{ returns: RetailReturnExchangeRow[] }>("/api/retail/returns"),
            apiRequest<{ paymentPlans: RetailPaymentPlanRow[] }>("/api/retail/payment-plans"),
          ]);
          setReturnExchanges(returnData.returns);
          setPaymentPlans(paymentPlanData.paymentPlans);
        } else {
          setReturnExchanges([]);
          setPaymentPlans([]);
          setActiveTab("invoices");
        }
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
        (sale.customerPhone || "").toLowerCase().includes(q) ||
        sale.date.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || sale.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [searchSales, sales, statusFilter]);

  const filteredReturnExchanges = useMemo(() => {
    const q = returnSearch.trim().toLowerCase();
    return returnExchanges.filter((entry) => {
      if (!q) return true;
      return (
        entry.code.toLowerCase().includes(q) ||
        entry.invoiceNo.toLowerCase().includes(q) ||
        entry.customer.toLowerCase().includes(q) ||
        (entry.customerPhone || "").toLowerCase().includes(q)
      );
    });
  }, [returnExchanges, returnSearch]);

  const filteredPaymentPlans = useMemo(() => {
    const q = paymentPlanSearch.trim().toLowerCase();
    return paymentPlans.filter((entry) => {
      if (!q) return true;
      return (
        entry.invoiceNo.toLowerCase().includes(q) ||
        entry.customer.toLowerCase().includes(q) ||
        (entry.customerPhone || "").toLowerCase().includes(q)
      );
    });
  }, [paymentPlans, paymentPlanSearch]);

  const selectedSale = selectedSaleId ? sales.find((sale) => sale.id === selectedSaleId) || null : null;
  const receiptSale = receiptSaleId ? sales.find((sale) => sale.id === receiptSaleId) || null : null;
  const deleteTargetSale = deleteSaleId ? sales.find((sale) => sale.id === deleteSaleId) || null : null;

  const resetSaleForm = useCallback(() => {
    setSaleForm({ date: todayISO(), customer: "", customerPhone: "", total: 0, itemsText: "" });
  }, []);

  const resetReturnForm = useCallback(() => {
    setReturnForm({
      invoiceNo: "",
      customerPhone: "",
      customerName: "",
      type: "return",
      reason: "",
      refundAmount: 0,
      exchangeAmount: 0,
      notes: "",
    });
  }, []);

  const resetPaymentPlanForm = useCallback(() => {
    setPaymentPlanForm({
      invoiceNo: "",
      customerPhone: "",
      customerName: "",
      totalAmount: 0,
      downPayment: 0,
      installmentCount: 3,
      firstDueDate: "",
      notes: "",
    });
  }, []);

  const startEdit = useCallback(
    (saleId: string) => {
      const sale = sales.find((item) => item.id === saleId);
      if (!sale) return;
      setSaleForm({
        date: sale.date,
        customer: sale.customer,
        customerPhone: sale.customerPhone || "",
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
            customerPhone: saleForm.customerPhone || null,
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
            customerPhone: saleForm.customerPhone || null,
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

  const handleReturnExchangeSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canCreateSales || !retailMode) return;
      setSubmitting(true);
      try {
        await apiRequest<{ returnExchange: RetailReturnExchangeRow }>("/api/retail/returns", {
          method: "POST",
          body: JSON.stringify({
            invoiceNo: returnForm.invoiceNo || undefined,
            customerPhone: returnForm.customerPhone || undefined,
            customerName: returnForm.customerName || undefined,
            type: returnForm.type,
            reason: returnForm.reason || null,
            refundAmount: returnForm.refundAmount,
            exchangeAmount: returnForm.exchangeAmount,
            notes: returnForm.notes || null,
          }),
        });
        resetReturnForm();
        await fetchSales();
        pushToast("تم تسجيل عملية الإرجاع/الاستبدال", "success");
      } catch (error) {
        handleError(error, "تعذر تسجيل عملية الإرجاع/الاستبدال");
      } finally {
        setSubmitting(false);
      }
    },
    [canCreateSales, fetchSales, handleError, pushToast, resetReturnForm, retailMode, returnForm]
  );

  const handlePaymentPlanSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canCreateSales || !retailMode) return;
      setSubmitting(true);
      try {
        await apiRequest<{ paymentPlan: RetailPaymentPlanRow }>("/api/retail/payment-plans", {
          method: "POST",
          body: JSON.stringify({
            invoiceNo: paymentPlanForm.invoiceNo || undefined,
            customerPhone: paymentPlanForm.customerPhone || undefined,
            customerName: paymentPlanForm.customerName || undefined,
            totalAmount: paymentPlanForm.totalAmount || undefined,
            downPayment: paymentPlanForm.downPayment,
            installmentCount: paymentPlanForm.installmentCount,
            firstDueDate: paymentPlanForm.firstDueDate || null,
            notes: paymentPlanForm.notes || null,
          }),
        });
        resetPaymentPlanForm();
        await fetchSales();
        pushToast("تم تسجيل خطة الدفع", "success");
      } catch (error) {
        handleError(error, "تعذر تسجيل خطة الدفع");
      } finally {
        setSubmitting(false);
      }
    },
    [canCreateSales, fetchSales, handleError, paymentPlanForm, pushToast, resetPaymentPlanForm, retailMode]
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
    activeTab,
    businessMode,
    canApproveSales,
    canCreateSales,
    canDeleteSales,
    canEditSales,
    createOpen,
    deleteSaleId,
    deleteTargetSale,
    editSaleId,
    filteredPaymentPlans,
    filteredReturnExchanges,
    filteredSales,
    handleCreateSubmit,
    handleEditSubmit,
    handlePaymentPlanSubmit,
    handleReturnExchangeSubmit,
    loading,
    openCreateModal,
    receiptSale,
    removeSale,
    removeSales,
    resetPaymentPlanForm,
    resetReturnForm,
    resetSaleForm,
    paymentPlanForm,
    paymentPlans,
    paymentPlanSearch,
    retailMode,
    returnExchanges,
    returnForm,
    returnSearch,
    saleForm,
    searchSales,
    selectedSale,
    setApproveSaleId,
    setCreateOpen,
    setDeleteSaleId,
    setEditSaleId,
    setActiveTab,
    setPaymentPlanForm,
    setPaymentPlanSearch,
    setReceiptSaleId,
    setReturnForm,
    setReturnSearch,
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
