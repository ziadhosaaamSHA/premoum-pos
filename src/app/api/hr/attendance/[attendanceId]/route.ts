import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { attendanceUpdateSchema } from "@/server/validation/schemas";
import { mapAttendance, parseUiDate } from "@/server/hr/mappers";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ attendanceId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["hr:manage"] });
    const { attendanceId } = await context.params;
    const payload = await readJson(request, attendanceUpdateSchema);

    const existing = await db.attendance.findUnique({ where: { id: attendanceId } });
    if (!existing) {
      throw new HttpError(404, "attendance_not_found", "Attendance record not found");
    }

    if (payload.employeeId) {
      const employee = await db.employee.findUnique({ where: { id: payload.employeeId }, select: { id: true } });
      if (!employee) {
        throw new HttpError(404, "employee_not_found", "Employee not found");
      }
    }

    const checkInDate = payload.checkIn ? parseUiDate(payload.checkIn) : undefined;
    if (payload.checkIn && !checkInDate) {
      throw new HttpError(400, "invalid_checkin", "Invalid check-in time");
    }

    const checkOutDate = payload.checkOut ? parseUiDate(payload.checkOut) : undefined;
    if (payload.checkOut && !checkOutDate) {
      throw new HttpError(400, "invalid_checkout", "Invalid check-out time");
    }

    const attendance = await db.attendance.update({
      where: { id: attendanceId },
      data: {
        ...(payload.employeeId !== undefined
          ? {
              employee: {
                connect: { id: payload.employeeId },
              },
            }
          : {}),
        ...(payload.checkIn !== undefined ? { checkIn: checkInDate as Date } : {}),
        ...(payload.checkOut !== undefined ? { checkOut: payload.checkOut ? (checkOutDate as Date) : null } : {}),
        ...(payload.status !== undefined ? { status: payload.status.trim() } : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes?.trim() || null } : {}),
      },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
      },
    });

    return jsonOk({ attendance: mapAttendance(attendance) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ attendanceId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["hr:manage"] });
    const { attendanceId } = await context.params;

    const existing = await db.attendance.findUnique({ where: { id: attendanceId }, select: { id: true } });
    if (!existing) {
      throw new HttpError(404, "attendance_not_found", "Attendance record not found");
    }

    await db.attendance.delete({ where: { id: attendanceId } });

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
