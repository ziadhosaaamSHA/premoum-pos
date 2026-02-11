import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk } from "@/server/http";
import { ensureEmployeeForUser, mapActiveShift } from "@/server/shifts/service";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const employee = await ensureEmployeeForUser(auth.user);

    let active = await db.shiftLog.findFirst({
      where: {
        employeeId: employee.id,
        endedAt: null,
      },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        employeeId: true,
        startedAt: true,
        pauses: true,
      },
    });

    if (!active) {
      active = await db.shiftLog.create({
        data: {
          employeeId: employee.id,
          startedAt: new Date(),
          durationMinutes: 0,
          pauses: [],
          createdById: auth.user.id,
        },
        select: {
          id: true,
          employeeId: true,
          startedAt: true,
          pauses: true,
        },
      });
    }

    return jsonOk({
      activeShift: mapActiveShift(active),
    });
  } catch (error) {
    return jsonError(error);
  }
}
