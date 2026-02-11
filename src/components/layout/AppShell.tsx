"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import UserActions from "@/components/layout/UserActions";
import Modals from "@/components/modals/Modals";
import ToastHost from "@/components/ui/ToastHost";
import { useAuth } from "@/context/AuthContext";
import { getRequiredPermission, navItems } from "@/lib/routes";
import useLocalStorageBoolean from "@/lib/useLocalStorageBoolean";
import useMediaQuery from "@/lib/useMediaQuery";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, authenticated, hasPermission } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isCompact = useMediaQuery("(max-width: 1100px)");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [storedCollapsed, setStoredCollapsed] = useLocalStorageBoolean("sidebarCollapsed", false);

  const isAuthRoute = pathname === "/login" || pathname === "/accept-invite";
  const requiredPermission = getRequiredPermission(pathname);
  const hasRoutePermission = !requiredPermission || hasPermission(requiredPermission);

  const fallbackRoute = useMemo(() => {
    const firstAllowed = navItems.find((item) => hasPermission(item.permission));
    return firstAllowed?.href || "/dashboard";
  }, [hasPermission]);

  const sidebarCollapsed = !isMobile && storedCollapsed;
  const sidebarOpen = isMobile && mobileOpen;

  useEffect(() => {
    if (loading) return;

    if (isAuthRoute) {
      if (authenticated) {
        router.replace(fallbackRoute);
      }
      return;
    }

    if (!authenticated) {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
      return;
    }

    if (!hasRoutePermission) {
      router.replace(fallbackRoute);
    }
  }, [
    authenticated,
    fallbackRoute,
    hasRoutePermission,
    isAuthRoute,
    loading,
    pathname,
    router,
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

  if (isAuthRoute) {
    if (loading) {
      return (
        <div className="auth-shell">
          <section className="auth-card">
            <div className="auth-brand">
              <h1>Premium POS</h1>
              <p>جارٍ التحقق من الجلسة...</p>
            </div>
          </section>
          <ToastHost />
        </div>
      );
    }

    if (authenticated) {
      return (
        <div className="auth-shell">
          <ToastHost />
        </div>
      );
    }

    return (
      <div className="auth-shell">
        {children}
        <ToastHost />
      </div>
    );
  }

  if (loading || !authenticated || !hasRoutePermission) {
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <div className="auth-brand">
            <h1>Premium POS</h1>
            <p>جارٍ تحميل بيانات المستخدم...</p>
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
        onToggleCollapse={toggleCollapse}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />
      <main className="content">
        {isCompact && (
          <div className="sticky-actions">
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
