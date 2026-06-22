export type MaterialRow = {
  id: string;
  name: string;
  unit: string;
  cost: number;
  stock: number;
  minStock: number;
  status: "low" | "ok";
};

export type PurchaseRow = {
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

export type WasteRow = {
  id: string;
  date: string;
  materialId: string;
  material: string;
  unit: string;
  qty: number;
  reason: string;
  cost: number;
};

export type SupplierOption = {
  id: string;
  name: string;
};

export type MaterialModalState = { mode: "view" | "edit" | "create"; id?: string } | null;
export type PurchaseModalState = { mode: "view" | "edit" | "create"; id?: string } | null;
export type WasteModalState = { mode: "view" | "edit" | "create"; id?: string } | null;
