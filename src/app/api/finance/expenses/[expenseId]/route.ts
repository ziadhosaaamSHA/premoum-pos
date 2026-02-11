import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { expenseUpdateSchema } from "@/server/validation/schemas";
import { mapExpense, parseUiDate } from "@/server/finance/mappers";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ expenseId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["finance:manage"] });

    const { expenseId } = await context.params;
    const payload = await readJson(request, expenseUpdateSchema);

    const existing = await db.expense.findUnique({ where: { id: expenseId } });
    if (!existing) {
      throw new HttpError(404, "expense_not_found", "Expense record not found");
    }

    const parsedDate = payload.date ? parseUiDate(payload.date) : null;
    if (payload.date && !parsedDate) {
      throw new HttpError(400, "invalid_date", "Invalid expense date");
    }

    const updated = await db.expense.update({
      where: { id: expenseId },
      data: {
        ...(parsedDate ? { date: parsedDate } : {}),
        ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
        ...(payload.vendor !== undefined ? { vendor: payload.vendor?.trim() || null } : {}),
        ...(payload.amount !== undefined ? { amount: payload.amount } : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes?.trim() || null } : {}),
      },
    });

    return jsonOk({ expense: mapExpense(updated) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ expenseId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["finance:manage"] });

    const { expenseId } = await context.params;

    const existing = await db.expense.findUnique({ where: { id: expenseId }, select: { id: true } });
    if (!existing) {
      throw new HttpError(404, "expense_not_found", "Expense record not found");
    }

    await db.expense.delete({ where: { id: expenseId } });

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
