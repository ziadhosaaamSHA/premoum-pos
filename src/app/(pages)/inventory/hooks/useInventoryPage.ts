import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { todayISO } from "@/lib/format";
import { useToast } from "@/context/ToastContext";
import {
  MaterialModalState,
  MaterialRow,
  PurchaseModalState,
  PurchaseRow,
  SupplierOption,
  WasteModalState,
  WasteRow,
} from "../types";

export function useInventoryPage() {
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [waste, setWaste] = useState<WasteRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  const [activeTab, setActiveTab] = useState("materials");
  const [searchMaterials, setSearchMaterials] = useState("");
  const [materialStatusFilter, setMaterialStatusFilter] = useState("");
  const [searchPurchases, setSearchPurchases] = useState("");
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState("");
  const [searchWaste, setSearchWaste] = useState("");
  const [wasteCostFilter, setWasteCostFilter] = useState("");
  const [searchStock, setSearchStock] = useState("");
  const [stockLevelFilter, setStockLevelFilter] = useState("");

  const [materialModal, setMaterialModal] = useState<MaterialModalState>(null);
  const [purchaseModal, setPurchaseModal] = useState<PurchaseModalState>(null);
  const [wasteModal, setWasteModal] = useState<WasteModalState>(null);
  const [submitting, setSubmitting] = useState(false);

  const [materialForm, setMaterialForm] = useState({
    name: "",
    unit: "",
    cost: 0,
    stock: 0,
    minStock: 0,
  });

  const [purchaseForm, setPurchaseForm] = useState({
    date: todayISO(),
    supplierId: "",
    materialId: "",
    quantity: 1,
    unitCost: 0,
    total: 0,
    status: "draft" as "posted" | "draft" | "cancelled",
    notes: "",
  });

  const [wasteForm, setWasteForm] = useState({
    date: todayISO(),
    materialId: "",
    qty: 0,
    reason: "",
    cost: 0,
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

  const loadInventory = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const data = await apiRequest<{
          materials: MaterialRow[];
          purchases: PurchaseRow[];
          waste: WasteRow[];
          suppliers: SupplierOption[];
        }>("/api/inventory/bootstrap");

        setMaterials(data.materials);
        setPurchases(data.purchases);
        setWaste(data.waste);
        setSuppliers(data.suppliers);
      } catch (error) {
        handleError(error, "تعذر تحميل بيانات المخزون");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [handleError]
  );

  useEffect(() => {
    void loadInventory(true);
  }, [loadInventory]);

  useEffect(() => {
    if (purchaseForm.materialId) return;
    if (materials.length === 0) return;
    setPurchaseForm((prev) => ({ ...prev, materialId: materials[0].id }));
  }, [materials, purchaseForm.materialId]);

  useEffect(() => {
    if (wasteForm.materialId) return;
    if (materials.length === 0) return;
    setWasteForm((prev) => ({ ...prev, materialId: materials[0].id }));
  }, [materials, wasteForm.materialId]);

  useEffect(() => {
    setPurchaseForm((prev) => ({
      ...prev,
      total: Number((prev.quantity * prev.unitCost).toFixed(2)),
    }));
  }, [purchaseForm.quantity, purchaseForm.unitCost]);

  const filteredMaterials = useMemo(() => {
    const q = searchMaterials.trim().toLowerCase();
    return materials.filter((material) => {
      const matchesSearch =
        !q || material.name.toLowerCase().includes(q) || material.unit.toLowerCase().includes(q);
      const matchesStatus = !materialStatusFilter || material.status === materialStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [materialStatusFilter, materials, searchMaterials]);

  const filteredPurchases = useMemo(() => {
    const q = searchPurchases.trim().toLowerCase();
    return purchases.filter((purchase) => {
      const matchesSearch =
        !q ||
        purchase.supplier.toLowerCase().includes(q) ||
        purchase.material.toLowerCase().includes(q) ||
        purchase.date.includes(q) ||
        purchase.code.toLowerCase().includes(q);
      const matchesStatus = !purchaseStatusFilter || purchase.status === purchaseStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchaseStatusFilter, purchases, searchPurchases]);

  const filteredWaste = useMemo(() => {
    const q = searchWaste.trim().toLowerCase();
    return waste.filter((entry) => {
      const matchesSearch =
        !q || entry.material.toLowerCase().includes(q) || entry.reason.toLowerCase().includes(q);
      const matchesCost =
        !wasteCostFilter ||
        (wasteCostFilter === "low" && entry.cost < 100) ||
        (wasteCostFilter === "high" && entry.cost >= 100);
      return matchesSearch && matchesCost;
    });
  }, [searchWaste, waste, wasteCostFilter]);

  const stockAlerts = useMemo(() => materials.filter((item) => item.stock <= item.minStock), [materials]);

  const filteredStock = useMemo(() => {
    const q = searchStock.trim().toLowerCase();
    return stockAlerts.filter((material) => {
      const ratio = material.minStock > 0 ? material.stock / material.minStock : 0;
      const level = ratio <= 0.5 ? "critical" : "warning";
      const matchesSearch = !q || material.name.toLowerCase().includes(q);
      const matchesLevel = !stockLevelFilter || level === stockLevelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [searchStock, stockAlerts, stockLevelFilter]);

  const selectedMaterial = materialModal?.id
    ? materials.find((item) => item.id === materialModal.id) || null
    : null;
  const selectedPurchase = purchaseModal?.id
    ? purchases.find((item) => item.id === purchaseModal.id) || null
    : null;
  const selectedWaste = wasteModal?.id ? waste.find((item) => item.id === wasteModal.id) || null : null;

  const openMaterialModal = (mode: "view" | "edit" | "create", id?: string) => {
    if (mode === "create") {
      setMaterialForm({ name: "", unit: "", cost: 0, stock: 0, minStock: 0 });
      setMaterialModal({ mode: "create" });
      return;
    }

    const material = materials.find((item) => item.id === id);
    if (!material) return;
    setMaterialForm({
      name: material.name,
      unit: material.unit,
      cost: material.cost,
      stock: material.stock,
      minStock: material.minStock,
    });
    setMaterialModal({ mode, id: material.id });
  };

  const openPurchaseModal = (mode: "view" | "edit" | "create", id?: string) => {
    if (mode === "create") {
      setPurchaseForm({
        date: todayISO(),
        supplierId: "",
        materialId: materials[0]?.id || "",
        quantity: 1,
        unitCost: 0,
        total: 0,
        status: "draft",
        notes: "",
      });
      setPurchaseModal({ mode: "create" });
      return;
    }

    const purchase = purchases.find((item) => item.id === id);
    if (!purchase) return;
    setPurchaseForm({
      date: purchase.date,
      supplierId: purchase.supplierId,
      materialId: purchase.materialId || materials[0]?.id || "",
      quantity: purchase.quantity,
      unitCost: purchase.unitCost,
      total: purchase.total,
      status: purchase.status,
      notes: purchase.notes || "",
    });
    setPurchaseModal({ mode, id: purchase.id });
  };

  const openWasteModal = (mode: "view" | "edit" | "create", id?: string) => {
    if (mode === "create") {
      setWasteForm({
        date: todayISO(),
        materialId: materials[0]?.id || "",
        qty: 0,
        reason: "",
        cost: 0,
      });
      setWasteModal({ mode: "create" });
      return;
    }

    const entry = waste.find((item) => item.id === id);
    if (!entry) return;
    setWasteForm({
      date: entry.date,
      materialId: entry.materialId,
      qty: entry.qty,
      reason: entry.reason,
      cost: entry.cost,
    });
    setWasteModal({ mode, id: entry.id });
  };

  const submitMaterial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!materialModal) return;

    setSubmitting(true);
    try {
      if (materialModal.mode === "create") {
        await apiRequest<{ material: MaterialRow }>("/api/inventory/materials", {
          method: "POST",
          body: JSON.stringify(materialForm),
        });
        pushToast("تمت إضافة مادة خام", "success");
      } else if (materialModal.id) {
        await apiRequest<{ material: MaterialRow }>(`/api/inventory/materials/${materialModal.id}`, {
          method: "PATCH",
          body: JSON.stringify(materialForm),
        });
        pushToast("تم تحديث المادة", "success");
      }
      setMaterialModal(null);
      await loadInventory();
    } catch (error) {
      handleError(error, "تعذر حفظ المادة");
    } finally {
      setSubmitting(false);
    }
  };

  const submitPurchase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!purchaseModal) return;

    setSubmitting(true);
    try {
      const payload = {
        date: purchaseForm.date,
        supplierId: purchaseForm.supplierId || null,
        materialId: purchaseForm.materialId,
        quantity: purchaseForm.quantity,
        unitCost: purchaseForm.unitCost,
        total: purchaseForm.total,
        status: purchaseForm.status,
        notes: purchaseForm.notes || null,
      };

      if (purchaseModal.mode === "create") {
        await apiRequest<{ purchase: PurchaseRow }>("/api/inventory/purchases", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        pushToast("تمت إضافة فاتورة مشتريات", "success");
      } else if (purchaseModal.id) {
        await apiRequest<{ purchase: PurchaseRow }>(`/api/inventory/purchases/${purchaseModal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        pushToast("تم تحديث فاتورة المشتريات", "success");
      }

      setPurchaseModal(null);
      await loadInventory();
    } catch (error) {
      handleError(error, "تعذر حفظ فاتورة المشتريات");
    } finally {
      setSubmitting(false);
    }
  };

  const submitWaste = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!wasteModal) return;

    setSubmitting(true);
    try {
      const payload = {
        date: wasteForm.date,
        materialId: wasteForm.materialId,
        quantity: wasteForm.qty,
        reason: wasteForm.reason,
        cost: wasteForm.cost,
      };

      if (wasteModal.mode === "create") {
        await apiRequest<{ waste: WasteRow }>("/api/inventory/waste", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        pushToast("تم تسجيل الهدر", "success");
      } else if (wasteModal.id) {
        await apiRequest<{ waste: WasteRow }>(`/api/inventory/waste/${wasteModal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        pushToast("تم تحديث الهدر", "success");
      }

      setWasteModal(null);
      await loadInventory();
    } catch (error) {
      handleError(error, "تعذر حفظ سجل الهدر");
    } finally {
      setSubmitting(false);
    }
  };


  return {
    loading,
    materials,
    purchases,
    waste,
    suppliers,
    activeTab,
    setActiveTab,
    searchMaterials,
    setSearchMaterials,
    materialStatusFilter,
    setMaterialStatusFilter,
    searchPurchases,
    setSearchPurchases,
    purchaseStatusFilter,
    setPurchaseStatusFilter,
    searchWaste,
    setSearchWaste,
    wasteCostFilter,
    setWasteCostFilter,
    searchStock,
    setSearchStock,
    stockLevelFilter,
    setStockLevelFilter,
    materialModal,
    setMaterialModal,
    purchaseModal,
    setPurchaseModal,
    wasteModal,
    setWasteModal,
    submitting,
    materialForm,
    setMaterialForm,
    purchaseForm,
    setPurchaseForm,
    wasteForm,
    setWasteForm,
    loadInventory,
    filteredMaterials,
    filteredPurchases,
    filteredWaste,
    filteredStock,
    selectedMaterial,
    selectedPurchase,
    selectedWaste,
    openMaterialModal,
    openPurchaseModal,
    openWasteModal,
    submitMaterial,
    submitPurchase,
    submitWaste,
  };
}

export type InventoryPageState = ReturnType<typeof useInventoryPage>;
