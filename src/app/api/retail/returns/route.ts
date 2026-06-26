import { NextRequest } from "next/server";
import { SaleStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { generateCode } from "@/server/pos/mappers";
import { retailReturnExchangeCreateSchema } from "@/server/validation/schemas";

const returnExchangeSelect = {
  id: true,
  code: true,
  invoiceNo: true,
  customerName: true,
  customerPhone: true,
  type: true,
  status: true,
  reason: true,
  refundAmount: true,
  exchangeAmount: true,
  notes: true,
  createdAt: true,
} as const;

function mapReturnExchange(row: {
  id: string;
  code: string;
  invoiceNo: string;
  customerName: string;
  customerPhone: string | null;
  type: string;
  status: string;
  reason: string | null;
  refundAmount: unknown;
  exchangeAmount: unknown;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    code: row.code,
    invoiceNo: row.invoiceNo,
    customer: row.customerName,
    customerPhone: row.customerPhone,
    type: row.type === "exchange" ? "exchange" : "return",
    status: row.status,
    reason: row.reason,
    refundAmount: Number(row.refundAmount),
    exchangeAmount: Number(row.exchangeAmount),
    notes: row.notes,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["sales:view"] });

    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();
    const rows = await db.retailReturnExchange.findMany({
      orderBy: { createdAt: "desc" },
      select: returnExchangeSelect,
    });

    const filtered = rows.filter((row) => {
      if (!search) return true;
      return (
        row.code.toLowerCase().includes(search) ||
        row.invoiceNo.toLowerCase().includes(search) ||
        row.customerName.toLowerCase().includes(search) ||
        (row.customerPhone || "").toLowerCase().includes(search)
      );
    });

    return jsonOk({ returns: filtered.map((row) => mapReturnExchange(row)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, { allPermissions: ["sales:manage"] });
    const payload = await readJson(request, retailReturnExchangeCreateSchema);
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
      },
    });

    if (!sale && !payload.customerName?.trim()) {
      throw new HttpError(400, "customer_name_required", "Customer name is required when no matching invoice is found");
    }

    const row = await db.retailReturnExchange.create({
      data: {
        code: generateCode(payload.type === "exchange" ? "EXC" : "RET"),
        saleId: sale?.id || null,
        invoiceNo: sale?.invoiceNo || invoiceNo || "بدون فاتورة",
        customerName: sale?.customerName || payload.customerName?.trim() || "عميل",
        customerPhone: customerPhone || sale?.customerPhone || null,
        type: payload.type,
        reason: payload.reason?.trim() || null,
        refundAmount: payload.refundAmount || 0,
        exchangeAmount: payload.exchangeAmount || 0,
        notes: payload.notes?.trim() || null,
        createdById: auth.user.id,
      },
      select: returnExchangeSelect,
    });

    return jsonOk({ returnExchange: mapReturnExchange(row) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
