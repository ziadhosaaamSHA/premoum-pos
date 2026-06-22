import { ReceiptSnapshot } from "@/lib/receipt";
import type { BusinessMode } from "@/lib/businessMode";

export type PosCategory = {
  id: string;
  name: string;
  description: string | null;
};

export type PosProduct = {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  label: string;
  imageUrl: string | null;
  isActive: boolean;
  maxQty: number | null;
};

export type PosMaterial = {
  id: string;
  name: string;
  unit: string;
  stock: number;
};

export type PosZone = {
  id: string;
  name: string;
  limit: number;
  fee: number;
  minOrder: number;
  status: "active" | "inactive";
};

export type PosTable = {
  id: string;
  name: string;
  number: number;
  status: "empty" | "occupied";
  orderId: string | null;
  activeOrder: {
    id: string;
    code: string;
    customer: string;
    status: "preparing" | "ready" | "out" | "delivered" | "cancelled";
  } | null;
};

export type PosTax = {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
};

export type { BusinessMode };

export type ProductCartItem = {
  id: string;
  type: "product";
  productId: string;
  qty: number;
};

export type CustomCartItem = {
  id: string;
  type: "custom";
  name: string;
  unitPrice: number;
  qty: number;
  recipeProductId: string | null;
  materials: Array<{
    materialId: string;
    quantity: number;
  }>;
};

export type CartItem = ProductCartItem | CustomCartItem;

export type OrderTypeUi = "dine_in" | "takeaway" | "delivery";
export type PaymentUi = "cash" | "card" | "wallet" | "mixed";

export type PosOrder = {
  id: string;
  code: string;
  type: "dine_in" | "takeaway" | "delivery";
  status: "preparing" | "ready" | "out" | "delivered" | "cancelled";
  customer: string;
  tableId: string | null;
  tableName: string | null;
  tableNumber: number | null;
  zoneName: string | null;
  discount: number;
  taxRate: number;
  taxAmount: number;
  payment: PaymentUi;
  notes: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  receiptSnapshot: ReceiptSnapshot | null;
  createdAt: string;
  items: Array<{
    id: string;
    name: string;
    qty: number;
    unitPrice: number;
    totalPrice: number;
  }>;
};

export type FinishAdjustment = {
  itemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  deductQty: number;
};

export type DeferredPricing = {
  discountRate: number;
  extraTaxRate: number;
  locked: boolean;
};
