"use client";

import { usePathname } from "next/navigation";
import ToastHost from "@/components/ui/ToastHost";

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shellClass = pathname === "/setup" ? "setup-shell" : "auth-shell";

  return (
    <div className={shellClass}>
      {children}
      <ToastHost />
    </div>
  );
}
