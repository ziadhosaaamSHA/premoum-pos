"use client";

import { Page } from "@/components/ui";
import { useReportsPage } from "../hooks/useReportsPage";
import ReportDetailsModal from "./modals/ReportDetailsModal";
import ReportsKpis from "./ReportsKpis";
import ReportsTabs from "./tables/ReportsTabs";

export default function ReportsPageClient() {
  const state = useReportsPage();

  return (
    <Page>
      <ReportsKpis data={state.data} />
      <ReportsTabs state={state} />
      <ReportDetailsModal {...state} />
    </Page>
  );
}
