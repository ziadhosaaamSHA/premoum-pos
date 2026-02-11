import { NextRequest } from "next/server";
import { SaleStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { buildInvoiceNo, mapSale, parseUiDate, toSaleStatus } from "@/server/sales/mappers";
import { salesCreateSchema } from "@/server/validation/schemas";

const saleInclude = {
  items: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
    },
  },
} as const;

function parseStatus(value: string | null) {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v === "draft") return SaleStatus.DRAFT;
  if (v === "paid") return SaleStatus.PAID;
  if (v === "void") return SaleStatus.VOID;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["sales:view"] });

    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();
    const status = parseStatus(request.nextUrl.searchParams.get("status"));

    const sales = await db.sale.findMany({
      where: {
        ...(status ? { status } : {}),
      },
      orderBy: { date: "desc" },
      include: saleInclude,
    });

    const filtered = sales.filter((sale) => {
      if (!search) return true;
      return (
        sale.invoiceNo.toLowerCase().includes(search) ||
        sale.customerName.toLowerCase().includes(search) ||
        sale.date.toISOString().slice(0, 10).includes(search)
      );
    });

    return jsonOk({
      sales: filtered.map((sale) => mapSale(sale)),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, { allPermissions: ["sales:manage"] });
    const payload = await readJson(request, salesCreateSchema);

    const parsedDate = parseUiDate(payload.date);
    if (!parsedDate) {
      throw new HttpError(400, "invalid_date", "Invalid sale date");
    }

    const sale = await db.sale.create({
      data: {
        invoiceNo: buildInvoiceNo(),
        date: parsedDate,
        customerName: payload.customerName.trim(),
        total: payload.total,
        status: toSaleStatus(payload.status),
        createdById: auth.user.id,
        items: {
          createMany: {
            data: payload.items.map((item) => ({
              name: item.trim(),
              quantity: 1,
              unitPrice: 0,
              totalPrice: 0,
            })),
          },
        },
      },
      include: saleInclude,
    });

    return jsonOk({ sale: mapSale(sale) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
