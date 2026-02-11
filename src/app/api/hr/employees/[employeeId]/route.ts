import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { employeeUpdateSchema } from "@/server/validation/schemas";
import { mapEmployee, toEmployeeStatus } from "@/server/hr/mappers";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["hr:manage"] });
    const { employeeId } = await context.params;
    const payload = await readJson(request, employeeUpdateSchema);

    const existing = await db.employee.findUnique({ where: { id: employeeId } });
    if (!existing) {
      throw new HttpError(404, "employee_not_found", "Employee not found");
    }

    const employee = await db.employee.update({
      where: { id: employeeId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
        ...(payload.role !== undefined ? { roleTitle: payload.role.trim() } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone?.trim() || null } : {}),
        ...(payload.status !== undefined ? { status: toEmployeeStatus(payload.status) } : {}),
      },
    });

    return jsonOk({ employee: mapEmployee(employee) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["hr:manage"] });
    const { employeeId } = await context.params;

    const existing = await db.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!existing) {
      throw new HttpError(404, "employee_not_found", "Employee not found");
    }

    await db.employee.delete({ where: { id: employeeId } });

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
