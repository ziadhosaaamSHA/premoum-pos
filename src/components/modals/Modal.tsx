"use client";

import { ReactNode } from "react";
import { useModal } from "@/context/ModalContext";

type ModalProps = {
  id: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function Modal({ id, title, children, footer }: ModalProps) {
  const { activeModal, closeModal } = useModal();
  const open = activeModal === id;

  return (
    <div
      className={`modal-overlay ${open ? "open" : ""}`}
      aria-hidden={!open}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-modal" type="button" onClick={closeModal}>
            ×
          </button>
        </div>
        <p className="hint modal-hint">معلومة: تحقق من المدخلات قبل حفظ أي تغيير.</p>
        {children}
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
