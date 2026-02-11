import { EmployeeStatus } from "@prisma/client";
import { db } from "@/server/db";
import { HttpError } from "@/server/http";
import { AuthUser } from "@/server/auth/session";

export type ShiftPause = {
  start: string;
  end?: string;
};

export type ActiveShiftPayload = {
  status: "idle" | "running" | "paused";
  employeeId: string | null;
  startedAt: string | null;
  pauseStartedAt: string | null;
  pauses: ShiftPause[];
};

function parsePauses(value: unknown): ShiftPause[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { start: string; end?: string } => {
      return Boolean(item && typeof item === "object" && typeof (item as { start?: unknown }).start === "string");
    })
    .map((item) => ({
      start: item.start,
      ...(item.end ? { end: item.end } : {}),
    }));
}

function currentPauseStartedAt(pauses: ShiftPause[]) {
  const lastPause = pauses[pauses.length - 1];
  if (!lastPause || lastPause.end) return null;
  return lastPause.start;
}

export function mapActiveShift(log: { employeeId: string; startedAt: Date; pauses: unknown } | null): ActiveShiftPayload {
  if (!log) {
    return {
      status: "idle",
      employeeId: null,
      startedAt: null,
      pauseStartedAt: null,
      pauses: [],
    };
  }

  const pauses = parsePauses(log.pauses);
  const pauseStartedAt = currentPauseStartedAt(pauses);

  return {
    status: pauseStartedAt ? "paused" : "running",
    employeeId: log.employeeId,
    startedAt: log.startedAt.toISOString(),
    pauseStartedAt,
    pauses,
  };
}

export function calculateDurationMinutes(startedAt: Date, endedAt: Date, pauses: ShiftPause[]) {
  const totalMs = endedAt.getTime() - startedAt.getTime();
  const pausedMs = pauses.reduce((sum, pause) => {
    if (!pause.end) return sum;
    const start = new Date(pause.start).getTime();
    const end = new Date(pause.end).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return sum;
    return sum + (end - start);
  }, 0);
  return Math.max(0, Math.round((totalMs - pausedMs) / 60000));
}

export async function findEmployeeForUser(user: AuthUser) {
  return db.employee.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      userId: true,
      name: true,
      roleTitle: true,
      phone: true,
      status: true,
    },
  });
}

export async function ensureEmployeeForUser(user: AuthUser) {
  const existing = await findEmployeeForUser(user);
  if (existing) return existing;

  const created = await db.employee.create({
    data: {
      userId: user.id,
      name: user.fullName,
      roleTitle: user.roles[0] || "موظف",
      phone: user.phone,
      status: EmployeeStatus.ACTIVE,
    },
    select: {
      id: true,
      userId: true,
      name: true,
      roleTitle: true,
      phone: true,
      status: true,
    },
  });

  return created;
}

export async function getActiveShiftLog(employeeId: string) {
  return db.shiftLog.findFirst({
    where: {
      employeeId,
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
  });
}

export function getOpenPauseIndex(pauses: ShiftPause[]) {
  for (let index = pauses.length - 1; index >= 0; index -= 1) {
    if (!pauses[index].end) return index;
  }
  return -1;
}

export function assertShiftActive(log: { id: string; employeeId: string; startedAt: Date; pauses: unknown } | null) {
  if (!log) {
    throw new HttpError(400, "shift_not_active", "No active shift found");
  }
}
