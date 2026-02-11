"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { money, num2, todayISO, translateStatus } from "@/lib/format";
import InlineModal from "@/components/ui/InlineModal";
import RowActions from "@/components/ui/RowActions";
import TableDataActions from "@/components/ui/TableDataActions";
import { useToast } from "@/context/ToastContext";

type MaterialRow = {
  id: string;
  name: string;
  unit: string;
  cost: number;
  stock: number;
  minStock: number;
  status: "low" | "ok";
};

type PurchaseRow = {
  id: string;
  code: string;
  date: string;
  supplierId: string;
  supplier: string;
  materialId: string | null;
  material: string;
  quantity: number;
  unitCost: number;
  total: number;
  status: "posted" | "draft" | "cancelled";
  notes: string | null;
};

type WasteRow = {
  id: string;
  date: string;
  materialId: string;
  material: string;
  unit: string;
  qty: number;
  reason: string;
  cost: number;
};

type SupplierOption = {
  id: string;
  name: string;
};

type MaterialModalState = { mode: "view" | "edit" | "create"; id?: string } | null;
type PurchaseModalState = { mode: "view" | "edit" | "create"; id?: string } | null;
type WasteModalState = { mode: "view" | "edit" | "create"; id?: string } | null;

export default function InventoryPage() {
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

  const submitMaterial = async (event: React.FormEvent<HTMLFormElement>) => {
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

  const submitPurchase = async (event: React.FormEvent<HTMLFormElement>) => {
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

  const submitWaste = async (event: React.FormEvent<HTMLFormElement>) => {
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

  return (
    <section className="page active">
      <div className="subtabs">
        <button className={`subtab ${activeTab === "materials" ? "active" : ""}`} onClick={() => setActiveTab("materials")} type="button">
          <i className="bx bx-layer"></i>
          المواد الخام
        </button>
        <button className={`subtab ${activeTab === "purchases" ? "active" : ""}`} onClick={() => setActiveTab("purchases")} type="button">
          <i className="bx bx-purchase-tag"></i>
          المشتريات
        </button>
        <button className={`subtab ${activeTab === "waste" ? "active" : ""}`} onClick={() => setActiveTab("waste")} type="button">
          <i className="bx bx-trash"></i>
          الهدر
        </button>
        <button className={`subtab ${activeTab === "stock" ? "active" : ""}`} onClick={() => setActiveTab("stock")} type="button">
          <i className="bx bx-error-circle"></i>
          تنبيهات المخزون
        </button>
      </div>

      {loading ? (
        <div className="card wide">
          <p className="hint">جارٍ تحميل بيانات المخزون...</p>
        </div>
      ) : null}

      {!loading && activeTab === "materials" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>المواد الخام</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في المواد..."
                    value={searchMaterials}
                    onChange={(event) => setSearchMaterials(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={materialStatusFilter}
                  onChange={(event) => setMaterialStatusFilter(event.target.value)}
                >
                  <option value="">كل الحالات</option>
                  <option value="ok">آمن</option>
                  <option value="low">منخفض</option>
                </select>
                <button className="primary" type="button" onClick={() => openMaterialModal("create")}>
                  <i className="bx bx-plus"></i>
                  إضافة مادة خام
                </button>
                <TableDataActions
                  rows={filteredMaterials}
                  columns={[
                    { label: "المادة", value: (row) => row.name },
                    { label: "الوحدة", value: (row) => row.unit },
                    { label: "التكلفة", value: (row) => row.cost },
                    { label: "المتاح", value: (row) => row.stock },
                    { label: "الحالة", value: (row) => translateStatus(row.status) },
                  ]}
                  fileName="inventory-materials"
                  printTitle="المواد الخام"
                  tableId="inventory-materials-table"
                />
              </div>
            </div>
            <table id="inventory-materials-table">
              <thead>
                <tr>
                  <th>المادة</th>
                  <th>الوحدة</th>
                  <th>تكلفة الوحدة</th>
                  <th>المتاح</th>
                  <th>الحد الأدنى</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={7}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredMaterials.map((item) => (
                    <tr key={item.id} data-status={item.status}>
                      <td>{item.name}</td>
                      <td>{item.unit}</td>
                      <td>{money(item.cost)}</td>
                      <td>{num2(item.stock)}</td>
                      <td>{num2(item.minStock)}</td>
                      <td>
                        <span className={`badge ${item.status === "low" ? "danger" : "ok"}`}>
                          {translateStatus(item.status)}
                        </span>
                      </td>
                      <td>
                        <RowActions
                          onView={() => openMaterialModal("view", item.id)}
                          onEdit={() => openMaterialModal("edit", item.id)}
                          onDelete={async () => {
                            await apiRequest<{ deleted: boolean }>(`/api/inventory/materials/${item.id}`, {
                              method: "DELETE",
                            });
                            await loadInventory();
                          }}
                          confirmDeleteText="هل تريد حذف المادة؟"
                          deleteMessage="تم حذف المادة"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === "purchases" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>فواتير المشتريات</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في المشتريات..."
                    value={searchPurchases}
                    onChange={(event) => setSearchPurchases(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={purchaseStatusFilter}
                  onChange={(event) => setPurchaseStatusFilter(event.target.value)}
                >
                  <option value="">كل الحالات</option>
                  <option value="posted">مرحلة</option>
                  <option value="draft">مسودة</option>
                  <option value="cancelled">ملغاة</option>
                </select>
                <button className="primary" type="button" onClick={() => openPurchaseModal("create")}>
                  <i className="bx bx-plus"></i>
                  إضافة مشتريات
                </button>
                <TableDataActions
                  rows={filteredPurchases}
                  columns={[
                    { label: "الكود", value: (row) => row.code },
                    { label: "التاريخ", value: (row) => row.date },
                    { label: "المنتج", value: (row) => row.material },
                    { label: "الكمية", value: (row) => row.quantity },
                    { label: "المورد", value: (row) => row.supplier },
                    { label: "الإجمالي", value: (row) => row.total },
                    { label: "الحالة", value: (row) => translateStatus(row.status) },
                  ]}
                  fileName="inventory-purchases"
                  printTitle="فواتير المشتريات"
                  tableId="inventory-purchases-table"
                />
              </div>
            </div>
            <table id="inventory-purchases-table">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>التاريخ</th>
                  <th>المنتج</th>
                  <th>الكمية</th>
                  <th>المورد</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={8}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredPurchases.map((item) => (
                    <tr key={item.id} data-status={item.status}>
                      <td>{item.code}</td>
                      <td>{item.date}</td>
                      <td>{item.material}</td>
                      <td>{num2(item.quantity)}</td>
                      <td>{item.supplier}</td>
                      <td>{money(item.total)}</td>
                      <td>
                        <span
                          className={`badge ${
                            item.status === "posted" ? "ok" : item.status === "draft" ? "warn" : "danger"
                          }`}
                        >
                          {translateStatus(item.status)}
                        </span>
                      </td>
                      <td>
                        <RowActions
                          onView={() => openPurchaseModal("view", item.id)}
                          onEdit={() => openPurchaseModal("edit", item.id)}
                          onDelete={async () => {
                            await apiRequest<{ deleted: boolean }>(`/api/inventory/purchases/${item.id}`, {
                              method: "DELETE",
                            });
                            await loadInventory();
                          }}
                          disableDelete={item.status !== "draft"}
                          confirmDeleteText="يمكن حذف فواتير المشتريات المسودة فقط. تأكيد الحذف؟"
                          deleteMessage="تم حذف فاتورة المشتريات"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === "waste" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>الهدر</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في الهدر..."
                    value={searchWaste}
                    onChange={(event) => setSearchWaste(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={wasteCostFilter}
                  onChange={(event) => setWasteCostFilter(event.target.value)}
                >
                  <option value="">كل التكاليف</option>
                  <option value="low">أقل من 100</option>
                  <option value="high">100 فأكثر</option>
                </select>
                <button className="primary" type="button" onClick={() => openWasteModal("create")}>
                  <i className="bx bx-plus"></i>
                  تسجيل هدر
                </button>
                <TableDataActions
                  rows={filteredWaste}
                  columns={[
                    { label: "التاريخ", value: (row) => row.date },
                    { label: "المادة", value: (row) => row.material },
                    { label: "الكمية", value: (row) => row.qty },
                    { label: "السبب", value: (row) => row.reason },
                    { label: "التكلفة", value: (row) => row.cost },
                  ]}
                  fileName="inventory-waste"
                  printTitle="سجل الهدر"
                  tableId="inventory-waste-table"
                />
              </div>
            </div>
            <table id="inventory-waste-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المادة</th>
                  <th>الكمية</th>
                  <th>السبب</th>
                  <th>التكلفة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredWaste.length === 0 ? (
                  <tr>
                    <td colSpan={6}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredWaste.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.date}</td>
                      <td>{entry.material}</td>
                      <td>{num2(entry.qty)}</td>
                      <td>{entry.reason}</td>
                      <td>{money(entry.cost)}</td>
                      <td>
                        <RowActions
                          onView={() => openWasteModal("view", entry.id)}
                          onEdit={() => openWasteModal("edit", entry.id)}
                          onDelete={async () => {
                            await apiRequest<{ deleted: boolean }>(`/api/inventory/waste/${entry.id}`, {
                              method: "DELETE",
                            });
                            await loadInventory();
                          }}
                          confirmDeleteText="هل تريد حذف سجل الهدر؟"
                          deleteMessage="تم حذف سجل الهدر"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === "stock" && (
        <div className="subtab-panel active">
          <div className="card wide">
            <div className="section-header-actions">
              <h2>تنبيهات المخزون</h2>
              <div className="table-toolbar">
                <div className="search-bar-wrapper">
                  <i className="bx bx-search"></i>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="بحث في التنبيهات..."
                    value={searchStock}
                    onChange={(event) => setSearchStock(event.target.value)}
                  />
                </div>
                <select
                  className="select-filter"
                  value={stockLevelFilter}
                  onChange={(event) => setStockLevelFilter(event.target.value)}
                >
                  <option value="">كل التنبيهات</option>
                  <option value="critical">حرج</option>
                  <option value="warning">تنبيه</option>
                </select>
                <TableDataActions
                  rows={filteredStock}
                  columns={[
                    { label: "المادة", value: (row) => row.name },
                    { label: "المتاح", value: (row) => row.stock },
                    { label: "الحد الأدنى", value: (row) => row.minStock },
                    {
                      label: "الحالة",
                      value: (row) =>
                        row.minStock > 0 && row.stock / row.minStock <= 0.5 ? "حرج" : "تنبيه",
                    },
                  ]}
                  fileName="inventory-alerts"
                  printTitle="تنبيهات المخزون"
                  tableId="inventory-alerts-table"
                />
              </div>
            </div>
            <table id="inventory-alerts-table">
              <thead>
                <tr>
                  <th>المادة</th>
                  <th>المتاح</th>
                  <th>الحد الأدنى</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={5}>لا توجد بيانات</td>
                  </tr>
                ) : (
                  filteredStock.map((item) => {
                    const ratio = item.minStock > 0 ? item.stock / item.minStock : 0;
                    const critical = ratio <= 0.5;
                    return (
                      <tr key={item.id} data-status="low">
                        <td>{item.name}</td>
                        <td>{num2(item.stock)}</td>
                        <td>{num2(item.minStock)}</td>
                        <td>
                          <span className={`badge ${critical ? "danger" : "warn"}`}>
                            {critical ? "حرج" : "تنبيه"}
                          </span>
                        </td>
                        <td>
                          <RowActions
                            onView={() => openMaterialModal("view", item.id)}
                            onEdit={() => openMaterialModal("edit", item.id)}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InlineModal
        open={Boolean(materialModal)}
        title={
          materialModal?.mode === "create"
            ? "إضافة مادة خام"
            : materialModal?.mode === "edit"
              ? "تعديل مادة خام"
              : "عرض مادة خام"
        }
        onClose={() => setMaterialModal(null)}
      >
        {materialModal?.mode === "view" && selectedMaterial ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>الاسم</span>
                <strong>{selectedMaterial.name}</strong>
              </div>
              <div className="row-line">
                <span>الوحدة</span>
                <strong>{selectedMaterial.unit}</strong>
              </div>
              <div className="row-line">
                <span>التكلفة</span>
                <strong>{money(selectedMaterial.cost)}</strong>
              </div>
              <div className="row-line">
                <span>المتاح</span>
                <strong>{num2(selectedMaterial.stock)}</strong>
              </div>
              <div className="row-line">
                <span>الحد الأدنى</span>
                <strong>{num2(selectedMaterial.minStock)}</strong>
              </div>
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={submitMaterial}>
            <label>اسم المادة</label>
            <input
              type="text"
              value={materialForm.name}
              onChange={(event) => setMaterialForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <label>الوحدة</label>
            <input
              type="text"
              value={materialForm.unit}
              onChange={(event) => setMaterialForm((prev) => ({ ...prev, unit: event.target.value }))}
              required
            />
            <label>تكلفة الوحدة</label>
            <input
              type="number"
              value={materialForm.cost}
              onChange={(event) => setMaterialForm((prev) => ({ ...prev, cost: Number(event.target.value || 0) }))}
              required
            />
            <label>المتاح</label>
            <input
              type="number"
              value={materialForm.stock}
              onChange={(event) => setMaterialForm((prev) => ({ ...prev, stock: Number(event.target.value || 0) }))}
              required
            />
            <label>الحد الأدنى</label>
            <input
              type="number"
              value={materialForm.minStock}
              onChange={(event) =>
                setMaterialForm((prev) => ({ ...prev, minStock: Number(event.target.value || 0) }))
              }
              required
            />
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
          </form>
        )}
      </InlineModal>

      <InlineModal
        open={Boolean(purchaseModal)}
        title={
          purchaseModal?.mode === "create"
            ? "إضافة فاتورة مشتريات"
            : purchaseModal?.mode === "edit"
              ? "تعديل فاتورة مشتريات"
              : "عرض فاتورة مشتريات"
        }
        onClose={() => setPurchaseModal(null)}
      >
        {purchaseModal?.mode === "view" && selectedPurchase ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>الكود</span>
                <strong>{selectedPurchase.code}</strong>
              </div>
              <div className="row-line">
                <span>المورد</span>
                <strong>{selectedPurchase.supplier}</strong>
              </div>
              <div className="row-line">
                <span>المنتج</span>
                <strong>{selectedPurchase.material}</strong>
              </div>
              <div className="row-line">
                <span>الكمية</span>
                <strong>{num2(selectedPurchase.quantity)}</strong>
              </div>
              <div className="row-line">
                <span>تكلفة الوحدة</span>
                <strong>{money(selectedPurchase.unitCost)}</strong>
              </div>
              <div className="row-line">
                <span>التاريخ</span>
                <strong>{selectedPurchase.date}</strong>
              </div>
              <div className="row-line">
                <span>الإجمالي</span>
                <strong>{money(selectedPurchase.total)}</strong>
              </div>
              <div className="row-line">
                <span>الحالة</span>
                <strong>{translateStatus(selectedPurchase.status)}</strong>
              </div>
              {selectedPurchase.notes ? (
                <div className="row-line">
                  <span>ملاحظات</span>
                  <strong>{selectedPurchase.notes}</strong>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={submitPurchase}>
            <label>التاريخ</label>
            <input
              type="date"
              value={purchaseForm.date}
              onChange={(event) => setPurchaseForm((prev) => ({ ...prev, date: event.target.value }))}
              required
            />
            <label>المورد</label>
            <select
              value={purchaseForm.supplierId}
              onChange={(event) => setPurchaseForm((prev) => ({ ...prev, supplierId: event.target.value }))}
            >
              <option value="">بدون مورد</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <label>المنتج</label>
            <select
              value={purchaseForm.materialId}
              onChange={(event) => setPurchaseForm((prev) => ({ ...prev, materialId: event.target.value }))}
              required
            >
              {materials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <label>الكمية</label>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={purchaseForm.quantity}
              onChange={(event) =>
                setPurchaseForm((prev) => ({ ...prev, quantity: Number(event.target.value || 0) }))
              }
              required
            />
            <label>تكلفة الوحدة</label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={purchaseForm.unitCost}
              onChange={(event) =>
                setPurchaseForm((prev) => ({ ...prev, unitCost: Number(event.target.value || 0) }))
              }
              required
            />
            <label>الإجمالي</label>
            <input
              type="number"
              value={purchaseForm.total}
              readOnly
            />
            <label>الحالة</label>
            <select
              value={purchaseForm.status}
              onChange={(event) =>
                setPurchaseForm((prev) => ({
                  ...prev,
                  status: event.target.value as "posted" | "draft" | "cancelled",
                }))
              }
            >
              <option value="posted">مرحلة</option>
              <option value="draft">مسودة</option>
              <option value="cancelled">ملغاة</option>
            </select>
            <label>ملاحظات</label>
            <input
              type="text"
              value={purchaseForm.notes}
              onChange={(event) => setPurchaseForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
          </form>
        )}
      </InlineModal>

      <InlineModal
        open={Boolean(wasteModal)}
        title={
          wasteModal?.mode === "create"
            ? "تسجيل هدر"
            : wasteModal?.mode === "edit"
              ? "تعديل هدر"
              : "عرض هدر"
        }
        onClose={() => setWasteModal(null)}
      >
        {wasteModal?.mode === "view" && selectedWaste ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>المادة</span>
                <strong>{selectedWaste.material}</strong>
              </div>
              <div className="row-line">
                <span>الكمية</span>
                <strong>{num2(selectedWaste.qty)}</strong>
              </div>
              <div className="row-line">
                <span>السبب</span>
                <strong>{selectedWaste.reason}</strong>
              </div>
              <div className="row-line">
                <span>التكلفة</span>
                <strong>{money(selectedWaste.cost)}</strong>
              </div>
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={submitWaste}>
            <label>التاريخ</label>
            <input
              type="date"
              value={wasteForm.date}
              onChange={(event) => setWasteForm((prev) => ({ ...prev, date: event.target.value }))}
              required
            />
            <label>المادة</label>
            <select
              value={wasteForm.materialId}
              onChange={(event) => setWasteForm((prev) => ({ ...prev, materialId: event.target.value }))}
              required
            >
              {materials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <label>الكمية</label>
            <input
              type="number"
              value={wasteForm.qty}
              onChange={(event) => setWasteForm((prev) => ({ ...prev, qty: Number(event.target.value || 0) }))}
              required
            />
            <label>السبب</label>
            <input
              type="text"
              value={wasteForm.reason}
              onChange={(event) => setWasteForm((prev) => ({ ...prev, reason: event.target.value }))}
              required
            />
            <label>التكلفة</label>
            <input
              type="number"
              value={wasteForm.cost}
              onChange={(event) => setWasteForm((prev) => ({ ...prev, cost: Number(event.target.value || 0) }))}
              required
            />
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
          </form>
        )}
      </InlineModal>
    </section>
  );
}
