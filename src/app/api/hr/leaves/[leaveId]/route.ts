import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { leaveUpdateSchema } from "@/server/validation/schemas";
import { mapLeave, parseUiDate, toLeaveStatus } from "@/server/hr/mappers";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ leaveId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["hr:manage"] });
    const { leaveId } = await context.params;
    const payload = await readJson(request, leaveUpdateSchema);

    const existing = await db.leave.findUnique({ where: { id: leaveId } });
    if (!existing) {
      throw new HttpError(404, "leave_not_found", "Leave request not found");
    }

    if (payload.employeeId) {
      const employee = await db.employee.findUnique({ where: { id: payload.employeeId }, select: { id: true } });
      if (!employee) {
        throw new HttpError(404, "employee_not_found", "Employee not found");
      }
    }

    const fromDate = payload.from ? parseUiDate(payload.from) : undefined;
    const toDate = payload.to ? parseUiDate(payload.to) : undefined;

    if (payload.from && !fromDate) {
      throw new HttpError(400, "invalid_date", "Invalid leave start date");
    }
    if (payload.to && !toDate) {
      throw new HttpError(400, "invalid_date", "Invalid leave end date");
    }

    const effectiveFrom = fromDate ?? existing.fromDate;
    const effectiveTo = toDate ?? existing.toDate;

    if (effectiveFrom > effectiveTo) {
      throw new HttpError(400, "invalid_range", "Leave start date must be before end date");
    }

    const leave = await db.leave.update({
      where: { id: leaveId },
      data: {
        ...(payload.employeeId !== undefined
          ? {
              employee: {
                connect: { id: payload.employeeId },
              },
            }
          : {}),
        ...(payload.from !== undefined ? { fromDate: fromDate as Date } : {}),
        ...(payload.to !== undefined ? { toDate: toDate as Date } : {}),
        ...(payload.status !== undefined ? { status: toLeaveStatus(payload.status) } : {}),
        ...(payload.reason !== undefined ? { reason: payload.reason?.trim() || null } : {}),
      },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
      },
    });

    return jsonOk({ leave: mapLeave(leave) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ leaveId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["hr:manage"] });
    const { leaveId } = await context.params;

    const existing = await db.leave.findUnique({ where: { id: leaveId }, select: { id: true } });
    if (!existing) {
      throw new HttpError(404, "leave_not_found", "Leave request not found");
    }

    await db.leave.delete({ where: { id: leaveId } });

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
