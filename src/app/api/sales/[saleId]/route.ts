import { SaleStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { mapSale, parseUiDate, toSaleStatus } from "@/server/sales/mappers";
import { salesUpdateSchema } from "@/server/validation/schemas";

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

function hasPermission(auth: { user: { isOwner: boolean; permissions: string[] } }, code: string) {
  return auth.user.isOwner || auth.user.permissions.includes(code);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ saleId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["sales:view"] });
    const { saleId } = await context.params;

    const sale = await db.sale.findUnique({
      where: { id: saleId },
      include: saleInclude,
    });
    if (!sale) {
      throw new HttpError(404, "sale_not_found", "Sale not found");
    }

    return jsonOk({ sale: mapSale(sale) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ saleId: string }> }
) {
  try {
    const auth = await requireAuth(request, { anyPermission: ["sales:manage", "sales:approve"] });
    const { saleId } = await context.params;
    const payload = await readJson(request, salesUpdateSchema);

    const sale = await db.sale.findUnique({
      where: { id: saleId },
      include: saleInclude,
    });
    if (!sale) {
      throw new HttpError(404, "sale_not_found", "Sale not found");
    }

    const editingFieldsProvided =
      payload.date !== undefined ||
      payload.customerName !== undefined ||
      payload.total !== undefined ||
      payload.items !== undefined;
    const statusOnlyApproval = !editingFieldsProvided && payload.status === "paid";

    if (statusOnlyApproval) {
      if (!hasPermission(auth, "sales:approve") && !hasPermission(auth, "sales:manage")) {
        throw new HttpError(403, "forbidden", "Missing permission to approve invoices");
      }
      if (sale.orderId) {
        throw new HttpError(
          400,
          "linked_sale_auto_managed",
          "Order-linked invoices are auto-approved when the order is completed"
        );
      }
      if (sale.status !== SaleStatus.DRAFT) {
        throw new HttpError(400, "sale_not_draft", "Only draft invoices can be approved");
      }

      const approved = await db.sale.update({
        where: { id: sale.id },
        data: { status: SaleStatus.PAID },
        include: saleInclude,
      });
      return jsonOk({ sale: mapSale(approved) });
    }

    if (!hasPermission(auth, "sales:manage")) {
      throw new HttpError(403, "forbidden", "Missing permission to edit invoices");
    }
    if (sale.status !== SaleStatus.DRAFT) {
      throw new HttpError(400, "sale_not_draft", "Only draft invoices can be edited");
    }
    if (sale.orderId) {
      throw new HttpError(400, "linked_sale_protected", "Order-linked invoices cannot be edited");
    }

    let parsedDate: Date | undefined;
    if (payload.date !== undefined) {
      parsedDate = parseUiDate(payload.date) || undefined;
      if (!parsedDate) {
        throw new HttpError(400, "invalid_date", "Invalid sale date");
      }
    }

    const updated = await db.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          date: parsedDate,
          customerName: payload.customerName?.trim(),
          total: payload.total,
          status: payload.status ? toSaleStatus(payload.status) : undefined,
        },
      });

      if (payload.items) {
        await tx.saleItem.deleteMany({ where: { saleId: sale.id } });
        await tx.saleItem.createMany({
          data: payload.items.map((item) => ({
            saleId: sale.id,
            name: item.trim(),
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
          })),
        });
      }

      return tx.sale.findUniqueOrThrow({
        where: { id: sale.id },
        include: saleInclude,
      });
    });

    return jsonOk({ sale: mapSale(updated) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ saleId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["sales:manage"] });
    const { saleId } = await context.params;

    const sale = await db.sale.findUnique({
      where: { id: saleId },
      select: {
        id: true,
        status: true,
        orderId: true,
      },
    });
    if (!sale) {
      throw new HttpError(404, "sale_not_found", "Sale not found");
    }
    if (sale.status !== SaleStatus.DRAFT) {
      throw new HttpError(400, "sale_not_draft", "Only draft invoices can be deleted");
    }
    if (sale.orderId) {
      throw new HttpError(400, "linked_sale_protected", "Order-linked invoices cannot be deleted");
    }

    await db.sale.delete({ where: { id: sale.id } });
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
