import { KpiCard, KpiGrid } from "@/components/ui";
import { money } from "@/lib/format";
import { SalesPageState } from "../hooks/useSalesPage";

type SalesKpisProps = Pick<SalesPageState, "totals">;

export default function SalesKpis({ totals }: SalesKpisProps) {
  return (
    <KpiGrid>
      <KpiCard label="إجمالي المبيعات" value={money(totals.totalRevenue)} description="قيمة الفواتير المسجلة" />
      <KpiCard label="فواتير مدفوعة" value={totals.paidCount} description="تم تحصيلها بالكامل" />
      <KpiCard label="فواتير مسودة" value={totals.draftCount} description="بانتظار الاعتماد" />
      <KpiCard label="فواتير محذوفة" value={totals.voidCount} description="مستبعدة من الإجماليات" />
    </KpiGrid>
  );
}
