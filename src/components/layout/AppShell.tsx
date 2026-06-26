"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import UserActions from "@/components/layout/UserActions";
import Modals from "@/components/modals/Modals";
import ToastHost from "@/components/ui/ToastHost";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { apiRequest } from "@/lib/api";
import type { BusinessMode } from "@/lib/businessMode";
import { getRequiredPermission, navItems } from "@/lib/routes";
import useLocalStorageBoolean from "@/lib/useLocalStorageBoolean";
import useMediaQuery from "@/lib/useMediaQuery";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, authenticated, hasPermission } = useAuth();
  const { branding } = useBranding();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isCompact = useMediaQuery("(max-width: 1100px)");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [storedCollapsed, setStoredCollapsed] = useLocalStorageBoolean("sidebarCollapsed", false);
  const [businessMode, setBusinessMode] = useState<BusinessMode>("cafe_restaurant");

  const canManageSettings = hasPermission("settings:manage");
  const requiredPermission = getRequiredPermission(pathname);
  const hasRoutePermission = !requiredPermission || hasPermission(requiredPermission);

  const fallbackRoute = useMemo(() => {
    const firstAllowed = navItems.find(
      (item) => hasPermission(item.permission) && !item.hiddenInModes?.includes(businessMode)
    );
    return firstAllowed?.href || "/dashboard";
  }, [businessMode, hasPermission]);

  const sidebarCollapsed = !isMobile && storedCollapsed;
  const sidebarOpen = isMobile && mobileOpen;
  const [setupStatus, setSetupStatus] = useState<
    "loading" | "first-launch" | "complete" | "incomplete"
  >("loading");

  useEffect(() => {
    if (loading) return;
    let active = true;

    void (async () => {
      try {
        const payload = await apiRequest<{ setup: { isComplete: boolean; hasOwner: boolean; businessMode: BusinessMode } }>(
          "/api/system/setup"
        );
        if (!active) return;
        setBusinessMode(payload.setup.businessMode || "cafe_restaurant");
        if (!payload.setup.hasOwner) {
          setSetupStatus("first-launch");
          return;
        }
        setSetupStatus(payload.setup.isComplete ? "complete" : "incomplete");
      } catch {
        if (active) setSetupStatus("complete");
      }
    })();

    return () => {
      active = false;
    };
  }, [loading, authenticated]);

  useEffect(() => {
    const handleBusinessModeUpdated = (event: Event) => {
      const nextMode = (event as CustomEvent<BusinessMode>).detail;
      if (nextMode === "retail" || nextMode === "cafe_restaurant") {
        setBusinessMode(nextMode);
      }
    };

    window.addEventListener("business-mode-updated", handleBusinessModeUpdated);
    return () => window.removeEventListener("business-mode-updated", handleBusinessModeUpdated);
  }, []);

  useEffect(() => {
    if (loading || setupStatus === "loading") return;

    if (!authenticated) {
      if (setupStatus === "first-launch") {
        router.replace("/setup");
        return;
      }
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
      return;
    }

    if (!hasRoutePermission) {
      router.replace(fallbackRoute);
      return;
    }

    if (setupStatus === "incomplete" && canManageSettings) {
      router.replace("/setup");
      return;
    }
  }, [
    authenticated,
    canManageSettings,
    fallbackRoute,
    hasRoutePermission,
    loading,
    pathname,
    router,
    setupStatus,
  ]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [sidebarOpen]);

  useEffect(() => {
    if (!isMobile) return;
    document.body.classList.toggle("no-scroll", sidebarOpen);
    return () => document.body.classList.remove("no-scroll");
  }, [isMobile, sidebarOpen]);

  const toggleCollapse = () => {
    const next = !storedCollapsed;
    setStoredCollapsed(next);
  };
  const stickyActionsClassName = `sticky-actions ${isMobile ? "justify-between" : "justify-end"}`;

  if (loading || setupStatus === "loading" || !authenticated || !hasRoutePermission) {
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <div className="auth-brand">
            <h1>{branding.brandName}</h1>
            <p>{branding.brandTagline || "جارٍ تحميل بيانات المستخدم..."}</p>
          </div>
        </section>
        <ToastHost />
      </div>
    );
  }

  return (
    <div className={`app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={sidebarOpen}
        businessMode={businessMode}
        onToggleCollapse={toggleCollapse}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />
      <main className="content">
        {isCompact && (
          <div className={stickyActionsClassName}>
            {isMobile && (
              <button className="icon-btn menu-btn" onClick={() => setMobileOpen(true)} type="button">
                <i className="bx bx-menu"></i>
              </button>
            )}
            <UserActions />
          </div>
        )}
        <Topbar onMenuToggle={() => setMobileOpen(true)} compact={isCompact} />
        {children}
      </main>
      <Modals />
      <ToastHost />
    </div>
  );
}
