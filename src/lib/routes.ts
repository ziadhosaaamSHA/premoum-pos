export type NavItem = {
  id: string;
  href: string;
  icon: string;
  label: string;
  subtitle: string;
  permission: string;
};

export const navItems: NavItem[] = [
  { id: "dashboard", href: "/dashboard", icon: "bx bx-grid-alt", label: "لوحة التحكم", subtitle: "ملخص اليوم التشغيلي للنظام", permission: "dashboard:view" },
  { id: "pos", href: "/pos", icon: "bx bx-cart-alt", label: "الكاشير", subtitle: "إدارة الطلبات السريعة ونقاط البيع", permission: "pos:use" },
  { id: "orders", href: "/orders", icon: "bx bx-table", label: "الطلبيات", subtitle: "متابعة حالة الطلبات وسجلها", permission: "orders:view" },
  { id: "sales", href: "/sales", icon: "bx bx-receipt", label: "المبيعات", subtitle: "الفواتير والتحليلات اليومية", permission: "sales:view" },
  { id: "inventory", href: "/inventory", icon: "bx bx-box", label: "المخزون", subtitle: "مواد خام، مشتريات، والهدر", permission: "inventory:view" },
  { id: "products", href: "/products", icon: "bx bx-package", label: "المنتجات", subtitle: "إدارة المنتجات والوصفات", permission: "products:view" },
  { id: "suppliers", href: "/suppliers", icon: "bx bx-store", label: "الموردون", subtitle: "بيانات الموردين والتوريد", permission: "suppliers:view" },
  { id: "delivery", href: "/delivery", icon: "bx bx-car", label: "التوصيل", subtitle: "النطاقات والطيارين والمتابعة", permission: "delivery:view" },
  { id: "finance", href: "/finance", icon: "bx bx-coin-stack", label: "التكاليف والمالية", subtitle: "الإيرادات والمصروفات والأرباح", permission: "finance:view" },
  { id: "reports", href: "/reports", icon: "bx bx-bar-chart-alt-2", label: "التقارير", subtitle: "تقارير التشغيل والمبيعات", permission: "reports:view" },
  { id: "hr", href: "/hr", icon: "bx bx-group", label: "الموظفون", subtitle: "إدارة الموظفين والورديات", permission: "hr:view" },
  { id: "backup", href: "/backup", icon: "bx bx-cloud-upload", label: "النسخ الاحتياطي", subtitle: "نسخ واستعادة البيانات", permission: "backup:view" },
  { id: "settings", href: "/settings", icon: "bx bx-cog", label: "الإعدادات", subtitle: "الأدوار والصلاحيات العامة", permission: "settings:view" },
];

export const pageMeta = navItems.reduce(
  (acc, item) => {
    acc[item.href] = [item.label, item.subtitle];
    return acc;
  },
  {} as Record<string, [string, string]>
);

export function getPageMeta(pathname: string) {
  if (pathname === "/notifications" || pathname.startsWith("/notifications/")) {
    return ["التنبيهات", "تنبيهات المخزون والطلبات والمبيعات"] as [string, string];
  }
  if (pageMeta[pathname]) return pageMeta[pathname];
  const found = navItems.find((item) => pathname.startsWith(item.href));
  if (found) return [found.label, found.subtitle] as [string, string];
  return ["لوحة التحكم", "ملخص اليوم التشغيلي للنظام"] as [string, string];
}

export function getRequiredPermission(pathname: string) {
  if (pathname === "/setup" || pathname.startsWith("/setup/")) {
    return "settings:manage";
  }
  if (pathname === "/notifications" || pathname.startsWith("/notifications/")) {
    return "dashboard:view";
  }
  const found = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return found?.permission ?? null;
}
