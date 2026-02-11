type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  products: Array<{ id: string }>;
};

export function mapCategory(row: CategoryRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    productsCount: row.products.length,
  };
}

type ProductRow = {
  id: string;
  name: string;
  categoryId: string;
  price: unknown;
  isActive: boolean;
  category: { id: string; name: string } | null;
  recipeItems: Array<{
    id: string;
    materialId: string;
    quantity: unknown;
    material: {
      id: string;
      name: string;
      unit: string;
      cost: unknown;
    };
  }>;
};

export function mapProduct(row: ProductRow) {
  const recipe = row.recipeItems.map((item) => ({
    id: item.id,
    materialId: item.materialId,
    materialName: item.material.name,
    unit: item.material.unit,
    materialCost: Number(item.material.cost),
    qty: Number(item.quantity),
  }));

  const cost = recipe.reduce((sum, item) => sum + item.materialCost * item.qty, 0);
  const price = Number(row.price);
  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;

  return {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    categoryName: row.category?.name || "—",
    price,
    isActive: row.isActive,
    recipe,
    cost,
    margin,
  };
}

type MaterialRow = {
  id: string;
  name: string;
  unit: string;
  cost: unknown;
};

export function mapMaterialReference(row: MaterialRow) {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    cost: Number(row.cost),
  };
}
