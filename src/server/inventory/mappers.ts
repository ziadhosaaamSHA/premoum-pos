import { PurchaseStatus } from "@prisma/client";

const purchaseStatusToUi: Record<PurchaseStatus, "posted" | "draft" | "cancelled"> = {
  [PurchaseStatus.POSTED]: "posted",
  [PurchaseStatus.DRAFT]: "draft",
  [PurchaseStatus.CANCELLED]: "cancelled",
};

const purchaseStatusFromUi: Record<"posted" | "draft" | "cancelled", PurchaseStatus> = {
  posted: PurchaseStatus.POSTED,
  draft: PurchaseStatus.DRAFT,
  cancelled: PurchaseStatus.CANCELLED,
};

export function toPurchaseStatus(value: "posted" | "draft" | "cancelled") {
  return purchaseStatusFromUi[value];
}

export function fromPurchaseStatus(value: PurchaseStatus) {
  return purchaseStatusToUi[value];
}

export function parseUiDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

type MaterialRow = {
  id: string;
  name: string;
  unit: string;
  cost: unknown;
  stock: unknown;
  minStock: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export function mapMaterial(row: MaterialRow) {
  const stock = Number(row.stock);
  const minStock = Number(row.minStock);
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    cost: Number(row.cost),
    stock,
    minStock,
    status: stock <= minStock ? "low" : "ok",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type PurchaseRow = {
  id: string;
  code: string;
  date: Date;
  total: unknown;
  status: PurchaseStatus;
  notes: string | null;
  supplier: { id: string; name: string };
  items: Array<{
    materialId: string;
    quantity: unknown;
    unitCost: unknown;
    material: { id: string; name: string };
  }>;
};

export function mapPurchase(row: PurchaseRow) {
  const firstItem = row.items[0];
  return {
    id: row.id,
    code: row.code,
    date: row.date.toISOString().slice(0, 10),
    supplierId: row.supplier.id,
    supplier: row.supplier.name,
    materialId: firstItem?.materialId || null,
    material: firstItem?.material?.name || "—",
    quantity: firstItem ? Number(firstItem.quantity) : 0,
    unitCost: firstItem ? Number(firstItem.unitCost) : 0,
    total: Number(row.total),
    status: fromPurchaseStatus(row.status),
    notes: row.notes,
  };
}

type WasteRow = {
  id: string;
  date: Date;
  quantity: unknown;
  reason: string;
  cost: unknown;
  material: {
    id: string;
    name: string;
    unit: string;
  };
};

export function mapWaste(row: WasteRow) {
  return {
    id: row.id,
    date: row.date.toISOString().slice(0, 10),
    materialId: row.material.id,
    material: row.material.name,
    unit: row.material.unit,
    qty: Number(row.quantity),
    reason: row.reason,
    cost: Number(row.cost),
  };
}
