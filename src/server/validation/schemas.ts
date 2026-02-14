import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(512),
});

export const ownerSignupSchema = z
  .object({
    fullName: z.string().min(2).max(120),
    email: z.string().email().max(255),
    password: z.string().min(10).max(512),
    confirmPassword: z.string().min(10).max(512),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Password confirmation does not match",
    path: ["confirmPassword"],
  });

export const trialResetPasswordSchema = z
  .object({
    email: z.string().email().max(255),
    password: z.string().min(10).max(512),
    confirmPassword: z.string().min(10).max(512),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Password confirmation does not match",
    path: ["confirmPassword"],
  });

export const inviteCreateSchema = z.object({
  email: z.string().email().max(255),
  roleId: z.string().min(1).max(64),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(20).max(512),
  fullName: z.string().min(2).max(120),
  password: z.string().min(10).max(512),
});

export const roleCreateSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().min(2).max(300),
  permissionCodes: z.array(z.string().min(3).max(120)).default([]),
});

export const roleUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().min(2).max(300).optional(),
  permissionCodes: z.array(z.string().min(3).max(120)).optional(),
});

export const userUpdateSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().min(5).max(30).nullable().optional(),
  status: z.enum(["INVITED", "ACTIVE", "SUSPENDED"]).optional(),
  roleIds: z.array(z.string().min(1).max(64)).optional(),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().min(5).max(30).nullable().optional(),
  avatarUrl: z.string().max(2_000_000).nullable().optional(),
});

export const passwordChangeSchema = z.object({
  password: z.string().min(1).max(512),
});

export const brandingUpdateSchema = z.object({
  brandName: z.string().min(2).max(120),
  brandTagline: z.string().max(160).nullable().optional(),
  logoUrl: z.string().max(2_000_000).nullable().optional(),
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  secondaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  backgroundColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  cardColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  borderColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  topbarColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  topbarTextColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  tableHeaderColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  tableHeaderTextColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  backgroundOpacity: z.number().min(0).max(100),
  cardOpacity: z.number().min(0).max(100),
  topbarOpacity: z.number().min(0).max(100),
  tableHeaderOpacity: z.number().min(0).max(100),
  sidebarOpacity: z.number().min(0).max(100),
  sidebarColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  sidebarTextColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
});

export const revokeInviteSchema = z.object({
  reason: z.string().min(2).max(255).optional(),
});

export const posOrderItemSchema = z.object({
  productId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(999),
});

export const orderCreateSchema = z.object({
  type: z.enum(["dine_in", "takeaway", "delivery"]),
  customerName: z.string().min(1).max(120),
  zoneId: z.string().min(1).max(64).nullable().optional(),
  driverId: z.string().min(1).max(64).nullable().optional(),
  tableId: z.string().min(1).max(64).nullable().optional(),
  discount: z.number().min(0).max(1_000_000).default(0),
  taxRate: z.number().min(0).max(100).optional(),
  payment: z.enum(["cash", "card", "wallet", "mixed"]),
  notes: z.string().max(500).nullable().optional(),
  items: z.array(posOrderItemSchema).min(1).max(200),
});

export const orderUpdateSchema = z.object({
  status: z.enum(["preparing", "ready", "out", "delivered", "cancelled"]).optional(),
  tableId: z.string().min(1).max(64).nullable().optional(),
  driverId: z.string().min(1).max(64).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const tableCreateSchema = z.object({
  name: z.string().min(1).max(120),
  number: z.number().int().min(1).max(10_000),
});

export const tableUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  number: z.number().int().min(1).max(10_000).optional(),
  status: z.enum(["empty", "occupied"]).optional(),
  orderId: z.string().min(1).max(64).nullable().optional(),
});

export const taxCreateSchema = z.object({
  name: z.string().min(1).max(120),
  rate: z.number().min(0).max(100),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const taxUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  rate: z.number().min(0).max(100).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const salesCreateSchema = z.object({
  date: z.string().min(8).max(32),
  customerName: z.string().min(1).max(120),
  total: z.number().min(0).max(1_000_000),
  status: z.enum(["draft", "paid"]).default("draft"),
  items: z.array(z.string().min(1).max(180)).min(1).max(200).default([]),
});

export const salesUpdateSchema = z.object({
  date: z.string().min(8).max(32).optional(),
  customerName: z.string().min(1).max(120).optional(),
  total: z.number().min(0).max(1_000_000).optional(),
  status: z.enum(["draft", "paid"]).optional(),
  items: z.array(z.string().min(1).max(180)).min(1).max(200).optional(),
});

export const materialCreateSchema = z.object({
  name: z.string().min(1).max(120),
  unit: z.string().min(1).max(30),
  cost: z.number().min(0).max(1_000_000),
  stock: z.number().min(0).max(1_000_000),
  minStock: z.number().min(0).max(1_000_000),
});

export const materialUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  unit: z.string().min(1).max(30).optional(),
  cost: z.number().min(0).max(1_000_000).optional(),
  stock: z.number().min(0).max(1_000_000).optional(),
  minStock: z.number().min(0).max(1_000_000).optional(),
});

export const purchaseCreateSchema = z.object({
  date: z.string().min(8).max(32),
  supplierId: z.string().min(1).max(64).nullable().optional(),
  materialId: z.string().min(1).max(64),
  quantity: z.number().min(0.001).max(1_000_000),
  unitCost: z.number().min(0).max(1_000_000),
  total: z.number().min(0).max(1_000_000).optional(),
  status: z.enum(["posted", "draft", "cancelled"]).default("draft"),
  notes: z.string().max(500).optional().nullable(),
});

export const purchaseUpdateSchema = z.object({
  date: z.string().min(8).max(32).optional(),
  supplierId: z.string().min(1).max(64).nullable().optional(),
  materialId: z.string().min(1).max(64).optional(),
  quantity: z.number().min(0.001).max(1_000_000).optional(),
  unitCost: z.number().min(0).max(1_000_000).optional(),
  total: z.number().min(0).max(1_000_000).optional(),
  status: z.enum(["posted", "draft", "cancelled"]).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const wasteCreateSchema = z.object({
  date: z.string().min(8).max(32),
  materialId: z.string().min(1).max(64),
  quantity: z.number().min(0.001).max(1_000_000),
  reason: z.string().min(1).max(255),
  cost: z.number().min(0).max(1_000_000).optional().nullable(),
});

export const wasteUpdateSchema = z.object({
  date: z.string().min(8).max(32).optional(),
  materialId: z.string().min(1).max(64).optional(),
  quantity: z.number().min(0.001).max(1_000_000).optional(),
  reason: z.string().min(1).max(255).optional(),
  cost: z.number().min(0).max(1_000_000).optional().nullable(),
});

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
});

export const recipeLineSchema = z.object({
  materialId: z.string().min(1).max(64),
  quantity: z.number().min(0.001).max(1_000_000),
});

export const productCreateSchema = z.object({
  name: z.string().min(1).max(140),
  categoryId: z.string().min(1).max(64),
  price: z.number().min(0).max(1_000_000),
  isActive: z.boolean().optional().default(true),
  recipe: z.array(recipeLineSchema).optional().default([]),
});

export const productUpdateSchema = z.object({
  name: z.string().min(1).max(140).optional(),
  categoryId: z.string().min(1).max(64).optional(),
  price: z.number().min(0).max(1_000_000).optional(),
  isActive: z.boolean().optional(),
  recipe: z.array(recipeLineSchema).optional(),
});

export const supplierCreateSchema = z.object({
  name: z.string().min(1).max(140),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  status: z.enum(["active", "inactive"]).optional().default("active"),
});

export const supplierUpdateSchema = z.object({
  name: z.string().min(1).max(140).optional(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const zoneCreateSchema = z.object({
  name: z.string().min(1).max(140),
  limit: z.number().min(0.1).max(1_000),
  fee: z.number().min(0).max(1_000_000),
  minOrder: z.number().min(0).max(1_000_000),
  status: z.enum(["active", "inactive"]).optional().default("active"),
});

export const zoneUpdateSchema = z.object({
  name: z.string().min(1).max(140).optional(),
  limit: z.number().min(0.1).max(1_000).optional(),
  fee: z.number().min(0).max(1_000_000).optional(),
  minOrder: z.number().min(0).max(1_000_000).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const driverCreateSchema = z.object({
  name: z.string().min(1).max(140),
  phone: z.string().max(40).optional().nullable(),
  status: z.string().min(1).max(80).default("متاح"),
});

export const driverUpdateSchema = z.object({
  name: z.string().min(1).max(140).optional(),
  phone: z.string().max(40).optional().nullable(),
  status: z.string().min(1).max(80).optional(),
});

export const expenseCreateSchema = z.object({
  date: z.string().min(8).max(32),
  title: z.string().min(1).max(200),
  vendor: z.string().max(180).optional().nullable(),
  amount: z.number().min(0).max(1_000_000),
  notes: z.string().max(500).optional().nullable(),
});

export const expenseUpdateSchema = z.object({
  date: z.string().min(8).max(32).optional(),
  title: z.string().min(1).max(200).optional(),
  vendor: z.string().max(180).optional().nullable(),
  amount: z.number().min(0).max(1_000_000).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const employeeCreateSchema = z.object({
  name: z.string().min(1).max(140),
  role: z.string().min(1).max(140),
  phone: z.string().max(40).optional().nullable(),
  status: z.enum(["active", "inactive"]).optional().default("active"),
});

export const employeeUpdateSchema = z.object({
  name: z.string().min(1).max(140).optional(),
  role: z.string().min(1).max(140).optional(),
  phone: z.string().max(40).optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const attendanceCreateSchema = z.object({
  employeeId: z.string().min(1).max(64),
  checkIn: z.string().min(8).max(64),
  checkOut: z.string().min(8).max(64).optional().nullable(),
  status: z.string().min(1).max(80),
  notes: z.string().max(500).optional().nullable(),
});

export const attendanceUpdateSchema = z.object({
  employeeId: z.string().min(1).max(64).optional(),
  checkIn: z.string().min(8).max(64).optional(),
  checkOut: z.string().min(8).max(64).optional().nullable(),
  status: z.string().min(1).max(80).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const shiftTemplateCreateSchema = z.object({
  name: z.string().min(1).max(140),
  startTime: z.string().min(4).max(5),
  endTime: z.string().min(4).max(5),
  staffCount: z.number().int().min(0).max(5_000).optional().nullable(),
  status: z.enum(["active", "inactive"]).optional().default("active"),
});

export const shiftTemplateUpdateSchema = z.object({
  name: z.string().min(1).max(140).optional(),
  startTime: z.string().min(4).max(5).optional(),
  endTime: z.string().min(4).max(5).optional(),
  staffCount: z.number().int().min(0).max(5_000).optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const payrollCreateSchema = z.object({
  employeeId: z.string().min(1).max(64),
  type: z.enum(["salary", "advance", "bonus", "deduction"]),
  amount: z.number().min(0).max(1_000_000),
  date: z.string().min(8).max(32),
  note: z.string().max(500).optional().nullable(),
});

export const payrollUpdateSchema = z.object({
  employeeId: z.string().min(1).max(64).optional(),
  type: z.enum(["salary", "advance", "bonus", "deduction"]).optional(),
  amount: z.number().min(0).max(1_000_000).optional(),
  date: z.string().min(8).max(32).optional(),
  note: z.string().max(500).optional().nullable(),
});

export const leaveCreateSchema = z.object({
  employeeId: z.string().min(1).max(64),
  from: z.string().min(8).max(32),
  to: z.string().min(8).max(32),
  status: z.enum(["pending", "approved", "rejected"]).optional().default("pending"),
  reason: z.string().max(500).optional().nullable(),
});

export const leaveUpdateSchema = z.object({
  employeeId: z.string().min(1).max(64).optional(),
  from: z.string().min(8).max(32).optional(),
  to: z.string().min(8).max(32).optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  reason: z.string().max(500).optional().nullable(),
});

export const backupCreateSchema = z.object({
  note: z.string().max(500).optional().nullable(),
});

export const backupImportSchema = z.object({
  snapshot: z.unknown(),
  note: z.string().max(500).optional().nullable(),
});

export const systemResetSchema = z.object({
  scope: z.enum(["transactions", "operational"]),
});

export const systemFactoryResetSchema = z
  .object({
    confirmText: z.string().min(2).max(200),
    confirmAck: z.boolean(),
  })
  .refine((value) => value.confirmAck, {
    message: "Confirmation is required",
    path: ["confirmAck"],
  });
