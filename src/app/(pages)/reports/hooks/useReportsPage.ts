"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";
import { ReportModal, ReportsPayload, ReportsTab } from "../types";

export function useReportsPage() {
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportsPayload | null>(null);
  const [activeTab, setActiveTab] = useState<ReportsTab>("daily");
  const [dailySearch, setDailySearch] = useState("");
  const [dailyFilter, setDailyFilter] = useState("");
  const [monthlySearch, setMonthlySearch] = useState("");
  const [monthlyFilter, setMonthlyFilter] = useState("");
  const [profitSearch, setProfitSearch] = useState("");
  const [profitMarginFilter, setProfitMarginFilter] = useState("");
  const [shiftsSearch, setShiftsSearch] = useState("");
  const [shiftsFilter, setShiftsFilter] = useState("");
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState("");
  const [wasteSearch, setWasteSearch] = useState("");
  const [wasteCostFilter, setWasteCostFilter] = useState("");
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

  const openModal = useCallback((title: string, rows: { label: string; value: string }[]) => {
    setReportModal({ title, rows });
  }, []);

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

  const filteredPurchases = useMemo(() => {
    const rows = data?.purchases || [];
    const q = purchaseSearch.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.code.toLowerCase().includes(q) ||
        row.supplier.toLowerCase().includes(q) ||
        row.material.toLowerCase().includes(q) ||
        row.date.includes(q);
      const matchesStatus = !purchaseStatusFilter || row.status === purchaseStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.purchases, purchaseSearch, purchaseStatusFilter]);

  const filteredWaste = useMemo(() => {
    const rows = data?.wasteRows || [];
    const q = wasteSearch.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !q || row.material.toLowerCase().includes(q) || row.reason.toLowerCase().includes(q);
      const matchesCost =
        !wasteCostFilter ||
        (wasteCostFilter === "low" && row.cost < 100) ||
        (wasteCostFilter === "high" && row.cost >= 100);
      return matchesSearch && matchesCost;
    });
  }, [data?.wasteRows, wasteCostFilter, wasteSearch]);

  return {
    activeTab,
    dailyFilter,
    dailySearch,
    data,
    filteredDaily,
    filteredMonthly,
    filteredProfit,
    filteredPurchases,
    filteredShifts,
    filteredWaste,
    loading,
    monthlyFilter,
    monthlySearch,
    openModal,
    profitMarginFilter,
    profitSearch,
    purchaseSearch,
    purchaseStatusFilter,
    reportModal,
    setActiveTab,
    setDailyFilter,
    setDailySearch,
    setMonthlyFilter,
    setMonthlySearch,
    setProfitMarginFilter,
    setProfitSearch,
    setPurchaseSearch,
    setPurchaseStatusFilter,
    setReportModal,
    setShiftsFilter,
    setShiftsSearch,
    setWasteCostFilter,
    setWasteSearch,
    shiftsFilter,
    shiftsSearch,
    wasteCostFilter,
    wasteSearch,
  };
}

export type ReportsPageState = ReturnType<typeof useReportsPage>;
