import { NextRequest } from "next/server";
import { SaleStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { retailPaymentPlanCreateSchema } from "@/server/validation/schemas";

const paymentPlanSelect = {
  id: true,
  invoiceNo: true,
  customerName: true,
  customerPhone: true,
  totalAmount: true,
  downPayment: true,
  remainingAmount: true,
  installmentCount: true,
  installmentAmount: true,
  firstDueDate: true,
  status: true,
  notes: true,
  createdAt: true,
} as const;

function parseDueDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "invalid_first_due_date", "Invalid first due date");
  }
  return parsed;
}

function normalizePaymentPlanAmounts(totalAmount: number, downPayment: number, installmentCount: number) {
  if (downPayment > totalAmount) {
    throw new HttpError(400, "invalid_down_payment", "Down payment cannot exceed invoice total");
  }
  const remainingAmount = Math.max(0, totalAmount - downPayment);
  const installmentAmount = Math.round((remainingAmount / installmentCount) * 100) / 100;
  return { remainingAmount, installmentAmount };
}

function mapPaymentPlan(row: {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerPhone: string | null;
  totalAmount: unknown;
  downPayment: unknown;
  remainingAmount: unknown;
  installmentCount: number;
  installmentAmount: unknown;
  firstDueDate: Date | null;
  status: string;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    invoiceNo: row.invoiceNo,
    customer: row.customerName,
    customerPhone: row.customerPhone,
    totalAmount: Number(row.totalAmount),
    downPayment: Number(row.downPayment),
    remainingAmount: Number(row.remainingAmount),
    installmentCount: row.installmentCount,
    installmentAmount: Number(row.installmentAmount),
    firstDueDate: row.firstDueDate?.toISOString().slice(0, 10) || null,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["sales:view"] });

    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();
    const rows = await db.retailPaymentPlan.findMany({
      orderBy: { createdAt: "desc" },
      select: paymentPlanSelect,
    });

    const filtered = rows.filter((row) => {
      if (!search) return true;
      return (
        row.invoiceNo.toLowerCase().includes(search) ||
        row.customerName.toLowerCase().includes(search) ||
        (row.customerPhone || "").toLowerCase().includes(search)
      );
    });

    return jsonOk({ paymentPlans: filtered.map((row) => mapPaymentPlan(row)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, { allPermissions: ["sales:manage"] });
    const payload = await readJson(request, retailPaymentPlanCreateSchema);
    const invoiceNo = payload.invoiceNo?.trim();
    const customerPhone = payload.customerPhone?.trim();

    const sale = await db.sale.findFirst({
      where: invoiceNo
        ? { invoiceNo }
        : {
            customerPhone,
            status: { not: SaleStatus.VOID },
          },
      orderBy: { date: "desc" },
      select: {
        id: true,
        invoiceNo: true,
        customerName: true,
        customerPhone: true,
        total: true,
      },
    });

    const totalAmount = Number(sale?.total ?? payload.totalAmount ?? 0);
    if (!sale && (!payload.customerName?.trim() || totalAmount <= 0)) {
      throw new HttpError(
        400,
        "payment_plan_invoice_required",
        "Payment plan requires a matching invoice or customer name with total amount"
      );
    }

    const downPayment = Number(payload.downPayment || 0);
    const installmentCount = Number(payload.installmentCount || 0);
    const { remainingAmount, installmentAmount } = normalizePaymentPlanAmounts(
      totalAmount,
      downPayment,
      installmentCount
    );
    const firstDueDate = parseDueDate(payload.firstDueDate);
    const paymentPlanData = {
      invoiceNo: sale?.invoiceNo || invoiceNo || "بدون فاتورة",
      customerName: sale?.customerName || payload.customerName?.trim() || "عميل",
      customerPhone: customerPhone || sale?.customerPhone || null,
      totalAmount,
      downPayment,
      remainingAmount,
      installmentCount,
      installmentAmount,
      firstDueDate,
      status: "active",
      notes: payload.notes?.trim() || null,
      createdById: auth.user.id,
    };

    const row = sale
      ? await db.retailPaymentPlan.upsert({
          where: { saleId: sale.id },
          update: paymentPlanData,
          create: {
            ...paymentPlanData,
            saleId: sale.id,
          },
          select: paymentPlanSelect,
        })
      : await db.retailPaymentPlan.create({
          data: paymentPlanData,
          select: paymentPlanSelect,
        });

    return jsonOk({ paymentPlan: mapPaymentPlan(row) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
