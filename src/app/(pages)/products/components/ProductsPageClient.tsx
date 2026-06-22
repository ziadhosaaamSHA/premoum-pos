"use client";

import { Page, PageLoading } from "@/components/ui";
import { useProductsPage } from "../hooks/useProductsPage";
import CategoryModal from "./modals/CategoryModal";
import ProductModal from "./modals/ProductModal";
import ProductsTabs from "./tables/ProductsTabs";

export default function ProductsPageClient() {
  const state = useProductsPage();

  return (
    <Page>
      <ProductsTabs state={state} />
      {state.loading ? <PageLoading message="جارٍ تحميل بيانات المنتجات..." /> : null}
      {!state.loading ? (
        <>
          <ProductModal {...state} />
          <CategoryModal {...state} />
        </>
      ) : null}
    </Page>
  );
}
