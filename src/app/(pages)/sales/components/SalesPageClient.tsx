"use client";

import { Page, Tabs } from "@/components/ui";
import { useSalesPage } from "../hooks/useSalesPage";
import RetailPaymentPlansPanel from "./retail/RetailPaymentPlansPanel";
import RetailReturnsPanel from "./retail/RetailReturnsPanel";
import SalesKpis from "./SalesKpis";
import SalesModals from "./modals/SalesModals";
import SalesTable from "./tables/SalesTable";

export default function SalesPageClient() {
  const state = useSalesPage();

  return (
    <Page>
      <SalesKpis totals={state.totals} />
      {state.retailMode ? (
        <Tabs
          value={state.activeTab}
          onChange={state.setActiveTab}
          items={[
            { value: "invoices", label: "الفواتير", icon: "bx bx-receipt" },
            { value: "returns", label: "الإرجاع والاستبدال", icon: "bx bx-revision" },
            { value: "payment_plans", label: "التقسيط", icon: "bx bx-credit-card" },
          ]}
        />
      ) : null}
      {!state.retailMode || state.activeTab === "invoices" ? <SalesTable {...state} /> : null}
      {state.retailMode && state.activeTab === "returns" ? <RetailReturnsPanel {...state} /> : null}
      {state.retailMode && state.activeTab === "payment_plans" ? <RetailPaymentPlansPanel {...state} /> : null}
      <SalesModals state={state} />
    </Page>
  );
}
