import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { payrollCreateSchema } from "@/server/validation/schemas";
import { mapPayroll, parseUiDate, toPayrollType } from "@/server/hr/mappers";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["hr:view"] });

    const payroll = await db.payroll.findMany({
      orderBy: { date: "desc" },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
      },
    });

    return jsonOk({ payroll: payroll.map((row) => mapPayroll(row)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["hr:manage"] });
    const payload = await readJson(request, payrollCreateSchema);

    const [employee, date] = await Promise.all([
      db.employee.findUnique({ where: { id: payload.employeeId }, select: { id: true } }),
      Promise.resolve(parseUiDate(payload.date)),
    ]);

    if (!employee) {
      throw new HttpError(404, "employee_not_found", "Employee not found");
    }

    if (!date) {
      throw new HttpError(400, "invalid_date", "Invalid payroll date");
    }

    const payroll = await db.payroll.create({
      data: {
        employeeId: payload.employeeId,
        type: toPayrollType(payload.type),
        amount: payload.amount,
        date,
        note: payload.note?.trim() || null,
      },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
      },
    });

    return jsonOk({ payroll: mapPayroll(payroll) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
