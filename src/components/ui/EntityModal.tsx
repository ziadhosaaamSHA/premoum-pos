import { ReactNode } from "react";
import DetailList, { DetailListItem } from "@/components/ui/DetailList";
import InlineModal from "@/components/ui/InlineModal";

type EntityModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  isView: boolean;
  details?: DetailListItem[];
  viewExtra?: ReactNode;
  children: ReactNode;
};

export default function EntityModal({
  open,
  title,
  onClose,
  isView,
  details = [],
  viewExtra,
  children,
}: EntityModalProps) {
  return (
    <InlineModal open={open} title={title} onClose={onClose}>
      {isView ? (
        <>
          <DetailList items={details} />
          {viewExtra}
        </>
      ) : (
        children
      )}
    </InlineModal>
  );
}
