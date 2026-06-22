"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBranding } from "@/context/BrandingContext";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";
import { isRetailMode, type BusinessMode } from "@/lib/businessMode";
import { buildReceiptSnapshot } from "@/lib/receipt";
import { OrderRow, OrdersTab, OrderStatusUi, TableForm, TableRow } from "../types";

export function useOrdersPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const { branding } = useBranding();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [businessMode, setBusinessMode] = useState<BusinessMode>("cafe_restaurant");

  const [activeTab, setActiveTab] = useState<OrdersTab>("tables");
  const [filterQuery, setFilterQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tableSearch, setTableSearch] = useState("");

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDeleteId, setOrderDeleteId] = useState<string | null>(null);
  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null);

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

  const loadData = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const setupPayload = await apiRequest<{
          setup: { isComplete: boolean; hasOwner: boolean; businessMode: BusinessMode };
        }>("/api/system/setup");
        const nextBusinessMode = setupPayload.setup.businessMode || "cafe_restaurant";
        const nextRetailMode = isRetailMode(nextBusinessMode);

        const [ordersPayload, tablesPayload] = await Promise.all([
          apiRequest<{ orders: OrderRow[] }>("/api/orders"),
          nextRetailMode ? Promise.resolve({ tables: [] }) : apiRequest<{ tables: TableRow[] }>("/api/tables"),
        ]);

        setBusinessMode(nextBusinessMode);
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

  useEffect(() => {
    if (retailMode && activeTab === "tables") {
      setActiveTab("current");
    }
  }, [activeTab, retailMode]);

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
    if (retailMode) return [];
    const q = tableSearch.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((table) => {
      return (
        table.name.toLowerCase().includes(q) ||
        String(table.number).includes(q) ||
        table.id.toLowerCase().includes(q)
      );
    });
  }, [retailMode, tableSearch, tables]);

  const currentOrders = filteredOrders.filter(
    (order) => order.status !== "delivered" && order.status !== "cancelled"
  );
  const historyOrders = filteredOrders.filter(
    (order) => order.status === "delivered" || order.status === "cancelled"
  );

  const selectedOrder = selectedOrderId ? orders.find((order) => order.id === selectedOrderId) || null : null;
  const receiptOrder = receiptOrderId ? orders.find((order) => order.id === receiptOrderId) || null : null;

  const receiptSnapshot = useMemo(() => {
    if (!receiptOrder) return null;
    if (receiptOrder.receiptSnapshot) return receiptOrder.receiptSnapshot;
    return buildReceiptSnapshot({
      code: receiptOrder.code,
      createdAt: receiptOrder.createdAt,
      customerName: receiptOrder.customer,
      orderType: receiptOrder.type,
      payment: receiptOrder.payment,
      brandName: branding.brandName,
      brandTagline: branding.brandTagline || undefined,
      logoUrl: branding.logoUrl || null,
      tableName: receiptOrder.tableName,
      tableNumber: receiptOrder.tableNumber ?? null,
      zoneName: receiptOrder.zoneName,
      items: receiptOrder.items.map((item) => ({
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      discount: receiptOrder.discount,
      taxRate: receiptOrder.taxRate,
      taxAmount: receiptOrder.taxAmount,
      deliveryFee: receiptOrder.deliveryFee,
      total: receiptOrder.total,
      notes: receiptOrder.notes,
    });
  }, [branding.brandName, branding.brandTagline, branding.logoUrl, receiptOrder]);

  const selectedTable = selectedTableId ? tables.find((table) => table.id === selectedTableId) || null : null;
  const tableOrder = selectedTable?.orderId ? orders.find((order) => order.id === selectedTable.orderId) || null : null;

  const openTableModal = useCallback((table?: TableRow) => {
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
  }, []);

  const handleTableSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
    },
    [handleError, loadData, pushToast, tableForm]
  );

  const handleDeleteOrder = useCallback(
    async (orderId: string) => {
      try {
        await apiRequest<{ deleted: boolean }>(`/api/orders/${orderId}`, {
          method: "DELETE",
        });
        pushToast("تم حذف الطلب", "success");
        await loadData();
      } catch (error) {
        handleError(error, "تعذر حذف الطلب");
      }
    },
    [handleError, loadData, pushToast]
  );

  const handleDeleteOrders = useCallback(
    async (orderIds: string[]) => {
      try {
        await Promise.all(
          orderIds.map((orderId) =>
            apiRequest<{ deleted: boolean }>(`/api/orders/${orderId}`, {
              method: "DELETE",
            })
          )
        );
        await loadData();
      } catch (error) {
        handleError(error, "تعذر حذف الطلبات المحددة");
        throw error;
      }
    },
    [handleError, loadData]
  );

  const handleOrderStatusChange = useCallback(
    async (orderId: string, status: OrderStatusUi) => {
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
    },
    [handleError, loadData, pushToast]
  );

  const handleDeleteTable = useCallback(
    async (tableId: string) => {
      try {
        await apiRequest<{ deleted: boolean }>(`/api/tables/${tableId}`, {
          method: "DELETE",
        });
        pushToast("تم حذف الطاولة", "success");
        await loadData();
      } catch (error) {
        handleError(error, "تعذر حذف الطاولة");
      }
    },
    [handleError, loadData, pushToast]
  );

  const handleClearTable = useCallback(
    async (tableId: string) => {
      try {
        await apiRequest<{ table: TableRow }>(`/api/tables/${tableId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "empty", orderId: null }),
        });
        pushToast("تم تفريغ الطاولة", "success");
        await loadData();
      } catch (error) {
        handleError(error, "تعذر تفريغ الطاولة");
      }
    },
    [handleError, loadData, pushToast]
  );

  const tableAssignableOrders = currentOrders.filter((order) => !order.tableId || order.tableId === tableForm.id);

  return {
    activeTab,
    businessMode,
    currentOrders,
    filterQuery,
    filteredOrders,
    filteredTables,
    finishTableOrderId,
    handleClearTable,
    handleDeleteOrder,
    handleDeleteOrders,
    handleDeleteTable,
    handleOrderStatusChange,
    handleTableSubmit,
    historyOrders,
    loading,
    openTableModal,
    orderDeleteId,
    receiptOrder,
    receiptSnapshot,
    retailMode,
    router,
    selectedOrder,
    selectedTable,
    setActiveTab,
    setFilterQuery,
    setFinishTableOrderId,
    setOrderDeleteId,
    setReceiptOrderId,
    setSelectedOrderId,
    setSelectedTableId,
    setStatusFilter,
    setTableDeleteId,
    setTableForm,
    setTableModalOpen,
    setTableSearch,
    statusFilter,
    tableAssignableOrders,
    tableDeleteId,
    tableForm,
    tableModalOpen,
    tableOrder,
    tableSearch,
    tableSubmitting,
  };
}

export type OrdersPageState = ReturnType<typeof useOrdersPage>;
