"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { initialState } from "@/data/posData";
import { autoCode } from "@/lib/format";
import {
  ActiveShift,
  AppState,
  Backup,
  Material,
  Order,
  Product,
  Sale,
  ShiftLog,
  Table,
} from "@/lib/types";

type AppStateContextValue = {
  state: AppState;
  updateCurrentUser: (updates: Partial<AppState["currentUser"]>) => void;
  setPosCategory: (category: string) => void;
  setPosSearch: (value: string) => void;
  setOrderType: (type: AppState["pos"]["orderType"]) => void;
  setPayment: (payment: AppState["pos"]["payment"]) => void;
  setZoneId: (zoneId: string) => void;
  setDiscount: (value: number) => void;
  addToCart: (productId: string) => void;
  changeCartQty: (productId: string, delta: number) => void;
  clearCart: () => void;
  confirmOrder: () => void;
  deleteOrder: (orderId: string) => void;
  addTable: (table: Table) => void;
  updateTable: (tableId: string, updates: Partial<Table>) => void;
  deleteTable: (tableId: string) => void;
  createBackup: (note?: string) => void;
  restoreBackup: (backupId: string) => void;
  deleteBackup: (backupId: string) => void;
  importData: (payload: unknown) => boolean;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  updateSupplier: (id: string, updates: Partial<AppState["suppliers"][number]>) => void;
  deleteSupplier: (id: string) => void;
  updateZone: (id: string, updates: Partial<AppState["zones"][number]>) => void;
  deleteZone: (id: string) => void;
  updateDriver: (id: string, updates: Partial<AppState["drivers"][number]>) => void;
  deleteDriver: (id: string) => void;
  updatePurchase: (id: string, updates: Partial<AppState["purchases"][number]>) => void;
  deletePurchase: (id: string) => void;
  updateWaste: (id: string, updates: Partial<AppState["waste"][number]>) => void;
  deleteWaste: (id: string) => void;
  updateExpense: (id: string, updates: Partial<AppState["expenses"][number]>) => void;
  deleteExpense: (id: string) => void;
  updateEmployee: (id: string, updates: Partial<AppState["employees"][number]>) => void;
  deleteEmployee: (id: string) => void;
  updateAttendance: (id: string, updates: Partial<AppState["attendance"][number]>) => void;
  deleteAttendance: (id: string) => void;
  updateShift: (id: string, updates: Partial<AppState["shifts"][number]>) => void;
  deleteShift: (id: string) => void;
  updatePayroll: (id: string, updates: Partial<AppState["payroll"][number]>) => void;
  deletePayroll: (id: string) => void;
  updateLeave: (id: string, updates: Partial<AppState["leaves"][number]>) => void;
  deleteLeave: (id: string) => void;
  addRole: (role: Omit<AppState["roles"][number], "id">) => void;
  updateRole: (id: string, updates: Partial<AppState["roles"][number]>) => void;
  deleteRole: (id: string) => void;
  addUser: (user: Omit<AppState["users"][number], "id">) => void;
  updateUser: (id: string, updates: Partial<AppState["users"][number]>) => void;
  deleteUser: (id: string) => void;
  addSale: (sale: Pick<Sale, "date" | "customer" | "total" | "status" | "items">) => void;
  updateSale: (id: string, updates: Partial<Sale>) => void;
  deleteSale: (id: string) => void;
  startShift: () => void;
  pauseShift: () => void;
  resumeShift: () => void;
  stopShift: () => void;
  resetDemo: () => void;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

function deductInventory(materials: Material[], products: Product[], order: Order) {
  const nextMaterials = materials.map((m) => ({ ...m }));
  const materialMap = new Map(nextMaterials.map((m) => [m.id, m]));
  order.items.forEach((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) return;
    product.recipe.forEach((r) => {
      const material = materialMap.get(r.materialId);
      if (!material) return;
      material.stock = Math.max(0, material.stock - r.qty * item.qty);
    });
  });
  return nextMaterials;
}

function updateListItem<T extends { id: string }>(items: T[], id: string, updates: Partial<T>) {
  return items.map((item) => (item.id === id ? { ...item, ...updates } : item));
}

function deleteListItem<T extends { id: string }>(items: T[], id: string) {
  return items.filter((item) => item.id !== id);
}

function normalizeImportedState(payload: unknown, currentBackups: Backup[]): AppState | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const maybeData = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;

  const requiredArrays = [
    "categories",
    "materials",
    "products",
    "suppliers",
    "purchases",
    "waste",
    "zones",
    "drivers",
    "expenses",
    "employees",
    "attendance",
    "shifts",
    "payroll",
    "leaves",
    "roles",
    "users",
    "orders",
    "cart",
    "tables",
    "sales",
  ];

  const hasRequiredShape = requiredArrays.every((key) => Array.isArray(maybeData[key]));
  if (!hasRequiredShape || typeof maybeData.pos !== "object") return null;

  const imported = maybeData as Partial<AppState>;
  return {
    ...initialState,
    ...imported,
    backups: Array.isArray(imported.backups) ? imported.backups : currentBackups,
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);

  const updateCurrentUser = useCallback((updates: Partial<AppState["currentUser"]>) => {
    setState((prev) => ({
      ...prev,
      currentUser: { ...prev.currentUser, ...updates },
    }));
  }, []);

  const setPosCategory = useCallback((category: string) => {
    setState((prev) => ({ ...prev, pos: { ...prev.pos, category } }));
  }, []);

  const setPosSearch = useCallback((value: string) => {
    setState((prev) => ({ ...prev, pos: { ...prev.pos, search: value } }));
  }, []);

  const setOrderType = useCallback((type: AppState["pos"]["orderType"]) => {
    setState((prev) => ({ ...prev, pos: { ...prev.pos, orderType: type } }));
  }, []);

  const setPayment = useCallback((payment: AppState["pos"]["payment"]) => {
    setState((prev) => ({ ...prev, pos: { ...prev.pos, payment } }));
  }, []);

  const setZoneId = useCallback((zoneId: string) => {
    setState((prev) => ({ ...prev, pos: { ...prev.pos, zoneId } }));
  }, []);

  const setDiscount = useCallback((value: number) => {
    setState((prev) => ({ ...prev, pos: { ...prev.pos, discount: value } }));
  }, []);

  const addToCart = useCallback((productId: string) => {
    setState((prev) => {
      const existing = prev.cart.find((item) => item.productId === productId);
      let nextCart = prev.cart;
      if (existing) {
        nextCart = prev.cart.map((item) =>
          item.productId === productId ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        nextCart = [...prev.cart, { productId, qty: 1 }];
      }
      return { ...prev, cart: nextCart };
    });
  }, []);

  const changeCartQty = useCallback((productId: string, delta: number) => {
    setState((prev) => {
      const nextCart = prev.cart
        .map((item) =>
          item.productId === productId ? { ...item, qty: item.qty + delta } : item
        )
        .filter((item) => item.qty > 0);
      return { ...prev, cart: nextCart };
    });
  }, []);

  const clearCart = useCallback(() => {
    setState((prev) => ({ ...prev, cart: [] }));
  }, []);

  const confirmOrder = useCallback(() => {
    setState((prev) => {
      if (prev.cart.length === 0) return prev;
      const order: Order = {
        id: autoCode("ORD"),
        type: prev.pos.orderType,
        status: "preparing",
        customer: prev.pos.orderType === "dine_in" ? "عميل صالة" : "عميل",
        zoneId: prev.pos.orderType === "delivery" ? prev.pos.zoneId : "",
        driverId: prev.pos.orderType === "delivery" ? "drv-1" : "",
        createdAt: new Date().toISOString(),
        items: prev.cart.map((item) => ({ ...item })),
        discount: prev.pos.discount,
        payment: prev.pos.payment,
      };
      const nextMaterials = deductInventory(prev.materials, prev.products, order);
      return {
        ...prev,
        materials: nextMaterials,
        orders: [order, ...prev.orders],
        cart: [],
      };
    });
  }, []);

  const deleteOrder = useCallback((orderId: string) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.filter((order) => order.id !== orderId),
      tables: prev.tables.map((table) =>
        table.orderId === orderId ? { ...table, status: "empty", orderId: null } : table
      ),
    }));
  }, []);

  const addTable = useCallback((table: Table) => {
    setState((prev) => ({ ...prev, tables: [table, ...prev.tables] }));
  }, []);

  const updateTable = useCallback((tableId: string, updates: Partial<Table>) => {
    setState((prev) => ({
      ...prev,
      tables: updateListItem(prev.tables, tableId, updates),
    }));
  }, []);

  const deleteTable = useCallback((tableId: string) => {
    setState((prev) => ({
      ...prev,
      tables: deleteListItem(prev.tables, tableId),
    }));
  }, []);

  const createBackup = useCallback((note?: string) => {
    setState((prev) => {
      const { backups, ...rest } = prev;
      const data = JSON.parse(JSON.stringify(rest)) as Omit<AppState, "backups">;
      const serialized = JSON.stringify(data);
      const backup: Backup = {
        id: autoCode("BKP"),
        createdAt: new Date().toISOString(),
        note: note || "نسخة احتياطية يدوية",
        size: serialized.length,
        data,
      };
      return { ...prev, backups: [backup, ...backups] };
    });
  }, []);

  const restoreBackup = useCallback((backupId: string) => {
    setState((prev) => {
      const backup = prev.backups.find((b) => b.id === backupId);
      if (!backup) return prev;
      return { ...backup.data, backups: prev.backups };
    });
  }, []);

  const deleteBackup = useCallback((backupId: string) => {
    setState((prev) => ({
      ...prev,
      backups: prev.backups.filter((backup) => backup.id !== backupId),
    }));
  }, []);

  const importData = useCallback((payload: unknown) => {
    const normalized = normalizeImportedState(payload, state.backups);
    if (!normalized) return false;
    setState(normalized);
    return true;
  }, [state.backups]);

  const updateMaterial = useCallback((id: string, updates: Partial<Material>) => {
    setState((prev) => ({ ...prev, materials: updateListItem(prev.materials, id, updates) }));
  }, []);

  const deleteMaterial = useCallback((id: string) => {
    setState((prev) => ({ ...prev, materials: deleteListItem(prev.materials, id) }));
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setState((prev) => ({ ...prev, products: updateListItem(prev.products, id, updates) }));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setState((prev) => ({ ...prev, products: deleteListItem(prev.products, id) }));
  }, []);

  const updateSupplier = useCallback((id: string, updates: Partial<AppState["suppliers"][number]>) => {
    setState((prev) => ({ ...prev, suppliers: updateListItem(prev.suppliers, id, updates) }));
  }, []);

  const deleteSupplier = useCallback((id: string) => {
    setState((prev) => ({ ...prev, suppliers: deleteListItem(prev.suppliers, id) }));
  }, []);

  const updateZone = useCallback((id: string, updates: Partial<AppState["zones"][number]>) => {
    setState((prev) => ({ ...prev, zones: updateListItem(prev.zones, id, updates) }));
  }, []);

  const deleteZone = useCallback((id: string) => {
    setState((prev) => ({ ...prev, zones: deleteListItem(prev.zones, id) }));
  }, []);

  const updateDriver = useCallback((id: string, updates: Partial<AppState["drivers"][number]>) => {
    setState((prev) => ({ ...prev, drivers: updateListItem(prev.drivers, id, updates) }));
  }, []);

  const deleteDriver = useCallback((id: string) => {
    setState((prev) => ({ ...prev, drivers: deleteListItem(prev.drivers, id) }));
  }, []);

  const updatePurchase = useCallback((id: string, updates: Partial<AppState["purchases"][number]>) => {
    setState((prev) => ({ ...prev, purchases: updateListItem(prev.purchases, id, updates) }));
  }, []);

  const deletePurchase = useCallback((id: string) => {
    setState((prev) => ({ ...prev, purchases: deleteListItem(prev.purchases, id) }));
  }, []);

  const updateWaste = useCallback((id: string, updates: Partial<AppState["waste"][number]>) => {
    setState((prev) => ({ ...prev, waste: updateListItem(prev.waste, id, updates) }));
  }, []);

  const deleteWaste = useCallback((id: string) => {
    setState((prev) => ({ ...prev, waste: deleteListItem(prev.waste, id) }));
  }, []);

  const updateExpense = useCallback((id: string, updates: Partial<AppState["expenses"][number]>) => {
    setState((prev) => ({ ...prev, expenses: updateListItem(prev.expenses, id, updates) }));
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setState((prev) => ({ ...prev, expenses: deleteListItem(prev.expenses, id) }));
  }, []);

  const updateEmployee = useCallback((id: string, updates: Partial<AppState["employees"][number]>) => {
    setState((prev) => ({ ...prev, employees: updateListItem(prev.employees, id, updates) }));
  }, []);

  const deleteEmployee = useCallback((id: string) => {
    setState((prev) => ({ ...prev, employees: deleteListItem(prev.employees, id) }));
  }, []);

  const updateAttendance = useCallback((id: string, updates: Partial<AppState["attendance"][number]>) => {
    setState((prev) => ({ ...prev, attendance: updateListItem(prev.attendance, id, updates) }));
  }, []);

  const deleteAttendance = useCallback((id: string) => {
    setState((prev) => ({ ...prev, attendance: deleteListItem(prev.attendance, id) }));
  }, []);

  const updateShift = useCallback((id: string, updates: Partial<AppState["shifts"][number]>) => {
    setState((prev) => ({ ...prev, shifts: updateListItem(prev.shifts, id, updates) }));
  }, []);

  const deleteShift = useCallback((id: string) => {
    setState((prev) => ({ ...prev, shifts: deleteListItem(prev.shifts, id) }));
  }, []);

  const updatePayroll = useCallback((id: string, updates: Partial<AppState["payroll"][number]>) => {
    setState((prev) => ({ ...prev, payroll: updateListItem(prev.payroll, id, updates) }));
  }, []);

  const deletePayroll = useCallback((id: string) => {
    setState((prev) => ({ ...prev, payroll: deleteListItem(prev.payroll, id) }));
  }, []);

  const updateLeave = useCallback((id: string, updates: Partial<AppState["leaves"][number]>) => {
    setState((prev) => ({ ...prev, leaves: updateListItem(prev.leaves, id, updates) }));
  }, []);

  const deleteLeave = useCallback((id: string) => {
    setState((prev) => ({ ...prev, leaves: deleteListItem(prev.leaves, id) }));
  }, []);

  const addRole = useCallback((role: Omit<AppState["roles"][number], "id">) => {
    setState((prev) => ({
      ...prev,
      roles: [{ id: autoCode("ROL"), ...role }, ...prev.roles],
    }));
  }, []);

  const updateRole = useCallback((id: string, updates: Partial<AppState["roles"][number]>) => {
    setState((prev) => ({ ...prev, roles: updateListItem(prev.roles, id, updates) }));
  }, []);

  const deleteRole = useCallback((id: string) => {
    setState((prev) => ({ ...prev, roles: deleteListItem(prev.roles, id) }));
  }, []);

  const addUser = useCallback((user: Omit<AppState["users"][number], "id">) => {
    setState((prev) => ({
      ...prev,
      users: [{ id: autoCode("USR"), ...user }, ...prev.users],
    }));
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<AppState["users"][number]>) => {
    setState((prev) => ({ ...prev, users: updateListItem(prev.users, id, updates) }));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setState((prev) => ({ ...prev, users: deleteListItem(prev.users, id) }));
  }, []);

  const addSale = useCallback((sale: Pick<Sale, "date" | "customer" | "total" | "status" | "items">) => {
    setState((prev) => {
      const entry: Sale = {
        id: autoCode("SALE"),
        invoiceNo: autoCode("INV"),
        date: sale.date,
        customer: sale.customer,
        total: sale.total,
        status: sale.status,
        items: sale.items,
      };
      return { ...prev, sales: [entry, ...prev.sales] };
    });
  }, []);

  const updateSale = useCallback((id: string, updates: Partial<Sale>) => {
    setState((prev) => ({ ...prev, sales: updateListItem(prev.sales, id, updates) }));
  }, []);

  const deleteSale = useCallback((id: string) => {
    setState((prev) => ({ ...prev, sales: deleteListItem(prev.sales, id) }));
  }, []);

  const startShift = useCallback(() => {
    setState((prev) => {
      if (prev.activeShift.status === "running") return prev;
      const employeeId =
        prev.currentUser.employeeId ||
        prev.employees.find((emp) => emp.name === prev.currentUser.name)?.id ||
        null;
      if (!employeeId) return prev;
      const activeShift: ActiveShift = {
        status: "running",
        employeeId,
        startedAt: new Date().toISOString(),
        pauses: [],
      };
      return { ...prev, activeShift };
    });
  }, []);

  const pauseShift = useCallback(() => {
    setState((prev) => {
      if (prev.activeShift.status !== "running") return prev;
      const now = new Date().toISOString();
      return {
        ...prev,
        activeShift: {
          ...prev.activeShift,
          status: "paused",
          pauseStartedAt: now,
          pauses: [...prev.activeShift.pauses, { start: now }],
        },
      };
    });
  }, []);

  const resumeShift = useCallback(() => {
    setState((prev) => {
      if (prev.activeShift.status !== "paused") return prev;
      const now = new Date().toISOString();
      const pauses = [...prev.activeShift.pauses];
      const lastPause = pauses[pauses.length - 1];
      if (lastPause && !lastPause.end) {
        lastPause.end = now;
      }
      return {
        ...prev,
        activeShift: {
          ...prev.activeShift,
          status: "running",
          pauseStartedAt: undefined,
          pauses,
        },
      };
    });
  }, []);

  const stopShift = useCallback(() => {
    setState((prev) => {
      if (prev.activeShift.status === "idle" || !prev.activeShift.startedAt) return prev;
      const now = new Date().toISOString();
      const pauses = [...prev.activeShift.pauses];
      if (prev.activeShift.status === "paused") {
        const lastPause = pauses[pauses.length - 1];
        if (lastPause && !lastPause.end) {
          lastPause.end = now;
        }
      }
      const startMs = new Date(prev.activeShift.startedAt).getTime();
      const endMs = new Date(now).getTime();
      const pausedMs = pauses.reduce((sum, pause) => {
        if (!pause.end) return sum;
        return sum + (new Date(pause.end).getTime() - new Date(pause.start).getTime());
      }, 0);
      const durationMinutes = Math.max(0, Math.round((endMs - startMs - pausedMs) / 60000));
      const employeeId = prev.activeShift.employeeId || "";
      const employee = prev.employees.find((emp) => emp.id === employeeId);
      const shiftLog: ShiftLog = {
        id: autoCode("SHIFT"),
        employeeId,
        employeeName: employee?.name || prev.currentUser.name,
        startedAt: prev.activeShift.startedAt,
        endedAt: now,
        durationMinutes,
        pauses,
      };
      const nextEmployees = employee
        ? prev.employees.map((emp) =>
            emp.id === employeeId ? { ...emp, shiftLogs: [shiftLog, ...emp.shiftLogs] } : emp
          )
        : prev.employees;
      return {
        ...prev,
        employees: nextEmployees,
        activeShift: { status: "idle", employeeId: null, pauses: [] },
      };
    });
  }, []);

  const resetDemo = useCallback(() => {
    setState(initialState);
  }, []);

  const value = useMemo(
    () => ({
      state,
      updateCurrentUser,
      setPosCategory,
      setPosSearch,
      setOrderType,
      setPayment,
      setZoneId,
      setDiscount,
      addToCart,
      changeCartQty,
      clearCart,
      confirmOrder,
      deleteOrder,
      addTable,
      updateTable,
      deleteTable,
      createBackup,
      restoreBackup,
      deleteBackup,
      importData,
      updateMaterial,
      deleteMaterial,
      updateProduct,
      deleteProduct,
      updateSupplier,
      deleteSupplier,
      updateZone,
      deleteZone,
      updateDriver,
      deleteDriver,
      updatePurchase,
      deletePurchase,
      updateWaste,
      deleteWaste,
      updateExpense,
      deleteExpense,
      updateEmployee,
      deleteEmployee,
      updateAttendance,
      deleteAttendance,
      updateShift,
      deleteShift,
      updatePayroll,
      deletePayroll,
      updateLeave,
      deleteLeave,
      addRole,
      updateRole,
      deleteRole,
      addUser,
      updateUser,
      deleteUser,
      addSale,
      updateSale,
      deleteSale,
      startShift,
      pauseShift,
      resumeShift,
      stopShift,
      resetDemo,
    }),
    [
      state,
      updateCurrentUser,
      setPosCategory,
      setPosSearch,
      setOrderType,
      setPayment,
      setZoneId,
      setDiscount,
      addToCart,
      changeCartQty,
      clearCart,
      confirmOrder,
      deleteOrder,
      addTable,
      updateTable,
      deleteTable,
      createBackup,
      restoreBackup,
      deleteBackup,
      importData,
      updateMaterial,
      deleteMaterial,
      updateProduct,
      deleteProduct,
      updateSupplier,
      deleteSupplier,
      updateZone,
      deleteZone,
      updateDriver,
      deleteDriver,
      updatePurchase,
      deletePurchase,
      updateWaste,
      deleteWaste,
      updateExpense,
      deleteExpense,
      updateEmployee,
      deleteEmployee,
      updateAttendance,
      deleteAttendance,
      updateShift,
      deleteShift,
      updatePayroll,
      deletePayroll,
      updateLeave,
      deleteLeave,
      addRole,
      updateRole,
      deleteRole,
      addUser,
      updateUser,
      deleteUser,
      addSale,
      updateSale,
      deleteSale,
      startShift,
      pauseShift,
      resumeShift,
      stopShift,
      resetDemo,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
}
