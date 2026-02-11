"use client";

import InlineModal from "@/components/ui/InlineModal";

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
          <button className="ghost" type="button" onClick={onClose}>
            {cancelLabel}
          </button>
          <button className={destructive ? "danger-btn" : "primary"} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="modal-body">
        <p>{message}</p>
      </div>
    </InlineModal>
  );
}
