import { Tabs } from "@/components/ui";
import { ProductsPageState } from "../../hooks/useProductsPage";
import { ProductsTab } from "../../types";
import CategoriesTable from "./CategoriesTable";
import ProductsTable from "./ProductsTable";
import RecipesTable from "./RecipesTable";

const productTabs = [
  { value: "products", label: "المنتجات", icon: "bx bx-package" },
  { value: "recipes", label: "الوصفات", icon: "bx bx-receipt" },
  { value: "categories", label: "الفئات", icon: "bx bx-category" },
] satisfies Array<{ value: ProductsTab; label: string; icon: string }>;

type ProductsTabsProps = {
  state: ProductsPageState;
};

export default function ProductsTabs({ state }: ProductsTabsProps) {
  return (
    <>
      <Tabs value={state.activeTab} items={productTabs} onChange={state.setActiveTab} />
      {state.activeTab === "products" ? <ProductsTable {...state} /> : null}
      {state.activeTab === "recipes" ? <RecipesTable {...state} /> : null}
      {state.activeTab === "categories" ? <CategoriesTable {...state} /> : null}
    </>
  );
}
