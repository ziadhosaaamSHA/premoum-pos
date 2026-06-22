import type { BusinessMode } from "@/lib/businessMode";

export type ProductsTab = "products" | "recipes" | "categories";
export type { BusinessMode };

export type CategoryRow = {
  id: string;
  name: string;
  description: string;
  productsCount: number;
};

export type MaterialRef = {
  id: string;
  name: string;
  unit: string;
  cost: number;
};

export type ProductRecipeLine = {
  id: string;
  materialId: string;
  materialName: string;
  unit: string;
  materialCost: number;
  qty: number;
};

export type ProductRow = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  price: number;
  isActive: boolean;
  imageUrl: string | null;
  recipe: ProductRecipeLine[];
  cost: number;
  margin: number;
};

export type ProductModalState = { mode: "view" | "edit" | "create"; id?: string } | null;
export type CategoryModalState = { mode: "view" | "edit" | "create"; id?: string } | null;

export type RecipeDraftLine = {
  materialId: string;
  quantity: number;
};
