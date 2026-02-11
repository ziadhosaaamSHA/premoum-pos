import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk } from "@/server/http";
import {
  calculateDurationMinutes,
  ensureEmployeeForUser,
  getOpenPauseIndex,
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

    const now = new Date();
    const nowIso = now.toISOString();
    const pauses = (Array.isArray(active.pauses) ? active.pauses : []) as ShiftPause[];

    const openPauseIndex = getOpenPauseIndex(pauses);
    const normalizedPauses = pauses.map((pause, index) => {
      if (index !== openPauseIndex) return pause;
      return {
        ...pause,
        end: nowIso,
      };
    });

    const durationMinutes = calculateDurationMinutes(active.startedAt, now, normalizedPauses);

    const updated = await db.shiftLog.update({
      where: { id: active.id },
      data: {
        endedAt: now,
        durationMinutes,
        pauses: normalizedPauses,
      },
      select: {
        id: true,
        employeeId: true,
        startedAt: true,
        endedAt: true,
        durationMinutes: true,
        pauses: true,
      },
    });

    return jsonOk({
      activeShift: {
        status: "idle",
        employeeId: null,
        startedAt: null,
        pauseStartedAt: null,
        pauses: [],
      },
      shiftLog: {
        id: updated.id,
        employeeId: updated.employeeId,
        startedAt: updated.startedAt.toISOString(),
        endedAt: updated.endedAt ? updated.endedAt.toISOString() : null,
        durationMinutes: updated.durationMinutes,
        pauses: Array.isArray(updated.pauses) ? updated.pauses : [],
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
