"use client";

import { Page, PageLoading } from "@/components/ui";
import { useFinancePage } from "../hooks/useFinancePage";
import FinanceKpis from "./FinanceKpis";
import ExpenseModal from "./modals/ExpenseModal";
import FinanceTabs from "./tables/FinanceTabs";

export default function FinancePageClient() {
  const state = useFinancePage();

  if (state.loading && !state.data) {
    return (
      <Page>
        <PageLoading message="جارٍ تحميل بيانات المالية..." />
      </Page>
    );
  }

  return (
    <Page>
      <FinanceKpis data={state.data} />
      <FinanceTabs state={state} />
      <ExpenseModal {...state} />
    </Page>
  );
}
