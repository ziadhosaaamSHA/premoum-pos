import { AppState } from "@/lib/types";

export const initialState: AppState = {
  categories: [
    { id: "cat-juice", name: "العصائر", description: "عصائر طبيعية" },
    { id: "cat-hot", name: "مشروبات ساخنة", description: "قهوة وشاي" },
    { id: "cat-sand", name: "ساندوتشات", description: "وجبات خفيفة" },
    { id: "cat-extra", name: "إضافات", description: "إضافات خاصة" },

    { id: "cat-juice-2", name: "العصائر", description: "عصائر طبيعية" },
    { id: "cat-hot-2", name: "مشروبات ساخنة", description: "قهوة وشاي" },
    { id: "cat-sand-2", name: "ساندوتشات", description: "وجبات خفيفة" },
    { id: "cat-extra-2", name: "إضافات", description: "إضافات خاصة" },

    { id: "cat-juice-3", name: "العصائر", description: "عصائر طبيعية" },
    { id: "cat-hot-3", name: "مشروبات ساخنة", description: "قهوة وشاي" },
    { id: "cat-sand-3", name: "ساندوتشات", description: "وجبات خفيفة" },
    { id: "cat-extra-3", name: "إضافات", description: "إضافات خاصة" },
  ],

  materials: [
    { id: "mat-orange", name: "برتقال", unit: "كجم", cost: 12, stock: 35, minStock: 10 },
    { id: "mat-apple", name: "تفاح", unit: "كجم", cost: 15, stock: 20, minStock: 8 },
    { id: "mat-sugar", name: "سكر", unit: "كجم", cost: 8, stock: 18, minStock: 5 },
    { id: "mat-water", name: "ماء", unit: "لتر", cost: 1.2, stock: 80, minStock: 20 },
    { id: "mat-coffee", name: "قهوة", unit: "كجم", cost: 60, stock: 12, minStock: 4 },
    { id: "mat-milk", name: "حليب", unit: "لتر", cost: 18, stock: 30, minStock: 8 },
    { id: "mat-chicken", name: "دجاج", unit: "كجم", cost: 48, stock: 10, minStock: 3 },
    { id: "mat-bread", name: "خبز", unit: "قطعة", cost: 3, stock: 60, minStock: 20 },

    { id: "mat-apple-2", name: "تفاح", unit: "كجم", cost: 15, stock: 20, minStock: 8 },
    { id: "mat-sugar-2", name: "سكر", unit: "كجم", cost: 8, stock: 18, minStock: 5 },
    { id: "mat-water-2", name: "ماء", unit: "لتر", cost: 1.2, stock: 80, minStock: 20 },
    { id: "mat-coffee-2", name: "قهوة", unit: "كجم", cost: 60, stock: 12, minStock: 4 },
    { id: "mat-milk-2", name: "حليب", unit: "لتر", cost: 18, stock: 30, minStock: 8 },
    { id: "mat-chicken-2", name: "دجاج", unit: "كجم", cost: 48, stock: 10, minStock: 3 },
    { id: "mat-bread-2", name: "خبز", unit: "قطعة", cost: 3, stock: 60, minStock: 20 },

    { id: "mat-apple-3", name: "تفاح", unit: "كجم", cost: 15, stock: 20, minStock: 8 },
    { id: "mat-sugar-3", name: "سكر", unit: "كجم", cost: 8, stock: 18, minStock: 5 },
    { id: "mat-water-3", name: "ماء", unit: "لتر", cost: 1.2, stock: 80, minStock: 20 },
    { id: "mat-coffee-3", name: "قهوة", unit: "كجم", cost: 60, stock: 12, minStock: 4 },
    { id: "mat-milk-3", name: "حليب", unit: "لتر", cost: 18, stock: 30, minStock: 8 },
    { id: "mat-chicken-3", name: "دجاج", unit: "كجم", cost: 48, stock: 10, minStock: 3 },
    { id: "mat-bread-3", name: "خبز", unit: "قطعة", cost: 3, stock: 60, minStock: 20 },
  ],

  products: [
    {
      id: "prod-oranges",
      name: "عصيhhر برتقال",
      categoryId: "cat-juice",
      price: 35,
      label: "برتقال",
      recipe: [
        { materialId: "mat-orange", qty: 0.3 },
        { materialId: "mat-sugar", qty: 0.02 },
        { materialId: "mat-water", qty: 0.2 },
      ],
    },
    {
      id: "prod-apple",
      name: "عصير تفاح",
      categoryId: "cat-juice",
      price: 38,
      label: "تفاح",
      recipe: [
        { materialId: "mat-apple", qty: 0.25 },
        { materialId: "mat-sugar", qty: 0.02 },
        { materialId: "mat-water", qty: 0.2 },
      ],
    },
    {
      id: "prod-latte",
      name: "لاتيه",
      categoryId: "cat-hot",
      price: 45,
      label: "لاتيه",
      recipe: [
        { materialId: "mat-coffee", qty: 0.02 },
        { materialId: "mat-milk", qty: 0.25 },
      ],
    },
    {
      id: "prod-espresso",
      name: "إسبريسو",
      categoryId: "cat-hot",
      price: 30,
      label: "قهوة",
      recipe: [{ materialId: "mat-coffee", qty: 0.015 }],
    },
    {
      id: "prod-chicken",
      name: "ساندوتش دجاج",
      categoryId: "cat-sand",
      price: 60,
      label: "دجاج",
      recipe: [
        { materialId: "mat-chicken", qty: 0.15 },
        { materialId: "mat-bread", qty: 1 },
      ],
    },
    {
      id: "prod-cheese",
      name: "إضافة جبنة",
      categoryId: "cat-extra",
      price: 10,
      label: "جبنة",
      recipe: [{ materialId: "mat-milk", qty: 0.05 }],
    },

    // x2
    {
      id: "prod-orange-2",
      name: "عصير برتقال",
      categoryId: "cat-juice-2",
      price: 35,
      label: "برتقال",
      recipe: [
        { materialId: "mat-orange-2", qty: 0.3 },
        { materialId: "mat-sugar-2", qty: 0.02 },
        { materialId: "mat-water-2", qty: 0.2 },
      ],
    },
    {
      id: "prod-apple-2",
      name: "عصير تفاح",
      categoryId: "cat-juice-2",
      price: 38,
      label: "تفاح",
      recipe: [
        { materialId: "mat-apple-2", qty: 0.25 },
        { materialId: "mat-sugar-2", qty: 0.02 },
        { materialId: "mat-water-2", qty: 0.2 },
      ],
    },
    {
      id: "prod-latte-2",
      name: "لاتيه",
      categoryId: "cat-hot-2",
      price: 45,
      label: "لاتيه",
      recipe: [
        { materialId: "mat-coffee-2", qty: 0.02 },
        { materialId: "mat-milk-2", qty: 0.25 },
      ],
    },
    {
      id: "prod-espresso-2",
      name: "إسبريسو",
      categoryId: "cat-hot-2",
      price: 30,
      label: "قهوة",
      recipe: [{ materialId: "mat-coffee-2", qty: 0.015 }],
    },
    {
      id: "prod-chicken-2",
      name: "ساندوتش دجاج",
      categoryId: "cat-sand-2",
      price: 60,
      label: "دجاج",
      recipe: [
        { materialId: "mat-chicken-2", qty: 0.15 },
        { materialId: "mat-bread-2", qty: 1 },
      ],
    },
    {
      id: "prod-cheese-2",
      name: "إضافة جبنة",
      categoryId: "cat-extra-2",
      price: 10,
      label: "جبنة",
      recipe: [{ materialId: "mat-milk-2", qty: 0.05 }],
    },

    // x3
    {
      id: "prod-orange-3",
      name: "عصير برتقال",
      categoryId: "cat-juice-3",
      price: 35,
      label: "برتقال",
      recipe: [
        { materialId: "mat-orange-3", qty: 0.3 },
        { materialId: "mat-sugar-3", qty: 0.02 },
        { materialId: "mat-water-3", qty: 0.2 },
      ],
    },
    {
      id: "prod-apple-3",
      name: "عصير تفاح",
      categoryId: "cat-juice-3",
      price: 38,
      label: "تفاح",
      recipe: [
        { materialId: "mat-apple-3", qty: 0.25 },
        { materialId: "mat-sugar-3", qty: 0.02 },
        { materialId: "mat-water-3", qty: 0.2 },
      ],
    },
    {
      id: "prod-latte-3",
      name: "لاتيه",
      categoryId: "cat-hot-3",
      price: 45,
      label: "لاتيه",
      recipe: [
        { materialId: "mat-coffee-3", qty: 0.02 },
        { materialId: "mat-milk-3", qty: 0.25 },
      ],
    },
    {
      id: "prod-espresso-3",
      name: "إسبريسو",
      categoryId: "cat-hot-3",
      price: 30,
      label: "قهوة",
      recipe: [{ materialId: "mat-coffee-3", qty: 0.015 }],
    },
    {
      id: "prod-chicken-3",
      name: "ساندوتش دجاج",
      categoryId: "cat-sand-3",
      price: 60,
      label: "دجاج",
      recipe: [
        { materialId: "mat-chicken-3", qty: 0.15 },
        { materialId: "mat-bread-3", qty: 1 },
      ],
    },
    {
      id: "prod-cheese-3",
      name: "إضافة جبنة",
      categoryId: "cat-extra-3",
      price: 10,
      label: "جبنة",
      recipe: [{ materialId: "mat-milk-3", qty: 0.05 }],
    },
  ],

  suppliers: [
    { id: "sup-1", name: "مورد الفاكهة", phone: "0100000001", email: "fruit@sup.local", status: "active" },
    { id: "sup-2", name: "مورد التعبئة", phone: "0100000002", email: "pack@sup.local", status: "active" },
    { id: "sup-3", name: "مورد القهوة", phone: "0100000003", email: "coffee@sup.local", status: "inactive" },

    { id: "sup-1-2", name: "مورد الفاكهة", phone: "0100000001", email: "fruit@sup.local", status: "active" },
    { id: "sup-2-2", name: "مورد التعبئة", phone: "0100000002", email: "pack@sup.local", status: "active" },
    { id: "sup-3-2", name: "مورد القهوة", phone: "0100000003", email: "coffee@sup.local", status: "inactive" },

    { id: "sup-1-3", name: "مورد الفاكهة", phone: "0100000001", email: "fruit@sup.local", status: "active" },
    { id: "sup-2-3", name: "مورد التعبئة", phone: "0100000002", email: "pack@sup.local", status: "active" },
    { id: "sup-3-3", name: "مورد القهوة", phone: "0100000003", email: "coffee@sup.local", status: "inactive" },
  ],

  purchases: [
    { id: "pur-1", date: "2026-02-04", supplier: "مورد الفاكهة", total: 1250, status: "posted" },
    { id: "pur-2", date: "2026-02-05", supplier: "مورد القهوة", total: 860, status: "posted" },

    { id: "pur-1-2", date: "2026-02-04", supplier: "مورد الفاكهة", total: 1250, status: "posted" },
    { id: "pur-2-2", date: "2026-02-05", supplier: "مورد القهوة", total: 860, status: "posted" },

    { id: "pur-1-3", date: "2026-02-04", supplier: "مورد الفاكهة", total: 1250, status: "posted" },
    { id: "pur-2-3", date: "2026-02-05", supplier: "مورد القهوة", total: 860, status: "posted" },
  ],

  waste: [
    { id: "w-1", date: "2026-02-05", material: "برتقال", qty: 1.2, reason: "تالف", cost: 14.4 },
    { id: "w-2", date: "2026-02-06", material: "حليب", qty: 0.8, reason: "انتهاء", cost: 14.4 },
    { id: "w-1", date: "2026-02-05", material: "برتقال", qty: 1.2, reason: "تالف", cost: 14.4 },
    { id: "w-2", date: "2026-02-06", material: "حليب", qty: 0.8, reason: "انتهاء", cost: 14.4 },

    { id: "w-1-2", date: "2026-02-05", material: "برتقال", qty: 1.2, reason: "تالف", cost: 14.4 },
    { id: "w-2-2", date: "2026-02-06", material: "حليب", qty: 0.8, reason: "انتهاء", cost: 14.4 },

    { id: "w-1-3", date: "2026-02-05", material: "برتقال", qty: 1.2, reason: "تالف", cost: 14.4 },
    { id: "w-2-3", date: "2026-02-06", material: "حليب", qty: 0.8, reason: "انتهاء", cost: 14.4 },
  ],

  zones: [
    { id: "zone-a", name: "النطاق A", limit: 3, fee: 10, minOrder: 60, status: "active" },
    { id: "zone-b", name: "النطاق B", limit: 6, fee: 15, minOrder: 80, status: "active" },
    { id: "zone-c", name: "النطاق C", limit: 10, fee: 20, minOrder: 100, status: "inactive" },

    { id: "zone-a-2", name: "النطاق A", limit: 3, fee: 10, minOrder: 60, status: "active" },
    { id: "zone-b-2", name: "النطاق B", limit: 6, fee: 15, minOrder: 80, status: "active" },
    { id: "zone-c-2", name: "النطاق C", limit: 10, fee: 20, minOrder: 100, status: "inactive" },

    { id: "zone-a-3", name: "النطاق A", limit: 3, fee: 10, minOrder: 60, status: "active" },
    { id: "zone-b-3", name: "النطاق B", limit: 6, fee: 15, minOrder: 80, status: "active" },
    { id: "zone-c-3", name: "النطاق C", limit: 10, fee: 20, minOrder: 100, status: "inactive" },
  ],

  drivers: [
    { id: "drv-1", name: "علي حسن", phone: "0101001001", status: "متاح", activeOrders: 1 },
    { id: "drv-2", name: "محمود سالم", phone: "0101001002", status: "في مهمة", activeOrders: 2 },

    { id: "drv-1-2", name: "علي حسن", phone: "0101001001", status: "متاح", activeOrders: 1 },
    { id: "drv-2-2", name: "محمود سالم", phone: "0101001002", status: "في مهمة", activeOrders: 2 },

    { id: "drv-1-3", name: "علي حسن", phone: "0101001001", status: "متاح", activeOrders: 1 },
    { id: "drv-2-3", name: "محمود سالم", phone: "0101001002", status: "في مهمة", activeOrders: 2 },
  ],

  expenses: [
    { id: "exp-1", date: "2026-02-01", title: "إيجار", vendor: "المالك", amount: 6000 },
    { id: "exp-2", date: "2026-02-03", title: "كهرباء", vendor: "شركة الكهرباء", amount: 1400 },
    { id: "exp-3", date: "2026-02-05", title: "رواتب", vendor: "شؤون الموظفين", amount: 8200 },

    { id: "exp-1-2", date: "2026-02-01", title: "إيجار", vendor: "المالك", amount: 6000 },
    { id: "exp-2-2", date: "2026-02-03", title: "كهرباء", vendor: "شركة الكهرباء", amount: 1400 },
    { id: "exp-3-2", date: "2026-02-05", title: "رواتب", vendor: "شؤون الموظفين", amount: 8200 },

    { id: "exp-1-3", date: "2026-02-01", title: "إيجار", vendor: "المالك", amount: 6000 },
    { id: "exp-2-3", date: "2026-02-03", title: "كهرباء", vendor: "شركة الكهرباء", amount: 1400 },
    { id: "exp-3-3", date: "2026-02-05", title: "رواتب", vendor: "شؤون الموظفين", amount: 8200 },
  ],

  employees: [
    { id: "emp-1", name: "أحمد علي", role: "كاشير", phone: "0102003001", status: "active", shiftLogs: [] },
    { id: "emp-2", name: "سارة محمد", role: "مشرفة مطبخ", phone: "0102003002", status: "active", shiftLogs: [] },
    { id: "emp-3", name: "محمود رضا", role: "مخزون", phone: "0102003003", status: "inactive", shiftLogs: [] },

    { id: "emp-1-2", name: "أحمد علي", role: "كاشير", phone: "0102003001", status: "active", shiftLogs: [] },
    { id: "emp-2-2", name: "سارة محمد", role: "مشرفة مطبخ", phone: "0102003002", status: "active", shiftLogs: [] },
    { id: "emp-3-2", name: "محمود رضا", role: "مخزون", phone: "0102003003", status: "inactive", shiftLogs: [] },

    { id: "emp-1-3", name: "أحمد علي", role: "كاشير", phone: "0102003001", status: "active", shiftLogs: [] },
    { id: "emp-2-3", name: "سارة محمد", role: "مشرفة مطبخ", phone: "0102003002", status: "active", shiftLogs: [] },
    { id: "emp-3-3", name: "محمود رضا", role: "مخزون", phone: "0102003003", status: "inactive", shiftLogs: [] },
  ],

  attendance: [
    { id: "att-1", employee: "أحمد علي", checkIn: "08:00", checkOut: "16:00", status: "ملتزم" },
    { id: "att-2", employee: "سارة محمد", checkIn: "09:00", checkOut: "17:00", status: "متأخر" },

    { id: "att-1-2", employee: "أحمد علي", checkIn: "08:00", checkOut: "16:00", status: "ملتزم" },
    { id: "att-2-2", employee: "سارة محمد", checkIn: "09:00", checkOut: "17:00", status: "متأخر" },

    { id: "att-1-3", employee: "أحمد علي", checkIn: "08:00", checkOut: "16:00", status: "ملتزم" },
    { id: "att-2-3", employee: "سارة محمد", checkIn: "09:00", checkOut: "17:00", status: "متأخر" },
  ],

  shifts: [
    { id: "sh-1", name: "صباحية", time: "08:00 - 16:00", staff: "3 موظفين", status: "active" },
    { id: "sh-2", name: "مسائية", time: "16:00 - 00:00", staff: "2 موظفين", status: "active" },

    { id: "sh-1-2", name: "صباحية", time: "08:00 - 16:00", staff: "3 موظفين", status: "active" },
    { id: "sh-2-2", name: "مسائية", time: "16:00 - 00:00", staff: "2 موظفين", status: "active" },

    { id: "sh-1-3", name: "صباحية", time: "08:00 - 16:00", staff: "3 موظفين", status: "active" },
    { id: "sh-2-3", name: "مسائية", time: "16:00 - 00:00", staff: "2 موظفين", status: "active" },
  ],

  payroll: [
    { id: "pay-1", employee: "أحمد علي", item: "راتب", amount: 4500, date: "2026-02-01" },
    { id: "pay-2", employee: "سارة محمد", item: "سلفة", amount: 600, date: "2026-02-04" },

    { id: "pay-1-2", employee: "أحمد علي", item: "راتب", amount: 4500, date: "2026-02-01" },
    { id: "pay-2-2", employee: "سارة محمد", item: "سلفة", amount: 600, date: "2026-02-04" },

    { id: "pay-1-3", employee: "أحمد علي", item: "راتب", amount: 4500, date: "2026-02-01" },
    { id: "pay-2-3", employee: "سارة محمد", item: "سلفة", amount: 600, date: "2026-02-04" },
  ],

  leaves: [
    { id: "lv-1", employee: "محمود رضا", from: "2026-02-10", to: "2026-02-12", status: "بانتظار الموافقة" },
    { id: "lv-1-2", employee: "محمود رضا", from: "2026-02-10", to: "2026-02-12", status: "بانتظار الموافقة" },
    { id: "lv-1-3", employee: "محمود رضا", from: "2026-02-10", to: "2026-02-12", status: "بانتظار الموافقة" },
  ],

  roles: [
    { id: "role-admin", name: "Admin", description: "وصول كامل", permissions: "كافة الوحدات" },
    { id: "role-cashier", name: "Cashier", description: "نقاط البيع", permissions: "POS + الطلبات" },
    { id: "role-inv", name: "Inventory Manager", description: "المخزون", permissions: "مشتريات + هدر" },
    { id: "role-hr", name: "HR", description: "الموظفون", permissions: "حضور + رواتب" },

    { id: "role-admin-2", name: "Admin", description: "وصول كامل", permissions: "كافة الوحدات" },
    { id: "role-cashier-2", name: "Cashier", description: "نقاط البيع", permissions: "POS + الطلبات" },
    { id: "role-inv-2", name: "Inventory Manager", description: "المخزون", permissions: "مشتريات + هدر" },
    { id: "role-hr-2", name: "HR", description: "الموظفون", permissions: "حضور + رواتب" },

    { id: "role-admin-3", name: "Admin", description: "وصول كامل", permissions: "كافة الوحدات" },
    { id: "role-cashier-3", name: "Cashier", description: "نقاط البيع", permissions: "POS + الطلبات" },
    { id: "role-inv-3", name: "Inventory Manager", description: "المخزون", permissions: "مشتريات + هدر" },
    { id: "role-hr-3", name: "HR", description: "الموظفون", permissions: "حضور + رواتب" },
  ],

  users: [
    { id: "user-1", name: "مدير النظام", email: "admin@pos.local", role: "Admin", status: "active" },
    { id: "user-2", name: "كاشير 1", email: "cashier@pos.local", role: "Cashier", status: "active" },

    { id: "user-1-2", name: "مدير النظام", email: "admin@pos.local", role: "Admin", status: "active" },
    { id: "user-2-2", name: "كاشير 1", email: "cashier@pos.local", role: "Cashier", status: "active" },

    { id: "user-1-3", name: "مدير النظام", email: "admin@pos.local", role: "Admin", status: "active" },
    { id: "user-2-3", name: "كاشير 1", email: "cashier@pos.local", role: "Cashier", status: "active" },
  ],

  orders: [
    {
      id: "ORD-2401",
      type: "delivery",
      status: "preparing",
      customer: "مها سمير",
      zoneId: "zone-a",
      driverId: "drv-1",
      createdAt: "2026-02-06T09:15:00",
      items: [
        { productId: "prod-orange", qty: 2 },
        { productId: "prod-latte", qty: 1 },
      ],
      discount: 0,
      payment: "cash",
    },
    {
      id: "ORD-2402",
      type: "takeaway",
      status: "ready",
      customer: "محمد عادل",
      zoneId: "",
      driverId: "",
      createdAt: "2026-02-06T09:40:00",
      items: [
        { productId: "prod-apple", qty: 1 },
        { productId: "prod-cheese", qty: 1 },
      ],
      discount: 5,
      payment: "card",
    },
    {
      id: "ORD-2395",
      type: "dine_in",
      status: "delivered",
      customer: "عميل صالة",
      zoneId: "",
      driverId: "",
      tableId: "table-1",
      createdAt: "2026-02-05T18:30:00",
      items: [{ productId: "prod-chicken", qty: 2 }],
      discount: 0,
      payment: "cash",
    },

    // x2
    {
      id: "ORD-2401-2",
      type: "delivery",
      status: "preparing",
      customer: "مها سمير",
      zoneId: "zone-a-2",
      driverId: "drv-1-2",
      createdAt: "2026-02-06T09:15:00",
      items: [
        { productId: "prod-orange-2", qty: 2 },
        { productId: "prod-latte-2", qty: 1 },
      ],
      discount: 0,
      payment: "cash",
    },
    {
      id: "ORD-2402-2",
      type: "takeaway",
      status: "ready",
      customer: "محمد عادل",
      zoneId: "",
      driverId: "",
      createdAt: "2026-02-06T09:40:00",
      items: [
        { productId: "prod-apple-2", qty: 1 },
        { productId: "prod-cheese-2", qty: 1 },
      ],
      discount: 5,
      payment: "card",
    },
    {
      id: "ORD-2395-2",
      type: "dine_in",
      status: "delivered",
      customer: "عميل صالة",
      zoneId: "",
      driverId: "",
      tableId: "table-3",
      createdAt: "2026-02-05T18:30:00",
      items: [{ productId: "prod-chicken-2", qty: 2 }],
      discount: 0,
      payment: "cash",
    },

    // x3
    {
      id: "ORD-2401-3",
      type: "delivery",
      status: "preparing",
      customer: "مها سمير",
      zoneId: "zone-a-3",
      driverId: "drv-1-3",
      createdAt: "2026-02-06T09:15:00",
      items: [
        { productId: "prod-orange-3", qty: 2 },
        { productId: "prod-latte-3", qty: 1 },
      ],
      discount: 0,
      payment: "cash",
    },
    {
      id: "ORD-2402-3",
      type: "takeaway",
      status: "ready",
      customer: "محمد عادل",
      zoneId: "",
      driverId: "",
      createdAt: "2026-02-06T09:40:00",
      items: [
        { productId: "prod-apple-3", qty: 1 },
        { productId: "prod-cheese-3", qty: 1 },
      ],
      discount: 5,
      payment: "card",
    },
    {
      id: "ORD-2395-3",
      type: "dine_in",
      status: "delivered",
      customer: "عميل صالة",
      zoneId: "",
      driverId: "",
      tableId: "table-6",
      createdAt: "2026-02-05T18:30:00",
      items: [{ productId: "prod-chicken-3", qty: 2 }],
      discount: 0,
      payment: "cash",
    },
  ],

  cart: [],
  pos: {
    category: "all",
    search: "",
    orderType: "dine_in",
    payment: "cash",
    zoneId: "zone-a",
    discount: 0,
  },
  tables: [
    { id: "table-1", name: "طاولة 1", number: 1, status: "occupied", orderId: "ORD-2395" },
    { id: "table-2", name: "طاولة 2", number: 2, status: "empty", orderId: null },
    { id: "table-3", name: "طاولة 3", number: 3, status: "occupied", orderId: "ORD-2395-2" },
    { id: "table-4", name: "طاولة 4", number: 4, status: "empty", orderId: null },
    { id: "table-5", name: "طاولة 5", number: 5, status: "empty", orderId: null },
    { id: "table-6", name: "طاولة 6", number: 6, status: "occupied", orderId: "ORD-2395-3" },
  ],
  sales: [
    {
      id: "sale-1",
      invoiceNo: "INV-2026-001",
      date: "2026-02-06",
      customer: "مها سمير",
      total: 260,
      status: "paid",
      items: ["عصير برتقال", "لاتيه"],
    },
    {
      id: "sale-2",
      invoiceNo: "INV-2026-002",
      date: "2026-02-07",
      customer: "محمد عادل",
      total: 120,
      status: "draft",
      items: ["عصير تفاح", "إضافة جبنة"],
    },
    {
      id: "sale-3",
      invoiceNo: "INV-2026-003",
      date: "2026-02-07",
      customer: "عميل صالة",
      total: 180,
      status: "paid",
      items: ["ساندوتش دجاج"],
    },
  ],
  backups: [],
  currentUser: {
    id: "user-2",
    name: "كاشير 1",
    email: "cashier@pos.local",
    role: "Cashier",
    phone: "0100000000",
    employeeId: "emp-1",
  },
  activeShift: {
    status: "idle",
    employeeId: null,
    pauses: [],
  },
};
