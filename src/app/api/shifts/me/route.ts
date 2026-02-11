import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk } from "@/server/http";
import {
  ensureEmployeeForUser,
  mapActiveShift,
} from "@/server/shifts/service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    const employee = await ensureEmployeeForUser(auth.user);

    const [activeLog, logs] = await Promise.all([
      db.shiftLog.findFirst({
        where: {
          employeeId: employee.id,
          endedAt: null,
        },
        orderBy: {
          startedAt: "desc",
        },
        select: {
          id: true,
          employeeId: true,
          startedAt: true,
          pauses: true,
        },
      }),
      db.shiftLog.findMany({
        where: {
          employeeId: employee.id,
        },
        orderBy: {
          startedAt: "desc",
        },
        take: 30,
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          durationMinutes: true,
          pauses: true,
        },
      }),
    ]);

    return jsonOk({
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.roleTitle,
        phone: employee.phone,
        status: employee.status,
      },
      activeShift: mapActiveShift(activeLog),
      logs: logs.map((item) => ({
        id: item.id,
        startedAt: item.startedAt.toISOString(),
        endedAt: item.endedAt ? item.endedAt.toISOString() : null,
        durationMinutes: item.durationMinutes,
        pauses: Array.isArray(item.pauses) ? item.pauses : [],
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
