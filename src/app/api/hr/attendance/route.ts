import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { attendanceCreateSchema } from "@/server/validation/schemas";
import { mapAttendance, parseUiDate } from "@/server/hr/mappers";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["hr:view"] });

    const attendance = await db.attendance.findMany({
      orderBy: { checkIn: "desc" },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
      },
    });

    return jsonOk({ attendance: attendance.map((row) => mapAttendance(row)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["hr:manage"] });
    const payload = await readJson(request, attendanceCreateSchema);

    const [employee, checkInDate, checkOutDate] = await Promise.all([
      db.employee.findUnique({ where: { id: payload.employeeId }, select: { id: true } }),
      Promise.resolve(parseUiDate(payload.checkIn)),
      Promise.resolve(payload.checkOut ? parseUiDate(payload.checkOut) : null),
    ]);

    if (!employee) {
      throw new HttpError(404, "employee_not_found", "Employee not found");
    }
    if (!checkInDate) {
      throw new HttpError(400, "invalid_checkin", "Invalid check-in time");
    }
    if (payload.checkOut && !checkOutDate) {
      throw new HttpError(400, "invalid_checkout", "Invalid check-out time");
    }

    const attendance = await db.attendance.create({
      data: {
        employeeId: payload.employeeId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        status: payload.status.trim(),
        notes: payload.notes?.trim() || null,
      },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
      },
    });

    return jsonOk({ attendance: mapAttendance(attendance) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
