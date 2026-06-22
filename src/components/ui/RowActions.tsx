"use client";

import { useState } from "react";
import { useToast } from "@/context/ToastContext";
import ConfirmModal from "@/components/ui/ConfirmModal";
import IconButton from "./IconButton";

export type RowActionsProps = {
  onView?: () => void | Promise<void>;
  onEdit?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onPrint?: () => void | Promise<void>;
  disableEdit?: boolean;
  disableDelete?: boolean;
  confirmDelete?: boolean;
  confirmDeleteText?: string;
  viewMessage?: string;
  editMessage?: string;
  printMessage?: string;
  deleteMessage?: string;
};

export default function RowActions({
  onView,
  onEdit,
  onDelete,
  onPrint,
  disableEdit,
  disableDelete,
  confirmDelete = true,
  confirmDeleteText = "هل أنت متأكد من تنفيذ هذا الإجراء؟",
  viewMessage = "تم فتح تفاصيل السجل",
  editMessage = "تم فتح وضع التعديل",
  printMessage = "تم فتح الطباعة",
  deleteMessage,
}: RowActionsProps) {
  const { pushToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const errorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const handleView = () => {
    if (!onView) return;
    void Promise.resolve(onView())
      .then(() => pushToast(viewMessage, "info"))
      .catch((error) => pushToast(errorMessage(error, "تعذر فتح التفاصيل"), "error"));
  };

  const handleEdit = () => {
    if (!onEdit) return;
    void Promise.resolve(onEdit())
      .then(() => pushToast(editMessage, "info"))
      .catch((error) => pushToast(errorMessage(error, "تعذر فتح وضع التعديل"), "error"));
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (confirmDelete) {
      setConfirmOpen(true);
      return;
    }
    void Promise.resolve(onDelete())
      .then(() => pushToast(deleteMessage || "تم تنفيذ الإجراء بنجاح", "success"))
      .catch((error) => pushToast(errorMessage(error, "تعذر تنفيذ الإجراء"), "error"));
  };

  const handlePrint = () => {
    if (!onPrint) return;
    void Promise.resolve(onPrint())
      .then(() => pushToast(printMessage, "info"))
      .catch((error) => pushToast(errorMessage(error, "تعذر فتح الطباعة"), "error"));
  };

  return (
    <>
      <div className="table-actions">
        {onView && (
          <IconButton icon="bx bx-show" variant="view" onClick={handleView} title="عرض" />
        )}
        {onEdit && (
          <IconButton icon="bx bx-edit" variant="edit" onClick={handleEdit} disabled={disableEdit} title="تعديل" />
        )}
        {onPrint && (
          <IconButton icon="bx bx-printer" variant="print" onClick={handlePrint} title="طباعة" />
        )}
        {onDelete && (
          <IconButton
            icon="bx bx-trash"
            variant="delete"
            onClick={handleDelete}
            disabled={disableDelete}
            title="حذف"
          />
        )}
      </div>

      {onDelete ? (
        <ConfirmModal
          open={confirmOpen}
          title="تأكيد الحذف"
          message={confirmDeleteText}
          confirmLabel="تأكيد الحذف"
          destructive
          onClose={() => {
            setConfirmOpen(false);
            pushToast("تم إلغاء العملية", "info");
          }}
          onConfirm={() => {
            void Promise.resolve(onDelete())
              .then(() => {
                setConfirmOpen(false);
                pushToast(deleteMessage || "تم تنفيذ الإجراء بنجاح", "success");
              })
              .catch((error) => {
                setConfirmOpen(false);
                pushToast(errorMessage(error, "تعذر تنفيذ الإجراء"), "error");
              });
          }}
        />
      ) : null}
    </>
  );
}
