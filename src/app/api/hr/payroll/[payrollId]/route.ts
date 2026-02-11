import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { payrollUpdateSchema } from "@/server/validation/schemas";
import { mapPayroll, parseUiDate, toPayrollType } from "@/server/hr/mappers";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ payrollId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["hr:manage"] });
    const { payrollId } = await context.params;
    const payload = await readJson(request, payrollUpdateSchema);

    const existing = await db.payroll.findUnique({ where: { id: payrollId } });
    if (!existing) {
      throw new HttpError(404, "payroll_not_found", "Payroll record not found");
    }

    if (payload.employeeId) {
      const employee = await db.employee.findUnique({ where: { id: payload.employeeId }, select: { id: true } });
      if (!employee) {
        throw new HttpError(404, "employee_not_found", "Employee not found");
      }
    }

    const parsedDate = payload.date ? parseUiDate(payload.date) : undefined;
    if (payload.date && !parsedDate) {
      throw new HttpError(400, "invalid_date", "Invalid payroll date");
    }

    const payroll = await db.payroll.update({
      where: { id: payrollId },
      data: {
        ...(payload.employeeId !== undefined
          ? {
              employee: {
                connect: { id: payload.employeeId },
              },
            }
          : {}),
        ...(payload.type !== undefined ? { type: toPayrollType(payload.type) } : {}),
        ...(payload.amount !== undefined ? { amount: payload.amount } : {}),
        ...(payload.date !== undefined ? { date: parsedDate as Date } : {}),
        ...(payload.note !== undefined ? { note: payload.note?.trim() || null } : {}),
      },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
      },
    });

    return jsonOk({ payroll: mapPayroll(payroll) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ payrollId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["hr:manage"] });
    const { payrollId } = await context.params;

    const existing = await db.payroll.findUnique({ where: { id: payrollId }, select: { id: true } });
    if (!existing) {
      throw new HttpError(404, "payroll_not_found", "Payroll record not found");
    }

    await db.payroll.delete({ where: { id: payrollId } });

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
