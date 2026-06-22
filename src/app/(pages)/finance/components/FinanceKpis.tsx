import { KpiCard, KpiGrid } from "@/components/ui";
import { money } from "@/lib/format";
import { FinancePageState } from "../hooks/useFinancePage";

type FinanceKpisProps = Pick<FinancePageState, "data">;

export default function FinanceKpis({ data }: FinanceKpisProps) {
  return (
    <KpiGrid>
      <KpiCard label="الإيرادات" value={money(data?.kpis.revenue || 0)} description="إجمالي المبيعات" />
      <KpiCard label="المصروفات" value={money(data?.kpis.expenses || 0)} description="تشغيلية وموارد بشرية" />
      <KpiCard label="الأرباح" value={money(data?.kpis.profit || 0)} description="بعد خصم COGS" />
      <KpiCard label="تكلفة البضاعة" value={money(data?.kpis.cogs || 0)} description="مأخوذة من الوصفات" />
    </KpiGrid>
  );
}
