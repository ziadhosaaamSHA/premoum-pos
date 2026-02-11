"use client";

import { AppStateProvider } from "@/context/AppStateContext";
import { AuthProvider } from "@/context/AuthContext";
import { ModalProvider } from "@/context/ModalContext";
import { ToastProvider } from "@/context/ToastContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <ModalProvider>
          <AppStateProvider>{children}</AppStateProvider>
        </ModalProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
