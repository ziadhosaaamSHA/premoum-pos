"use client";

import { Page, PageLoading } from "@/components/ui";
import { useOrdersPage } from "../hooks/useOrdersPage";
import OrdersModals from "./modals/OrdersModals";
import OrdersTabs from "./tables/OrdersTabs";

export default function OrdersPageClient() {
  const state = useOrdersPage();

  return (
    <Page>
      <OrdersTabs state={state} />
      {state.loading ? <PageLoading message="جارٍ تحميل البيانات..." /> : null}
      {!state.loading ? <OrdersModals state={state} /> : null}
    </Page>
  );
}
