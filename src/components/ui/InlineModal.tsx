"use client";

import { ReactNode } from "react";

type InlineModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  tip?: string;
};

export default function InlineModal({
  open,
  title,
  onClose,
  children,
  footer,
  tip = "معلومة: راجع البيانات ثم أكد العملية قبل الحفظ.",
}: InlineModalProps) {
  return (
    <div
      className={`modal-overlay ${open ? "open" : ""}`}
      aria-hidden={!open}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-modal" type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="hint modal-hint">{tip}</p>
        <div className="modal-content">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
