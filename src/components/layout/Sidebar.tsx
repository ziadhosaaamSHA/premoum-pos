"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/routes";
import { useAuth } from "@/context/AuthContext";

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
};

export default function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();

  const visibleItems = navItems.filter((item) => {
    if (!user) return false;
    return hasPermission(item.permission);
  });

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <div className="brand">
          <span className="brand-full">بريميوم POS</span>
          <span className="brand-mini">P</span>
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
