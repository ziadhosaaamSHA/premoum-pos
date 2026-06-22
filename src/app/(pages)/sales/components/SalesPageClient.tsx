"use client";

import { Page } from "@/components/ui";
import { useSalesPage } from "../hooks/useSalesPage";
import SalesKpis from "./SalesKpis";
import SalesModals from "./modals/SalesModals";
import SalesTable from "./tables/SalesTable";

export default function SalesPageClient() {
  const state = useSalesPage();

  return (
    <Page>
      <SalesKpis totals={state.totals} />
      <SalesTable {...state} />
      <SalesModals state={state} />
    </Page>
  );
}
