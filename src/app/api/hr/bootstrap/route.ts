import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk } from "@/server/http";
import {
  mapAttendance,
  mapEmployee,
  mapLeave,
  mapPayroll,
  mapShiftTemplate,
} from "@/server/hr/mappers";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["hr:view"] });

    const [employees, attendance, shifts, payroll, leaves, linkedUserEmployees] = await Promise.all([
      db.employee.findMany({
        orderBy: { createdAt: "desc" },
      }),
      db.attendance.findMany({
        orderBy: { checkIn: "desc" },
        include: {
          employee: {
            select: {
              name: true,
            },
          },
        },
      }),
      db.shiftTemplate.findMany({
        orderBy: { createdAt: "desc" },
      }),
      db.payroll.findMany({
        orderBy: { date: "desc" },
        include: {
          employee: {
            select: {
              name: true,
            },
          },
        },
      }),
      db.leave.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: {
              name: true,
            },
          },
        },
      }),
      db.employee.findMany({
        where: { userId: { not: null } },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              status: true,
              userRoles: {
                include: {
                  role: {
                    select: { name: true, isActive: true },
                  },
                },
              },
            },
          },
          shiftLogs: {
            orderBy: { startedAt: "desc" },
            select: {
              id: true,
              startedAt: true,
              endedAt: true,
              durationMinutes: true,
            },
          },
        },
      }),
    ]);

    return jsonOk({
      employees: employees.map((row) => mapEmployee(row)),
      attendance: attendance.map((row) => mapAttendance(row)),
      shifts: shifts.map((row) => mapShiftTemplate(row)),
      payroll: payroll.map((row) => mapPayroll(row)),
      leaves: leaves.map((row) => mapLeave(row)),
      userEmployees: linkedUserEmployees.map((row) => {
        const totalShiftMinutes = row.shiftLogs.reduce((sum, shift) => sum + shift.durationMinutes, 0);
        const lastShift = row.shiftLogs[0] || null;
        return {
          employeeId: row.id,
          userId: row.userId,
          employeeName: row.name,
          role: row.roleTitle,
          userName: row.user?.fullName || "—",
          email: row.user?.email || "—",
          userStatus: row.user?.status || "SUSPENDED",
          roles:
            row.user?.userRoles
              .filter((userRole) => userRole.role.isActive)
              .map((userRole) => userRole.role.name) || [],
          shiftsCount: row.shiftLogs.length,
          totalShiftMinutes,
          lastShiftStart: lastShift?.startedAt.toISOString() || null,
          lastShiftEnd: lastShift?.endedAt?.toISOString() || null,
          lastShiftMinutes: lastShift?.durationMinutes || 0,
        };
      }),
    });
  } catch (error) {
    return jsonError(error);
  }
}
