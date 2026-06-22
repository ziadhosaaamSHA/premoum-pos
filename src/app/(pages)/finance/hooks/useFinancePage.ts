"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";
import { todayISO } from "@/lib/format";
import { ExpenseModalState, ExpenseRow, FinancePayload, FinanceTab } from "../types";

export function useFinancePage() {
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<FinancePayload | null>(null);
  const [activeTab, setActiveTab] = useState<FinanceTab>("revenue");
  const [searchRevenue, setSearchRevenue] = useState("");
  const [revenuePeriodFilter, setRevenuePeriodFilter] = useState("");
  const [searchExpenses, setSearchExpenses] = useState("");
  const [expenseAmountFilter, setExpenseAmountFilter] = useState("");
  const [expenseSourceFilter, setExpenseSourceFilter] = useState("");
  const [searchShift, setSearchShift] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [expenseModal, setExpenseModal] = useState<ExpenseModalState>(null);
  const [expenseForm, setExpenseForm] = useState({
    date: todayISO(),
    title: "",
    vendor: "",
    amount: 0,
    notes: "",
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

  const fetchFinance = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const payload = await apiRequest<FinancePayload>("/api/finance/bootstrap");
        setData(payload);
      } catch (error) {
        handleError(error, "تعذر تحميل بيانات المالية");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [handleError]
  );

  useEffect(() => {
    void fetchFinance(true);
  }, [fetchFinance]);

  const filteredExpenses = useMemo(() => {
    const rows = data?.expenses || [];
    const q = searchExpenses.trim().toLowerCase();
    return rows.filter((expense) => {
      const matchesSearch =
        !q ||
        expense.title.toLowerCase().includes(q) ||
        expense.vendor.toLowerCase().includes(q) ||
        expense.date.toLowerCase().includes(q);
      const matchesAmount =
        !expenseAmountFilter ||
        (expenseAmountFilter === "low" && expense.amount < 1000) ||
        (expenseAmountFilter === "high" && expense.amount >= 1000);
      const matchesSource = !expenseSourceFilter || expense.source === expenseSourceFilter;
      return matchesSearch && matchesAmount && matchesSource;
    });
  }, [data?.expenses, expenseAmountFilter, expenseSourceFilter, searchExpenses]);

  const filteredRevenueRows = useMemo(() => {
    const rows = data?.revenueRows || [];
    const q = searchRevenue.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !q || row.period.toLowerCase().includes(q) || row.source.toLowerCase().includes(q);
      const matchesPeriod = !revenuePeriodFilter || row.key === revenuePeriodFilter;
      return matchesSearch && matchesPeriod;
    });
  }, [data?.revenueRows, revenuePeriodFilter, searchRevenue]);

  const filteredShiftRows = useMemo(() => {
    const rows = data?.shiftRows || [];
    const q = searchShift.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !q || row.shift.toLowerCase().includes(q);
      const matchesShift = !shiftFilter || row.key === shiftFilter;
      return matchesSearch && matchesShift;
    });
  }, [data?.shiftRows, searchShift, shiftFilter]);

  const selectedExpense = expenseModal?.id ? data?.expenses.find((item) => item.id === expenseModal.id) || null : null;

  const openExpenseModal = useCallback(
    (mode: "view" | "edit" | "create", expenseId?: string) => {
      if (mode === "create") {
        setExpenseForm({ date: todayISO(), title: "", vendor: "", amount: 0, notes: "" });
        setExpenseModal({ mode: "create" });
        return;
      }

      const expense = data?.expenses.find((item) => item.id === expenseId);
      if (!expense || (mode === "edit" && expense.source !== "manual")) return;

      setExpenseForm({
        date: expense.date,
        title: expense.title,
        vendor: expense.vendor === "—" ? "" : expense.vendor,
        amount: expense.amount,
        notes: expense.notes || "",
      });
      setExpenseModal({ mode, id: expense.id });
    },
    [data?.expenses]
  );

  const submitExpense = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!expenseModal) return;

      setSubmitting(true);
      try {
        const payload = {
          date: expenseForm.date,
          title: expenseForm.title,
          vendor: expenseForm.vendor || null,
          amount: expenseForm.amount,
          notes: expenseForm.notes || null,
        };

        if (expenseModal.mode === "create") {
          await apiRequest<{ expense: ExpenseRow }>("/api/finance/expenses", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          pushToast("تمت إضافة المصروف", "success");
        } else if (expenseModal.mode === "edit" && expenseModal.id) {
          await apiRequest<{ expense: ExpenseRow }>(`/api/finance/expenses/${expenseModal.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
          pushToast("تم تحديث المصروف", "success");
        }

        setExpenseModal(null);
        await fetchFinance();
      } catch (error) {
        handleError(error, "تعذر حفظ المصروف");
      } finally {
        setSubmitting(false);
      }
    },
    [expenseForm, expenseModal, fetchFinance, handleError, pushToast]
  );

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      try {
        await apiRequest<{ deleted: boolean }>(`/api/finance/expenses/${expenseId}`, {
          method: "DELETE",
        });
        await fetchFinance();
      } catch (error) {
        handleError(error, "تعذر حذف المصروف");
        throw error;
      }
    },
    [fetchFinance, handleError]
  );

  return {
    activeTab,
    data,
    deleteExpense,
    expenseAmountFilter,
    expenseForm,
    expenseModal,
    expenseSourceFilter,
    filteredExpenses,
    filteredRevenueRows,
    filteredShiftRows,
    loading,
    openExpenseModal,
    revenuePeriodFilter,
    searchExpenses,
    searchRevenue,
    searchShift,
    selectedExpense,
    setActiveTab,
    setExpenseAmountFilter,
    setExpenseForm,
    setExpenseModal,
    setExpenseSourceFilter,
    setRevenuePeriodFilter,
    setSearchExpenses,
    setSearchRevenue,
    setSearchShift,
    setShiftFilter,
    shiftFilter,
    submitExpense,
    submitting,
  };
}

export type FinancePageState = ReturnType<typeof useFinancePage>;
