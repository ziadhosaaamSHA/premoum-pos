import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { expenseCreateSchema } from "@/server/validation/schemas";
import { mapExpense, parseUiDate } from "@/server/finance/mappers";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["finance:view"] });

    const expenses = await db.expense.findMany({
      orderBy: { date: "desc" },
    });

    return jsonOk({
      expenses: expenses.map((expense) => mapExpense(expense)),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, { allPermissions: ["finance:manage"] });
    const payload = await readJson(request, expenseCreateSchema);

    const parsedDate = parseUiDate(payload.date);
    if (!parsedDate) {
      throw new HttpError(400, "invalid_date", "Invalid expense date");
    }

    const expense = await db.expense.create({
      data: {
        date: parsedDate,
        title: payload.title.trim(),
        vendor: payload.vendor?.trim() || null,
        amount: payload.amount,
        notes: payload.notes?.trim() || null,
        createdById: auth.user.id,
      },
    });

    return jsonOk({ expense: mapExpense(expense) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
