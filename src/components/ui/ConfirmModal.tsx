"use client";

import InlineModal from "@/components/ui/InlineModal";
import Button from "./Button";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <InlineModal
      open={open}
      title={title}
      onClose={onClose}
      tip="معلومة: تأكد من هذا الإجراء لأنه قد يؤثر على البيانات."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="modal-body">
        <p>{message}</p>
      </div>
    </InlineModal>
  );
}
