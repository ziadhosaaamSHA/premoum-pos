import { EntityModal } from "@/components/ui";
import { ReportsPageState } from "../../hooks/useReportsPage";

type ReportDetailsModalProps = Pick<ReportsPageState, "reportModal" | "setReportModal">;

export default function ReportDetailsModal({ reportModal, setReportModal }: ReportDetailsModalProps) {
  return (
    <EntityModal
      open={Boolean(reportModal)}
      title={reportModal?.title || "عرض التقرير"}
      onClose={() => setReportModal(null)}
      isView={Boolean(reportModal)}
      details={reportModal?.rows ?? []}
    >
      {null}
    </EntityModal>
  );
}
