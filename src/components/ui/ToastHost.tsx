"use client";

import { useToast } from "@/context/ToastContext";

export default function ToastHost() {
  const { toasts } = useToast();

  return (
    <div className="toast-host">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
