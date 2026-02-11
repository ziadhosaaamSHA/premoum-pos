import argon2 from "argon2";
import { PrismaClient, UserStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for seed");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const PERMISSIONS = [
  { code: "dashboard:view", label: "عرض لوحة التحكم" },
  { code: "pos:use", label: "استخدام الكاشير" },
  { code: "orders:view", label: "عرض الطلبات" },
  { code: "orders:manage", label: "إدارة الطلبات" },
  { code: "orders:delete", label: "حذف الطلبات" },
  { code: "sales:view", label: "عرض المبيعات" },
  { code: "sales:manage", label: "إدارة الفواتير" },
  { code: "sales:approve", label: "اعتماد الفواتير" },
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

const ROLE_GRANTS: Record<string, string[]> = {
  Owner: PERMISSIONS.map((p) => p.code),
  Admin: [
    "dashboard:view",
    "orders:view",
    "orders:manage",
    "sales:view",
    "sales:manage",
    "sales:approve",
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

async function seedPermissionsAndRoles() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { label: permission.label },
      create: permission,
    });
  }

  for (const roleName of Object.keys(ROLE_GRANTS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { description: `${roleName} system role`, isSystem: true, isActive: true },
      create: { name: roleName, description: `${roleName} system role`, isSystem: true, isActive: true },
    });

    const grants = ROLE_GRANTS[roleName];
    const permissionRows = await prisma.permission.findMany({
      where: { code: { in: grants } },
      select: { id: true },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissionRows.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
  }
}

async function seedOwnerAndAdmin() {
  const ownerEmail = (process.env.OWNER_EMAIL || "owner@pos.local").toLowerCase();
  const ownerPassword = process.env.OWNER_PASSWORD || "ChangeMe123!";
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@pos.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";

  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { name: "Owner" } });
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "Admin" } });

  const ownerHash = await argon2.hash(ownerPassword, { type: argon2.argon2id });
  const adminHash = await argon2.hash(adminPassword, { type: argon2.argon2id });

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      fullName: "System Owner",
      passwordHash: ownerHash,
      status: UserStatus.ACTIVE,
      isOwner: true,
      inviteAcceptedAt: new Date(),
    },
    create: {
      email: ownerEmail,
      fullName: "System Owner",
      passwordHash: ownerHash,
      status: UserStatus.ACTIVE,
      isOwner: true,
      inviteAcceptedAt: new Date(),
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: "System Admin",
      passwordHash: adminHash,
      status: UserStatus.ACTIVE,
      createdById: owner.id,
      inviteAcceptedAt: new Date(),
    },
    create: {
      email: adminEmail,
      fullName: "System Admin",
      passwordHash: adminHash,
      status: UserStatus.ACTIVE,
      createdById: owner.id,
      inviteAcceptedAt: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: owner.id, roleId: ownerRole.id } },
    update: {},
    create: { userId: owner.id, roleId: ownerRole.id },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });
}

async function seedOperationalData() {
  const categories = [
    { name: "العصائر", description: "عصائر طبيعية" },
    { name: "مشروبات ساخنة", description: "قهوة وشاي" },
    { name: "ساندوتشات", description: "وجبات خفيفة" },
    { name: "إضافات", description: "إضافات خاصة" },
  ];

  const materials = [
    { name: "برتقال", unit: "كجم", cost: 12, stock: 60, minStock: 10 },
    { name: "تفاح", unit: "كجم", cost: 15, stock: 50, minStock: 8 },
    { name: "سكر", unit: "كجم", cost: 8, stock: 40, minStock: 5 },
    { name: "ماء", unit: "لتر", cost: 1.2, stock: 150, minStock: 25 },
    { name: "قهوة", unit: "كجم", cost: 60, stock: 20, minStock: 4 },
    { name: "حليب", unit: "لتر", cost: 18, stock: 70, minStock: 10 },
    { name: "دجاج", unit: "كجم", cost: 48, stock: 25, minStock: 5 },
    { name: "خبز", unit: "قطعة", cost: 3, stock: 200, minStock: 30 },
  ];

  const products = [
    {
      name: "عصير برتقال",
      category: "العصائر",
      price: 35,
      recipe: [
        { material: "برتقال", quantity: 0.3 },
        { material: "سكر", quantity: 0.02 },
        { material: "ماء", quantity: 0.2 },
      ],
    },
    {
      name: "عصير تفاح",
      category: "العصائر",
      price: 38,
      recipe: [
        { material: "تفاح", quantity: 0.25 },
        { material: "سكر", quantity: 0.02 },
        { material: "ماء", quantity: 0.2 },
      ],
    },
    {
      name: "لاتيه",
      category: "مشروبات ساخنة",
      price: 45,
      recipe: [
        { material: "قهوة", quantity: 0.02 },
        { material: "حليب", quantity: 0.25 },
      ],
    },
    {
      name: "إسبريسو",
      category: "مشروبات ساخنة",
      price: 30,
      recipe: [{ material: "قهوة", quantity: 0.015 }],
    },
    {
      name: "ساندوتش دجاج",
      category: "ساندوتشات",
      price: 60,
      recipe: [
        { material: "دجاج", quantity: 0.15 },
        { material: "خبز", quantity: 1 },
      ],
    },
    {
      name: "إضافة جبنة",
      category: "إضافات",
      price: 10,
      recipe: [{ material: "حليب", quantity: 0.05 }],
    },
  ];

  const zones = [
    { name: "وسط المدينة", limitKm: 5, fee: 20, minOrder: 120, status: "ACTIVE" as const },
    { name: "شرق المدينة", limitKm: 8, fee: 28, minOrder: 150, status: "ACTIVE" as const },
  ];

  const drivers = [
    { name: "أحمد علي", phone: "0101000001", status: "متاح" },
    { name: "محمود سامي", phone: "0101000002", status: "في مهمة" },
    { name: "يوسف عادل", phone: "0101000003", status: "متاح" },
  ];

  const suppliers = [
    { name: "مورد الفاكهة", phone: "0100000001", email: "fruit@sup.local", isActive: true },
    { name: "مورد التعبئة", phone: "0100000002", email: "pack@sup.local", isActive: true },
    { name: "مورد القهوة", phone: "0100000003", email: "coffee@sup.local", isActive: true },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { description: category.description },
      create: category,
    });
  }

  for (const material of materials) {
    await prisma.material.upsert({
      where: { name: material.name },
      update: {
        unit: material.unit,
        cost: material.cost,
        stock: material.stock,
        minStock: material.minStock,
      },
      create: material,
    });
  }

  const categoriesByName = await prisma.category.findMany({
    where: { name: { in: categories.map((category) => category.name) } },
    select: { id: true, name: true },
  });
  const materialsByName = await prisma.material.findMany({
    where: { name: { in: materials.map((material) => material.name) } },
    select: { id: true, name: true },
  });
  const categoryMap = new Map(categoriesByName.map((category) => [category.name, category.id]));
  const materialMap = new Map(materialsByName.map((material) => [material.name, material.id]));

  for (const product of products) {
    const categoryId = categoryMap.get(product.category);
    if (!categoryId) continue;

    const upsertedProduct = await prisma.product.upsert({
      where: { name: product.name },
      update: { categoryId, price: product.price, isActive: true },
      create: {
        name: product.name,
        categoryId,
        price: product.price,
        isActive: true,
      },
    });

    await prisma.recipeItem.deleteMany({ where: { productId: upsertedProduct.id } });
    await prisma.recipeItem.createMany({
      data: product.recipe
        .map((item) => {
          const materialId = materialMap.get(item.material);
          if (!materialId) return null;
          return {
            productId: upsertedProduct.id,
            materialId,
            quantity: item.quantity,
          };
        })
        .filter((value): value is { productId: string; materialId: string; quantity: number } => Boolean(value)),
      skipDuplicates: true,
    });
  }

  for (const zone of zones) {
    await prisma.zone.upsert({
      where: { name: zone.name },
      update: {
        limitKm: zone.limitKm,
        fee: zone.fee,
        minOrder: zone.minOrder,
        status: zone.status,
      },
      create: zone,
    });
  }

  for (const supplier of suppliers) {
    const existingSupplier = await prisma.supplier.findFirst({
      where: { name: supplier.name },
      select: { id: true },
    });
    if (existingSupplier) {
      await prisma.supplier.update({
        where: { id: existingSupplier.id },
        data: {
          phone: supplier.phone,
          email: supplier.email,
          isActive: supplier.isActive,
        },
      });
    } else {
      await prisma.supplier.create({ data: supplier });
    }
  }

  const existingTables = await prisma.diningTable.count();
  if (existingTables === 0) {
    await prisma.diningTable.createMany({
      data: Array.from({ length: 12 }).map((_, index) => ({
        name: `طاولة ${index + 1}`,
        number: index + 1,
        isOccupied: false,
      })),
    });
  }

  const existingDrivers = await prisma.driver.count();
  if (existingDrivers === 0) {
    await prisma.driver.createMany({
      data: drivers,
      skipDuplicates: true,
    });
  }

  const purchaseCount = await prisma.purchase.count();
  if (purchaseCount === 0) {
    const supplier = await prisma.supplier.findFirst({ where: { name: "مورد الفاكهة" } });
    if (supplier) {
      await prisma.purchase.create({
        data: {
          code: "PUR-SEED-001",
          supplierId: supplier.id,
          total: 1250,
          status: "POSTED",
          notes: "بيانات تأسيسية",
        },
      });
    }
  }

  const expenseCount = await prisma.expense.count();
  if (expenseCount === 0) {
    await prisma.expense.createMany({
      data: [
        { title: "إيجار", vendor: "مالك العقار", amount: 12000, notes: "إيجار شهري" },
        { title: "كهرباء", vendor: "شركة الكهرباء", amount: 3200, notes: "فاتورة شهرية" },
        { title: "صيانة معدات", vendor: "خدمات الصيانة", amount: 1800, notes: "صيانة دورية" },
      ],
    });
  }

  const employeeCount = await prisma.employee.count();
  if (employeeCount === 0) {
    await prisma.employee.createMany({
      data: [
        { name: "أحمد علي", roleTitle: "كاشير", phone: "01011000001", status: "ACTIVE" },
        { name: "سارة محمد", roleTitle: "مشرف فرع", phone: "01011000002", status: "ACTIVE" },
        { name: "مروان خالد", roleTitle: "طاهي", phone: "01011000003", status: "ACTIVE" },
      ],
    });
  }

  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const primaryEmployeeId = employees[0]?.id;
  const secondaryEmployeeId = employees[1]?.id || employees[0]?.id;

  const attendanceCount = await prisma.attendance.count();
  if (attendanceCount === 0 && primaryEmployeeId) {
    const now = new Date();
    const checkIn = new Date(now);
    checkIn.setHours(8, 0, 0, 0);
    const checkOut = new Date(now);
    checkOut.setHours(16, 5, 0, 0);
    await prisma.attendance.createMany({
      data: [
        {
          employeeId: primaryEmployeeId,
          checkIn,
          checkOut,
          status: "On Time",
          notes: "سجل تأسيسي",
        },
        {
          employeeId: secondaryEmployeeId || primaryEmployeeId,
          checkIn,
          checkOut: null,
          status: "In Shift",
          notes: null,
        },
      ],
    });
  }

  const shiftTemplateCount = await prisma.shiftTemplate.count();
  if (shiftTemplateCount === 0) {
    await prisma.shiftTemplate.createMany({
      data: [
        { name: "صباحية", startTime: "08:00", endTime: "16:00", staffCount: 4, status: "ACTIVE" },
        { name: "مسائية", startTime: "16:00", endTime: "23:00", staffCount: 3, status: "ACTIVE" },
      ],
    });
  }

  const payrollCount = await prisma.payroll.count();
  if (payrollCount === 0 && primaryEmployeeId) {
    await prisma.payroll.createMany({
      data: [
        {
          employeeId: primaryEmployeeId,
          type: "SALARY",
          amount: 6500,
          date: new Date(),
          note: "راتب شهر فبراير",
        },
        {
          employeeId: secondaryEmployeeId || primaryEmployeeId,
          type: "ADVANCE",
          amount: 1200,
          date: new Date(),
          note: "سلفة طارئة",
        },
      ],
    });
  }

  const leaveCount = await prisma.leave.count();
  if (leaveCount === 0 && secondaryEmployeeId) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 3);
    const toDate = new Date(fromDate);
    toDate.setDate(toDate.getDate() + 2);
    await prisma.leave.create({
      data: {
        employeeId: secondaryEmployeeId,
        fromDate,
        toDate,
        status: "PENDING",
        reason: "إجازة عائلية",
      },
    });
  }
}

async function main() {
  await seedPermissionsAndRoles();
  await seedOwnerAndAdmin();
  await seedOperationalData();

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
