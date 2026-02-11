import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk } from "@/server/http";
import {
  ensureEmployeeForUser,
  getOpenPauseIndex,
  mapActiveShift,
  ShiftPause,
} from "@/server/shifts/service";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const employee = await ensureEmployeeForUser(auth.user);

    const active = await db.shiftLog.findFirst({
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
      throw new HttpError(400, "shift_not_active", "No active shift found");
    }

    const pauses = (Array.isArray(active.pauses) ? active.pauses : []) as ShiftPause[];
    const openPauseIndex = getOpenPauseIndex(pauses);
    if (openPauseIndex < 0) {
      throw new HttpError(400, "shift_not_paused", "Shift is not paused");
    }

    const now = new Date().toISOString();
    const updatedPauses = pauses.map((pause, index) => {
      if (index !== openPauseIndex) return pause;
      return {
        ...pause,
        end: now,
      };
    });

    const updated = await db.shiftLog.update({
      where: { id: active.id },
      data: {
        pauses: updatedPauses,
      },
      select: {
        id: true,
        employeeId: true,
        startedAt: true,
        pauses: true,
      },
    });

    return jsonOk({
      activeShift: mapActiveShift(updated),
    });
  } catch (error) {
    return jsonError(error);
  }
}
