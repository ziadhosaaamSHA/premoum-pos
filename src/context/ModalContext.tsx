"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type ModalContextValue = {
  activeModal: string | null;
  modalPayload: Record<string, unknown> | null;
  openModal: (id: string, payload?: Record<string, unknown> | null) => void;
  closeModal: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalPayload, setModalPayload] = useState<Record<string, unknown> | null>(null);

  const value = useMemo(
    () => ({
      activeModal,
      modalPayload,
      openModal: (id: string, payload: Record<string, unknown> | null = null) => {
        setActiveModal(id);
        setModalPayload(payload);
      },
      closeModal: () => {
        setActiveModal(null);
        setModalPayload(null);
      },
    }),
    [activeModal, modalPayload]
  );

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within ModalProvider");
  }
  return context;
}
