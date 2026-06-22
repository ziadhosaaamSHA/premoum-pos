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
  const visibleTabs = state.retailMode ? productTabs.filter((tab) => tab.value !== "recipes") : productTabs;

  return (
    <>
      <Tabs value={state.activeTab} items={visibleTabs} onChange={state.setActiveTab} />
      {state.activeTab === "products" ? <ProductsTable {...state} /> : null}
      {!state.retailMode && state.activeTab === "recipes" ? <RecipesTable {...state} /> : null}
      {state.activeTab === "categories" ? <CategoriesTable {...state} /> : null}
    </>
  );
}
