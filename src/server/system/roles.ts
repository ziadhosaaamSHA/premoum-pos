import { PrismaClient, Prisma } from "@prisma/client";

export type PermissionSeed = { code: string; label: string };

export const DEFAULT_PERMISSIONS: PermissionSeed[] = [
  { code: "dashboard:view", label: "عرض لوحة التحكم" },
  { code: "pos:use", label: "استخدام الكاشير" },
  { code: "orders:view", label: "عرض الطلبات" },
  { code: "orders:manage", label: "إدارة الطلبات" },
  { code: "orders:delete", label: "حذف الطلبات" },
  { code: "sales:view", label: "عرض المبيعات" },
  { code: "sales:manage", label: "إدارة الفواتير" },
  { code: "sales:approve", label: "اعتماد الفواتير" },
  { code: "sales:edit", label: "تعديل الفواتير" },
  { code: "sales:delete", label: "حذف الفواتير" },
  { code: "inventory:view", label: "عرض المخزون" },
  { code: "inventory:manage", label: "إدارة المخزون" },
  { code: "products:view", label: "عرض المنتجات" },
  { code: "products:manage", label: "إدارة المنتجات" },
  { code: "suppliers:view", label: "عرض الموردين" },
  { code: "suppliers:manage", label: "إدارة الموردين" },
  { code: "delivery:view", label: "عرض التوصيل" },
  { code: "delivery:manage", label: "إدارة التوصيل" },
  { code: "reports:view", label: "عرض التقارير" },
  { code: "finance:view", label: "عرض المالية" },
  { code: "finance:manage", label: "إدارة المالية" },
  { code: "hr:view", label: "عرض الموارد البشرية" },
  { code: "hr:manage", label: "إدارة الموارد البشرية" },
  { code: "settings:view", label: "عرض الإعدادات" },
  { code: "settings:manage", label: "إدارة الإعدادات" },
  { code: "backup:view", label: "عرض النسخ الاحتياطي" },
  { code: "backup:manage", label: "إدارة النسخ الاحتياطي" },
  { code: "users:invite", label: "دعوة مستخدمين" },
  { code: "users:manage", label: "إدارة المستخدمين" },
  { code: "roles:manage", label: "إدارة الأدوار" },
  { code: "system:reset", label: "إعادة تعيين النظام" },
];

export const DEFAULT_ROLE_GRANTS: Record<string, string[]> = {
  Owner: DEFAULT_PERMISSIONS.map((permission) => permission.code),
  Admin: [
    "dashboard:view",
    "orders:view",
    "orders:manage",
    "sales:view",
    "sales:manage",
    "sales:approve",
    "sales:edit",
    "sales:delete",
    "inventory:view",
    "inventory:manage",
    "products:view",
    "products:manage",
    "suppliers:view",
    "suppliers:manage",
    "delivery:view",
    "delivery:manage",
    "reports:view",
    "finance:view",
    "finance:manage",
    "hr:view",
    "hr:manage",
    "settings:view",
    "settings:manage",
    "backup:view",
    "backup:manage",
    "users:invite",
    "users:manage",
    "roles:manage",
  ],
  Cashier: [
    "dashboard:view",
    "pos:use",
    "orders:view",
    "orders:manage",
    "sales:view",
    "sales:manage",
  ],
};

type Client = PrismaClient | Prisma.TransactionClient;

export async function ensureDefaultRoles(client: Client) {
  for (const permission of DEFAULT_PERMISSIONS) {
    await client.permission.upsert({
      where: { code: permission.code },
      update: { label: permission.label },
      create: permission,
    });
  }

  const permissionRows = await client.permission.findMany({
    where: { code: { in: DEFAULT_PERMISSIONS.map((permission) => permission.code) } },
    select: { id: true, code: true },
  });

  const permissionByCode = new Map(permissionRows.map((permission) => [permission.code, permission.id]));

  const roles: Record<string, { id: string }> = {};

  for (const roleName of Object.keys(DEFAULT_ROLE_GRANTS)) {
    const role = await client.role.upsert({
      where: { name: roleName },
      update: { description: `${roleName} system role`, isSystem: true, isActive: true },
      create: { name: roleName, description: `${roleName} system role`, isSystem: true, isActive: true },
    });

    const grants = DEFAULT_ROLE_GRANTS[roleName]
      .map((code) => permissionByCode.get(code))
      .filter((id): id is string => Boolean(id));

    await client.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (grants.length > 0) {
      await client.rolePermission.createMany({
        data: grants.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }

    roles[roleName] = { id: role.id };
  }

  return roles;
}
