"use client";

import { AppStateProvider } from "@/context/AppStateContext";
import { AuthProvider } from "@/context/AuthContext";
import { BrandingProvider } from "@/context/BrandingContext";
import { ModalProvider } from "@/context/ModalContext";
import { ToastProvider } from "@/context/ToastContext";
import { ThemeProvider } from "@/context/ThemeContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ThemeProvider>
        <BrandingProvider>
          <AuthProvider>
            <ModalProvider>
              <AppStateProvider>{children}</AppStateProvider>
            </ModalProvider>
          </AuthProvider>
        </BrandingProvider>
      </ThemeProvider>
    </ToastProvider>
  );
}
