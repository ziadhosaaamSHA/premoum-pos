"use client";

import { useState } from "react";
import { useToast } from "@/context/ToastContext";
import ConfirmModal from "@/components/ui/ConfirmModal";

type RowActionsProps = {
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

  const handleView = () => {
    if (!onView) return;
    void Promise.resolve(onView())
      .then(() => pushToast(viewMessage, "info"))
      .catch(() => pushToast("تعذر فتح التفاصيل", "error"));
  };

  const handleEdit = () => {
    if (!onEdit) return;
    void Promise.resolve(onEdit())
      .then(() => pushToast(editMessage, "info"))
      .catch(() => pushToast("تعذر فتح وضع التعديل", "error"));
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (confirmDelete) {
      setConfirmOpen(true);
      return;
    }
    void Promise.resolve(onDelete())
      .then(() => pushToast(deleteMessage || "تم تنفيذ الإجراء بنجاح", "success"))
      .catch(() => pushToast("تعذر تنفيذ الإجراء", "error"));
  };

  const handlePrint = () => {
    if (!onPrint) return;
    void Promise.resolve(onPrint())
      .then(() => pushToast(printMessage, "info"))
      .catch(() => pushToast("تعذر فتح الطباعة", "error"));
  };

  return (
    <>
      <div className="table-actions">
        {onView && (
          <button className="action-btn view" type="button" onClick={handleView} title="عرض">
            <i className="bx bx-show"></i>
          </button>
        )}
        {onEdit && (
          <button className="action-btn edit" type="button" onClick={handleEdit} disabled={disableEdit} title="تعديل">
            <i className="bx bx-edit"></i>
          </button>
        )}
        {onPrint && (
          <button className="action-btn print" type="button" onClick={handlePrint} title="طباعة">
            <i className="bx bx-printer"></i>
          </button>
        )}
        {onDelete && (
          <button
            className="action-btn delete"
            type="button"
            onClick={handleDelete}
            disabled={disableDelete}
            title="حذف"
          >
            <i className="bx bx-trash"></i>
          </button>
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
              .catch(() => {
                setConfirmOpen(false);
                pushToast("تعذر تنفيذ الإجراء", "error");
              });
          }}
        />
      ) : null}
    </>
  );
}
