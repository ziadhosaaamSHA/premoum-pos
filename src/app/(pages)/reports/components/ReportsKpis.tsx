import { CardGrid, KpiCard } from "@/components/ui";
import { money } from "@/lib/format";
import { ReportsPageState } from "../hooks/useReportsPage";

type ReportsKpisProps = Pick<ReportsPageState, "data">;

export default function ReportsKpis({ data }: ReportsKpisProps) {
  return (
    <CardGrid className="report-grid">
      <KpiCard label="مبيعات اليوم" value={money(data?.insights.todaySales || 0)} />
      <KpiCard label="مبيعات شهرية" value={money(data?.insights.monthSales || 0)} />
      <KpiCard label="الهدر" value={money(data?.insights.wasteCost || 0)} />
      <KpiCard label="مشتريات المخزون" value={money(data?.insights.purchasesTotal || 0)} />
      <KpiCard label="تقييم المخزون" value={money(data?.insights.inventoryValue || 0)} />
    </CardGrid>
  );
}
