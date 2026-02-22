import {
  EmployeeStatus,
  LeaveStatus,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PayrollType,
  Prisma,
  PrismaClient,
  PurchaseStatus,
  SaleStatus,
  ShiftStatus,
  ZoneStatus,
} from "@prisma/client";
import { db } from "@/server/db";
import { SYSTEM_SETTINGS_ID } from "@/server/system/setup";

export type ResetScope = "transactions" | "operational";

type DbClient = PrismaClient | Prisma.TransactionClient;

type SnapshotEntity<T> = T[];

export type SystemSnapshot = {
  version: number;
  exportedAt: string;
  data: {
    categories: SnapshotEntity<{
      id: string;
      name: string;
      description: string | null;
    }>;
    materials: SnapshotEntity<{
      id: string;
      name: string;
      unit: string;
      cost: number;
      stock: number;
      minStock: number;
    }>;
    products: SnapshotEntity<{
      id: string;
      name: string;
      categoryId: string;
      price: number;
      isActive: boolean;
      imageUrl: string | null;
    }>;
    recipeItems: SnapshotEntity<{
      id: string;
      productId: string;
      materialId: string;
      quantity: number;
    }>;
    suppliers: SnapshotEntity<{
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      isActive: boolean;
    }>;
    purchases: SnapshotEntity<{
      id: string;
      code: string;
      supplierId: string;
      date: string;
      total: number;
      status: string;
      notes: string | null;
    }>;
    purchaseItems: SnapshotEntity<{
      id: string;
      purchaseId: string;
      materialId: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }>;
    waste: SnapshotEntity<{
      id: string;
      date: string;
      materialId: string;
      quantity: number;
      reason: string;
      cost: number;
    }>;
    zones: SnapshotEntity<{
      id: string;
      name: string;
      limitKm: number;
      fee: number;
      minOrder: number;
      status: string;
    }>;
    taxes: SnapshotEntity<{
      id: string;
      name: string;
      rate: number;
      isDefault: boolean;
      isActive: boolean;
    }>;
    drivers: SnapshotEntity<{
      id: string;
      name: string;
      phone: string | null;
      status: string;
      activeOrders: number;
    }>;
    diningTables: SnapshotEntity<{
      id: string;
      name: string;
      number: number;
      isOccupied: boolean;
    }>;
    orders: SnapshotEntity<{
      id: string;
      code: string;
      type: string;
      status: string;
      customerName: string;
      zoneId: string | null;
      driverId: string | null;
      tableId: string | null;
      discount: number;
      taxRate: number;
      taxAmount: number;
      payment: string;
      notes: string | null;
      receiptSnapshot: Prisma.JsonValue | null;
      createdAt: string;
      updatedAt: string;
    }>;
    orderItems: SnapshotEntity<{
      id: string;
      orderId: string;
      productId: string | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    sales: SnapshotEntity<{
      id: string;
      invoiceNo: string;
      orderId: string | null;
      date: string;
      customerName: string;
      total: number;
      status: string;
      notes: string | null;
    }>;
    saleItems: SnapshotEntity<{
      id: string;
      saleId: string;
      productId: string | null;
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    expenses: SnapshotEntity<{
      id: string;
      date: string;
      title: string;
      vendor: string | null;
      amount: number;
      notes: string | null;
    }>;
    employees: SnapshotEntity<{
      id: string;
      userId: string | null;
      name: string;
      roleTitle: string;
      phone: string | null;
      status: string;
    }>;
    attendance: SnapshotEntity<{
      id: string;
      employeeId: string;
      checkIn: string;
      checkOut: string | null;
      status: string;
      notes: string | null;
    }>;
    shiftTemplates: SnapshotEntity<{
      id: string;
      name: string;
      startTime: string;
      endTime: string;
      staffCount: number | null;
      status: string;
    }>;
    shiftLogs: SnapshotEntity<{
      id: string;
      employeeId: string;
      startedAt: string;
      endedAt: string | null;
      durationMinutes: number;
      pauses: unknown;
    }>;
    payroll: SnapshotEntity<{
      id: string;
      employeeId: string;
      type: string;
      amount: number;
      date: string;
      note: string | null;
    }>;
    leaves: SnapshotEntity<{
      id: string;
      employeeId: string;
      fromDate: string;
      toDate: string;
      status: string;
      reason: string | null;
    }>;
  };
};

const SNAPSHOT_KEYS = [
  "categories",
  "materials",
  "products",
  "recipeItems",
  "suppliers",
  "purchases",
  "purchaseItems",
  "waste",
  "zones",
  "drivers",
  "diningTables",
  "orders",
  "orderItems",
  "sales",
  "saleItems",
  "expenses",
  "employees",
  "attendance",
  "shiftTemplates",
  "shiftLogs",
  "payroll",
  "leaves",
] as const;

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function toPurchaseStatus(value: string) {
  if (Object.values(PurchaseStatus).includes(value as PurchaseStatus)) {
    return value as PurchaseStatus;
  }
  return PurchaseStatus.DRAFT;
}

function toZoneStatus(value: string) {
  if (Object.values(ZoneStatus).includes(value as ZoneStatus)) {
    return value as ZoneStatus;
  }
  return ZoneStatus.ACTIVE;
}

function toEmployeeStatus(value: string) {
  if (Object.values(EmployeeStatus).includes(value as EmployeeStatus)) {
    return value as EmployeeStatus;
  }
  return EmployeeStatus.ACTIVE;
}

function toShiftStatus(value: string) {
  if (Object.values(ShiftStatus).includes(value as ShiftStatus)) {
    return value as ShiftStatus;
  }
  return ShiftStatus.ACTIVE;
}

function toPayrollType(value: string) {
  if (Object.values(PayrollType).includes(value as PayrollType)) {
    return value as PayrollType;
  }
  return PayrollType.SALARY;
}

function toLeaveStatus(value: string) {
  if (Object.values(LeaveStatus).includes(value as LeaveStatus)) {
    return value as LeaveStatus;
  }
  return LeaveStatus.PENDING;
}

function toOrderType(value: string) {
  if (Object.values(OrderType).includes(value as OrderType)) {
    return value as OrderType;
  }
  return OrderType.DINE_IN;
}

function toOrderStatus(value: string) {
  if (Object.values(OrderStatus).includes(value as OrderStatus)) {
    return value as OrderStatus;
  }
  return OrderStatus.PREPARING;
}

function toPaymentMethod(value: string) {
  if (Object.values(PaymentMethod).includes(value as PaymentMethod)) {
    return value as PaymentMethod;
  }
  return PaymentMethod.CASH;
}

function toSaleStatus(value: string) {
  if (Object.values(SaleStatus).includes(value as SaleStatus)) {
    return value as SaleStatus;
  }
  return SaleStatus.DRAFT;
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toBoolean(value: unknown) {
  return Boolean(value);
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function toNullableText(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value);
  return text.length ? text : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function ensureArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => isRecord(item));
}

export function parseSystemSnapshot(payload: unknown): SystemSnapshot | null {
  if (!isRecord(payload)) return null;

  const maybeData = isRecord(payload.data) ? payload.data : payload;

  const missingKeys = SNAPSHOT_KEYS.filter((key) => !Array.isArray(maybeData[key]));
  if (missingKeys.length > 0) return null;

  const data = {
    categories: ensureArray(maybeData.categories).map((row) => ({
      id: toText(row.id),
      name: toText(row.name),
      description: toNullableText(row.description),
    })),
    materials: ensureArray(maybeData.materials).map((row) => ({
      id: toText(row.id),
      name: toText(row.name),
      unit: toText(row.unit),
      cost: toNumber(row.cost),
      stock: toNumber(row.stock),
      minStock: toNumber(row.minStock),
    })),
    products: ensureArray(maybeData.products).map((row) => ({
      id: toText(row.id),
      name: toText(row.name),
      categoryId: toText(row.categoryId),
      price: toNumber(row.price),
      isActive: toBoolean(row.isActive),
      imageUrl: toNullableText(row.imageUrl),
    })),
    recipeItems: ensureArray(maybeData.recipeItems).map((row) => ({
      id: toText(row.id),
      productId: toText(row.productId),
      materialId: toText(row.materialId),
      quantity: toNumber(row.quantity),
    })),
    suppliers: ensureArray(maybeData.suppliers).map((row) => ({
      id: toText(row.id),
      name: toText(row.name),
      phone: toNullableText(row.phone),
      email: toNullableText(row.email),
      isActive: toBoolean(row.isActive),
    })),
    purchases: ensureArray(maybeData.purchases).map((row) => ({
      id: toText(row.id),
      code: toText(row.code),
      supplierId: toText(row.supplierId),
      date: toText(row.date),
      total: toNumber(row.total),
      status: toText(row.status),
      notes: toNullableText(row.notes),
    })),
    purchaseItems: ensureArray(maybeData.purchaseItems).map((row) => ({
      id: toText(row.id),
      purchaseId: toText(row.purchaseId),
      materialId: toText(row.materialId),
      quantity: toNumber(row.quantity),
      unitCost: toNumber(row.unitCost),
      totalCost: toNumber(row.totalCost),
    })),
    waste: ensureArray(maybeData.waste).map((row) => ({
      id: toText(row.id),
      date: toText(row.date),
      materialId: toText(row.materialId),
      quantity: toNumber(row.quantity),
      reason: toText(row.reason),
      cost: toNumber(row.cost),
    })),
    zones: ensureArray(maybeData.zones).map((row) => ({
      id: toText(row.id),
      name: toText(row.name),
      limitKm: toNumber(row.limitKm),
      fee: toNumber(row.fee),
      minOrder: toNumber(row.minOrder),
      status: toText(row.status),
    })),
    taxes: ensureArray(maybeData.taxes).map((row) => ({
      id: toText(row.id),
      name: toText(row.name),
      rate: toNumber(row.rate),
      isDefault: toBoolean(row.isDefault),
      isActive: toBoolean(row.isActive),
    })),
    drivers: ensureArray(maybeData.drivers).map((row) => ({
      id: toText(row.id),
      name: toText(row.name),
      phone: toNullableText(row.phone),
      status: toText(row.status),
      activeOrders: Math.max(0, Math.round(toNumber(row.activeOrders))),
    })),
    diningTables: ensureArray(maybeData.diningTables).map((row) => ({
      id: toText(row.id),
      name: toText(row.name),
      number: Math.max(1, Math.round(toNumber(row.number))),
      isOccupied: toBoolean(row.isOccupied),
    })),
    orders: ensureArray(maybeData.orders).map((row) => ({
      id: toText(row.id),
      code: toText(row.code),
      type: toText(row.type),
      status: toText(row.status),
      customerName: toText(row.customerName),
      zoneId: toNullableText(row.zoneId),
      driverId: toNullableText(row.driverId),
      tableId: toNullableText(row.tableId),
      discount: toNumber(row.discount),
      taxRate: toNumber(row.taxRate),
      taxAmount: toNumber(row.taxAmount),
      payment: toText(row.payment),
      notes: toNullableText(row.notes),
      receiptSnapshot: row.receiptSnapshot ?? null,
      createdAt: toText(row.createdAt),
      updatedAt: toText(row.updatedAt),
    })),
    orderItems: ensureArray(maybeData.orderItems).map((row) => ({
      id: toText(row.id),
      orderId: toText(row.orderId),
      productId: toNullableText(row.productId),
      quantity: Math.max(1, Math.round(toNumber(row.quantity))),
      unitPrice: toNumber(row.unitPrice),
      totalPrice: toNumber(row.totalPrice),
    })),
    sales: ensureArray(maybeData.sales).map((row) => ({
      id: toText(row.id),
      invoiceNo: toText(row.invoiceNo),
      orderId: toNullableText(row.orderId),
      date: toText(row.date),
      customerName: toText(row.customerName),
      total: toNumber(row.total),
      status: toText(row.status),
      notes: toNullableText(row.notes),
    })),
    saleItems: ensureArray(maybeData.saleItems).map((row) => ({
      id: toText(row.id),
      saleId: toText(row.saleId),
      productId: toNullableText(row.productId),
      name: toText(row.name),
      quantity: Math.max(1, Math.round(toNumber(row.quantity))),
      unitPrice: toNumber(row.unitPrice),
      totalPrice: toNumber(row.totalPrice),
    })),
    expenses: ensureArray(maybeData.expenses).map((row) => ({
      id: toText(row.id),
      date: toText(row.date),
      title: toText(row.title),
      vendor: toNullableText(row.vendor),
      amount: toNumber(row.amount),
      notes: toNullableText(row.notes),
    })),
    employees: ensureArray(maybeData.employees).map((row) => ({
      id: toText(row.id),
      userId: toNullableText(row.userId),
      name: toText(row.name),
      roleTitle: toText(row.roleTitle),
      phone: toNullableText(row.phone),
      status: toText(row.status),
    })),
    attendance: ensureArray(maybeData.attendance).map((row) => ({
      id: toText(row.id),
      employeeId: toText(row.employeeId),
      checkIn: toText(row.checkIn),
      checkOut: toNullableText(row.checkOut),
      status: toText(row.status),
      notes: toNullableText(row.notes),
    })),
    shiftTemplates: ensureArray(maybeData.shiftTemplates).map((row) => ({
      id: toText(row.id),
      name: toText(row.name),
      startTime: toText(row.startTime),
      endTime: toText(row.endTime),
      staffCount: row.staffCount === null || row.staffCount === undefined ? null : Math.max(0, Math.round(toNumber(row.staffCount))),
      status: toText(row.status),
    })),
    shiftLogs: ensureArray(maybeData.shiftLogs).map((row) => ({
      id: toText(row.id),
      employeeId: toText(row.employeeId),
      startedAt: toText(row.startedAt),
      endedAt: toNullableText(row.endedAt),
      durationMinutes: Math.max(0, Math.round(toNumber(row.durationMinutes))),
      pauses: row.pauses ?? [],
    })),
    payroll: ensureArray(maybeData.payroll).map((row) => ({
      id: toText(row.id),
      employeeId: toText(row.employeeId),
      type: toText(row.type),
      amount: toNumber(row.amount),
      date: toText(row.date),
      note: toNullableText(row.note),
    })),
    leaves: ensureArray(maybeData.leaves).map((row) => ({
      id: toText(row.id),
      employeeId: toText(row.employeeId),
      fromDate: toText(row.fromDate),
      toDate: toText(row.toDate),
      status: toText(row.status),
      reason: toNullableText(row.reason),
    })),
  };

  return {
    version: typeof payload.version === "number" ? payload.version : 1,
    exportedAt: typeof payload.exportedAt === "string" ? payload.exportedAt : new Date().toISOString(),
    data,
  };
}

export async function buildSystemSnapshot(client: DbClient = db): Promise<SystemSnapshot> {
  const [
    categories,
    materials,
    products,
    recipeItems,
    suppliers,
    purchases,
    purchaseItems,
    waste,
    zones,
    taxes,
    drivers,
    diningTables,
    orders,
    orderItems,
    sales,
    saleItems,
    expenses,
    employees,
    attendance,
    shiftTemplates,
    shiftLogs,
    payroll,
    leaves,
  ] = await Promise.all([
    client.category.findMany({ orderBy: { name: "asc" } }),
    client.material.findMany({ orderBy: { name: "asc" } }),
    client.product.findMany({ orderBy: { createdAt: "asc" } }),
    client.recipeItem.findMany({ orderBy: { id: "asc" } }),
    client.supplier.findMany({ orderBy: { name: "asc" } }),
    client.purchase.findMany({ orderBy: { date: "asc" } }),
    client.purchaseItem.findMany({ orderBy: { id: "asc" } }),
    client.waste.findMany({ orderBy: { date: "asc" } }),
    client.zone.findMany({ orderBy: { name: "asc" } }),
    client.taxRate.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
    client.driver.findMany({ orderBy: { name: "asc" } }),
    client.diningTable.findMany({ orderBy: { number: "asc" } }),
    client.order.findMany({ orderBy: { createdAt: "asc" } }),
    client.orderItem.findMany({ orderBy: { id: "asc" } }),
    client.sale.findMany({ orderBy: { date: "asc" } }),
    client.saleItem.findMany({ orderBy: { id: "asc" } }),
    client.expense.findMany({ orderBy: { date: "asc" } }),
    client.employee.findMany({ orderBy: { createdAt: "asc" } }),
    client.attendance.findMany({ orderBy: { checkIn: "asc" } }),
    client.shiftTemplate.findMany({ orderBy: { createdAt: "asc" } }),
    client.shiftLog.findMany({ orderBy: { startedAt: "asc" } }),
    client.payroll.findMany({ orderBy: { date: "asc" } }),
    client.leave.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      categories: categories.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
      })),
      materials: materials.map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        cost: Number(item.cost),
        stock: Number(item.stock),
        minStock: Number(item.minStock),
      })),
      products: products.map((item) => ({
        id: item.id,
        name: item.name,
        categoryId: item.categoryId,
        price: Number(item.price),
        isActive: item.isActive,
        imageUrl: item.imageUrl,
      })),
      recipeItems: recipeItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        materialId: item.materialId,
        quantity: Number(item.quantity),
      })),
      suppliers: suppliers.map((item) => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
        email: item.email,
        isActive: item.isActive,
      })),
      purchases: purchases.map((item) => ({
        id: item.id,
        code: item.code,
        supplierId: item.supplierId,
        date: item.date.toISOString(),
        total: Number(item.total),
        status: item.status,
        notes: item.notes,
      })),
      purchaseItems: purchaseItems.map((item) => ({
        id: item.id,
        purchaseId: item.purchaseId,
        materialId: item.materialId,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
        totalCost: Number(item.totalCost),
      })),
      waste: waste.map((item) => ({
        id: item.id,
        date: item.date.toISOString(),
        materialId: item.materialId,
        quantity: Number(item.quantity),
        reason: item.reason,
        cost: Number(item.cost),
      })),
      zones: zones.map((item) => ({
        id: item.id,
        name: item.name,
        limitKm: Number(item.limitKm),
        fee: Number(item.fee),
        minOrder: Number(item.minOrder),
        status: item.status,
      })),
      taxes: taxes.map((item) => ({
        id: item.id,
        name: item.name,
        rate: Number(item.rate),
        isDefault: item.isDefault,
        isActive: item.isActive,
      })),
      drivers: drivers.map((item) => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
        status: item.status,
        activeOrders: item.activeOrders,
      })),
      diningTables: diningTables.map((item) => ({
        id: item.id,
        name: item.name,
        number: item.number,
        isOccupied: item.isOccupied,
      })),
      orders: orders.map((item) => ({
        id: item.id,
        code: item.code,
        type: item.type,
        status: item.status,
        customerName: item.customerName,
        zoneId: item.zoneId,
        driverId: item.driverId,
        tableId: item.tableId,
        discount: Number(item.discount),
        taxRate: Number(item.taxRate),
        taxAmount: Number(item.taxAmount),
        payment: item.payment,
        notes: item.notes,
        receiptSnapshot: item.receiptSnapshot ?? null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      orderItems: orderItems.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      sales: sales.map((item) => ({
        id: item.id,
        invoiceNo: item.invoiceNo,
        orderId: item.orderId,
        date: item.date.toISOString(),
        customerName: item.customerName,
        total: Number(item.total),
        status: item.status,
        notes: item.notes,
      })),
      saleItems: saleItems.map((item) => ({
        id: item.id,
        saleId: item.saleId,
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      expenses: expenses.map((item) => ({
        id: item.id,
        date: item.date.toISOString(),
        title: item.title,
        vendor: item.vendor,
        amount: Number(item.amount),
        notes: item.notes,
      })),
      employees: employees.map((item) => ({
        id: item.id,
        userId: item.userId,
        name: item.name,
        roleTitle: item.roleTitle,
        phone: item.phone,
        status: item.status,
      })),
      attendance: attendance.map((item) => ({
        id: item.id,
        employeeId: item.employeeId,
        checkIn: item.checkIn.toISOString(),
        checkOut: item.checkOut ? item.checkOut.toISOString() : null,
        status: item.status,
        notes: item.notes,
      })),
      shiftTemplates: shiftTemplates.map((item) => ({
        id: item.id,
        name: item.name,
        startTime: item.startTime,
        endTime: item.endTime,
        staffCount: item.staffCount,
        status: item.status,
      })),
      shiftLogs: shiftLogs.map((item) => ({
        id: item.id,
        employeeId: item.employeeId,
        startedAt: item.startedAt.toISOString(),
        endedAt: item.endedAt ? item.endedAt.toISOString() : null,
        durationMinutes: item.durationMinutes,
        pauses: item.pauses,
      })),
      payroll: payroll.map((item) => ({
        id: item.id,
        employeeId: item.employeeId,
        type: item.type,
        amount: Number(item.amount),
        date: item.date.toISOString(),
        note: item.note,
      })),
      leaves: leaves.map((item) => ({
        id: item.id,
        employeeId: item.employeeId,
        fromDate: item.fromDate.toISOString(),
        toDate: item.toDate.toISOString(),
        status: item.status,
        reason: item.reason,
      })),
    },
  };
}

async function clearTransactions(client: Prisma.TransactionClient) {
  await client.saleItem.deleteMany();
  await client.sale.deleteMany();
  await client.orderItem.deleteMany();
  await client.order.deleteMany();
  await client.purchaseItem.deleteMany();
  await client.purchase.deleteMany();
  await client.waste.deleteMany();
  await client.expense.deleteMany();
  await client.attendance.deleteMany();
  await client.shiftLog.deleteMany();
  await client.payroll.deleteMany();
  await client.leave.deleteMany();

  await client.diningTable.updateMany({
    data: {
      isOccupied: false,
    },
  });

  await client.driver.updateMany({
    data: {
      activeOrders: 0,
    },
  });
}

async function clearOperational(client: Prisma.TransactionClient) {
  await clearTransactions(client);

  await client.recipeItem.deleteMany();
  await client.product.deleteMany();
  await client.category.deleteMany();
  await client.material.deleteMany();
  await client.supplier.deleteMany();
  await client.zone.deleteMany();
  await client.taxRate.deleteMany();
  await client.driver.deleteMany();
  await client.diningTable.deleteMany();
  await client.shiftTemplate.deleteMany();
  await client.employee.deleteMany();
}

export async function resetSystemData(scope: ResetScope) {
  await db.$transaction(async (client) => {
    if (scope === "transactions") {
      await clearTransactions(client);
      return;
    }

    await clearOperational(client);
  });
}

export async function factoryResetSystemData() {
  return db.$transaction(async (client) => {
    await clearOperational(client);

    await client.branch.deleteMany();
    await client.brandingSettings.deleteMany();
    await client.backupRecord.deleteMany();
    await client.auditLog.deleteMany();
    await client.session.deleteMany();
    await client.invite.deleteMany();
    await client.userRole.deleteMany();
    await client.rolePermission.deleteMany();
    await client.role.deleteMany();
    await client.user.deleteMany();

    await client.systemSettings.upsert({
      where: { id: SYSTEM_SETTINGS_ID },
      update: { setupCompletedAt: null },
      create: { id: SYSTEM_SETTINGS_ID },
    });
  });
}

export async function restoreSystemSnapshot(snapshot: SystemSnapshot) {
  await db.$transaction(async (client) => {
    await clearOperational(client);

    const categoryIds = new Set(snapshot.data.categories.map((item) => item.id));
    const materialIds = new Set(snapshot.data.materials.map((item) => item.id));
    const supplierIds = new Set(snapshot.data.suppliers.map((item) => item.id));
    const zoneIds = new Set(snapshot.data.zones.map((item) => item.id));
    const driverIds = new Set(snapshot.data.drivers.map((item) => item.id));
    const tableIds = new Set(snapshot.data.diningTables.map((item) => item.id));

    if (snapshot.data.categories.length > 0) {
      await client.category.createMany({
        data: snapshot.data.categories.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
        })),
      });
    }

    if (snapshot.data.materials.length > 0) {
      await client.material.createMany({
        data: snapshot.data.materials.map((item) => ({
          id: item.id,
          name: item.name,
          unit: item.unit,
          cost: item.cost,
          stock: item.stock,
          minStock: item.minStock,
        })),
      });
    }

    const products = snapshot.data.products.filter((item) => categoryIds.has(item.categoryId));
    const productIds = new Set(products.map((item) => item.id));

    if (products.length > 0) {
      await client.product.createMany({
        data: products.map((item) => ({
          id: item.id,
          name: item.name,
          categoryId: item.categoryId,
          price: item.price,
          isActive: item.isActive,
          imageUrl: item.imageUrl,
        })),
      });
    }

    const recipeItems = snapshot.data.recipeItems.filter(
      (item) => productIds.has(item.productId) && materialIds.has(item.materialId)
    );

    if (recipeItems.length > 0) {
      await client.recipeItem.createMany({
        data: recipeItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          materialId: item.materialId,
          quantity: item.quantity,
        })),
      });
    }

    if (snapshot.data.suppliers.length > 0) {
      await client.supplier.createMany({
        data: snapshot.data.suppliers.map((item) => ({
          id: item.id,
          name: item.name,
          phone: item.phone,
          email: item.email,
          isActive: item.isActive,
        })),
      });
    }

    const purchases = snapshot.data.purchases.filter((item) => supplierIds.has(item.supplierId));
    const purchaseIds = new Set(purchases.map((item) => item.id));

    if (purchases.length > 0) {
      const purchaseRows: Prisma.PurchaseCreateManyInput[] = [];
      for (const item of purchases) {
        const date = parseDate(item.date);
        if (!date) continue;
        purchaseRows.push({
          id: item.id,
          code: item.code,
          supplierId: item.supplierId,
          date,
          total: item.total,
          status: toPurchaseStatus(item.status),
          notes: item.notes,
        });
      }

      await client.purchase.createMany({
        data: purchaseRows,
      });
    }

    const purchaseItems = snapshot.data.purchaseItems.filter(
      (item) => purchaseIds.has(item.purchaseId) && materialIds.has(item.materialId)
    );
    if (purchaseItems.length > 0) {
      await client.purchaseItem.createMany({
        data: purchaseItems.map((item) => ({
          id: item.id,
          purchaseId: item.purchaseId,
          materialId: item.materialId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
        })),
      });
    }

    const waste = snapshot.data.waste.filter((item) => materialIds.has(item.materialId));
    if (waste.length > 0) {
      const wasteRows: Prisma.WasteCreateManyInput[] = [];
      for (const item of waste) {
        const date = parseDate(item.date);
        if (!date) continue;
        wasteRows.push({
          id: item.id,
          date,
          materialId: item.materialId,
          quantity: item.quantity,
          reason: item.reason,
          cost: item.cost,
        });
      }

      await client.waste.createMany({
        data: wasteRows,
      });
    }

    if (snapshot.data.zones.length > 0) {
      await client.zone.createMany({
        data: snapshot.data.zones.map((item) => ({
          id: item.id,
          name: item.name,
          limitKm: item.limitKm,
          fee: item.fee,
          minOrder: item.minOrder,
          status: toZoneStatus(item.status),
        })),
      });
    }

    if (snapshot.data.taxes.length > 0) {
      await client.taxRate.createMany({
        data: snapshot.data.taxes.map((item) => ({
          id: item.id,
          name: item.name,
          rate: item.rate,
          isDefault: item.isDefault,
          isActive: item.isActive,
        })),
      });
    }

    if (snapshot.data.drivers.length > 0) {
      await client.driver.createMany({
        data: snapshot.data.drivers.map((item) => ({
          id: item.id,
          name: item.name,
          phone: item.phone,
          status: item.status,
          activeOrders: item.activeOrders,
        })),
      });
    }

    if (snapshot.data.diningTables.length > 0) {
      await client.diningTable.createMany({
        data: snapshot.data.diningTables.map((item) => ({
          id: item.id,
          name: item.name,
          number: item.number,
          isOccupied: item.isOccupied,
        })),
      });
    }

    const userIds = new Set((await client.user.findMany({ select: { id: true } })).map((item) => item.id));

    if (snapshot.data.employees.length > 0) {
      await client.employee.createMany({
        data: snapshot.data.employees.map((item) => ({
          id: item.id,
          userId: item.userId && userIds.has(item.userId) ? item.userId : null,
          name: item.name,
          roleTitle: item.roleTitle,
          phone: item.phone,
          status: toEmployeeStatus(item.status),
        })),
      });
    }

    const employeeIds = new Set(snapshot.data.employees.map((item) => item.id));

    const attendance = snapshot.data.attendance.filter((item) => employeeIds.has(item.employeeId));
    if (attendance.length > 0) {
      const attendanceRows: Prisma.AttendanceCreateManyInput[] = [];
      for (const item of attendance) {
        const checkIn = parseDate(item.checkIn);
        if (!checkIn) continue;
        const checkOut = item.checkOut ? parseDate(item.checkOut) : null;
        attendanceRows.push({
          id: item.id,
          employeeId: item.employeeId,
          checkIn,
          checkOut,
          status: item.status,
          notes: item.notes,
        });
      }

      await client.attendance.createMany({
        data: attendanceRows,
      });
    }

    if (snapshot.data.shiftTemplates.length > 0) {
      await client.shiftTemplate.createMany({
        data: snapshot.data.shiftTemplates.map((item) => ({
          id: item.id,
          name: item.name,
          startTime: item.startTime,
          endTime: item.endTime,
          staffCount: item.staffCount,
          status: toShiftStatus(item.status),
        })),
      });
    }

    const shiftLogs = snapshot.data.shiftLogs.filter((item) => employeeIds.has(item.employeeId));
    if (shiftLogs.length > 0) {
      const shiftLogRows: Prisma.ShiftLogCreateManyInput[] = [];
      for (const item of shiftLogs) {
        const startedAt = parseDate(item.startedAt);
        if (!startedAt) continue;
        const endedAt = item.endedAt ? parseDate(item.endedAt) : null;
        shiftLogRows.push({
          id: item.id,
          employeeId: item.employeeId,
          startedAt,
          endedAt,
          durationMinutes: item.durationMinutes,
          pauses: (item.pauses ?? []) as Prisma.InputJsonValue,
        });
      }

      await client.shiftLog.createMany({
        data: shiftLogRows,
      });
    }

    const payroll = snapshot.data.payroll.filter((item) => employeeIds.has(item.employeeId));
    if (payroll.length > 0) {
      const payrollRows: Prisma.PayrollCreateManyInput[] = [];
      for (const item of payroll) {
        const date = parseDate(item.date);
        if (!date) continue;
        payrollRows.push({
          id: item.id,
          employeeId: item.employeeId,
          type: toPayrollType(item.type),
          amount: item.amount,
          date,
          note: item.note,
        });
      }

      await client.payroll.createMany({
        data: payrollRows,
      });
    }

    const leaves = snapshot.data.leaves.filter((item) => employeeIds.has(item.employeeId));
    if (leaves.length > 0) {
      const leaveRows: Prisma.LeaveCreateManyInput[] = [];
      for (const item of leaves) {
        const fromDate = parseDate(item.fromDate);
        const toDate = parseDate(item.toDate);
        if (!fromDate || !toDate) continue;
        leaveRows.push({
          id: item.id,
          employeeId: item.employeeId,
          fromDate,
          toDate,
          status: toLeaveStatus(item.status),
          reason: item.reason,
        });
      }

      await client.leave.createMany({
        data: leaveRows,
      });
    }

    const orders = snapshot.data.orders.filter(
      (item) =>
        (!item.zoneId || zoneIds.has(item.zoneId)) &&
        (!item.driverId || driverIds.has(item.driverId)) &&
        (!item.tableId || tableIds.has(item.tableId))
    );
    const orderIds = new Set(orders.map((item) => item.id));

    if (orders.length > 0) {
      const orderRows: Prisma.OrderCreateManyInput[] = [];
      for (const item of orders) {
        const createdAt = parseDate(item.createdAt);
        const updatedAt = parseDate(item.updatedAt);
        if (!createdAt || !updatedAt) continue;
        orderRows.push({
          id: item.id,
          code: item.code,
          type: toOrderType(item.type),
          status: toOrderStatus(item.status),
          customerName: item.customerName,
          zoneId: item.zoneId,
          driverId: item.driverId,
          tableId: item.tableId,
          discount: item.discount,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          payment: toPaymentMethod(item.payment),
          notes: item.notes,
          receiptSnapshot: item.receiptSnapshot ?? Prisma.DbNull,
          createdAt,
          updatedAt,
        });
      }

      await client.order.createMany({
        data: orderRows,
      });
    }

    const orderItems = snapshot.data.orderItems.filter(
      (item) => orderIds.has(item.orderId) && (!item.productId || productIds.has(item.productId))
    );
    if (orderItems.length > 0) {
      await client.orderItem.createMany({
        data: orderItems.map((item) => ({
          id: item.id,
          orderId: item.orderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      });
    }

    const sales = snapshot.data.sales.filter((item) => !item.orderId || orderIds.has(item.orderId));
    const saleIds = new Set(sales.map((item) => item.id));

    if (sales.length > 0) {
      const saleRows: Prisma.SaleCreateManyInput[] = [];
      for (const item of sales) {
        const date = parseDate(item.date);
        if (!date) continue;
        saleRows.push({
          id: item.id,
          invoiceNo: item.invoiceNo,
          orderId: item.orderId,
          date,
          customerName: item.customerName,
          total: item.total,
          status: toSaleStatus(item.status),
          notes: item.notes,
        });
      }

      await client.sale.createMany({
        data: saleRows,
      });
    }

    const saleItems = snapshot.data.saleItems.filter(
      (item) => saleIds.has(item.saleId) && (!item.productId || productIds.has(item.productId))
    );
    if (saleItems.length > 0) {
      await client.saleItem.createMany({
        data: saleItems.map((item) => ({
          id: item.id,
          saleId: item.saleId,
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      });
    }

    if (snapshot.data.expenses.length > 0) {
      const expenseRows: Prisma.ExpenseCreateManyInput[] = [];
      for (const item of snapshot.data.expenses) {
        const date = parseDate(item.date);
        if (!date) continue;
        expenseRows.push({
          id: item.id,
          date,
          title: item.title,
          vendor: item.vendor,
          amount: item.amount,
          notes: item.notes,
        });
      }

      await client.expense.createMany({
        data: expenseRows,
      });
    }
  });
}

export function summarizeSnapshot(snapshot: SystemSnapshot) {
  return {
    categories: snapshot.data.categories.length,
    materials: snapshot.data.materials.length,
    products: snapshot.data.products.length,
    taxes: snapshot.data.taxes.length,
    suppliers: snapshot.data.suppliers.length,
    orders: snapshot.data.orders.length,
    sales: snapshot.data.sales.length,
    expenses: snapshot.data.expenses.length,
    employees: snapshot.data.employees.length,
  };
}
