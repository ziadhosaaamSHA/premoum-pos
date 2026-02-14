"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import { navItems } from "@/lib/routes";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { apiRequest } from "@/lib/api";

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
};

export default function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const { branding } = useBranding();
  const prefetched = useRef(new Set<string>());

  const prefetchMap: Record<string, string[]> = {
    "/dashboard": ["/api/dashboard/overview"],
    "/pos": ["/api/pos/bootstrap"],
    "/orders": ["/api/orders", "/api/tables"],
    "/sales": ["/api/sales"],
    "/inventory": ["/api/inventory/bootstrap"],
    "/products": ["/api/products/bootstrap"],
    "/suppliers": ["/api/suppliers"],
    "/delivery": ["/api/delivery/bootstrap"],
    "/finance": ["/api/finance/bootstrap"],
    "/reports": ["/api/reports/bootstrap"],
    "/hr": ["/api/hr/bootstrap"],
    "/backup": ["/api/backup/bootstrap"],
    "/settings": ["/api/admin/permissions", "/api/admin/roles", "/api/admin/users", "/api/admin/invites", "/api/settings/taxes"],
  };

  const handlePrefetch = useCallback(
    (href: string) => {
      if (prefetched.current.has(href)) return;
      prefetched.current.add(href);
      router.prefetch(href);
      const endpoints = prefetchMap[href];
      if (!endpoints) return;
      endpoints.forEach((endpoint) => {
        void apiRequest<Record<string, unknown>>(endpoint, { cacheTtl: 60_000 }).catch(() => undefined);
      });
    },
    [router]
  );

  const visibleItems = navItems.filter((item) => {
    if (!user) return false;
    return hasPermission(item.permission);
  });

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <div className="brand">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.brandName} className="brand-logo" />
          ) : (
            <span className="brand-avatar">{branding.brandName.slice(0, 1)}</span>
          )}
          <span className="brand-full">{branding.brandName}</span>
        </div>
        <button
          className="icon-btn collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
          type="button"
        >
          <i className="bx bx-chevrons-left"></i>
        </button>
      </div>

      <nav className="nav">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={onCloseMobile}
              onMouseEnter={() => handlePrefetch(item.href)}
              onFocus={() => handlePrefetch(item.href)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footnote">نظام نقاط بيع متكامل لإدارة التشغيل والربحية.</span>
      </div>
    </aside>
  );
}
