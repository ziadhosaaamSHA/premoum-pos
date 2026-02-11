import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { shiftTemplateUpdateSchema } from "@/server/validation/schemas";
import { mapShiftTemplate, normalizeTime, toShiftStatus } from "@/server/hr/mappers";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ shiftId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["hr:manage"] });
    const { shiftId } = await context.params;
    const payload = await readJson(request, shiftTemplateUpdateSchema);

    const existing = await db.shiftTemplate.findUnique({ where: { id: shiftId } });
    if (!existing) {
      throw new HttpError(404, "shift_not_found", "Shift template not found");
    }

    const startTime = payload.startTime ? normalizeTime(payload.startTime) : null;
    const endTime = payload.endTime ? normalizeTime(payload.endTime) : null;

    if (payload.startTime && !startTime) {
      throw new HttpError(400, "invalid_time", "Invalid shift start time");
    }
    if (payload.endTime && !endTime) {
      throw new HttpError(400, "invalid_time", "Invalid shift end time");
    }

    const shift = await db.shiftTemplate.update({
      where: { id: shiftId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
        ...(payload.startTime !== undefined ? { startTime: startTime as string } : {}),
        ...(payload.endTime !== undefined ? { endTime: endTime as string } : {}),
        ...(payload.staffCount !== undefined ? { staffCount: payload.staffCount ?? null } : {}),
        ...(payload.status !== undefined ? { status: toShiftStatus(payload.status) } : {}),
      },
    });

    return jsonOk({ shift: mapShiftTemplate(shift) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ shiftId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["hr:manage"] });
    const { shiftId } = await context.params;

    const existing = await db.shiftTemplate.findUnique({ where: { id: shiftId }, select: { id: true } });
    if (!existing) {
      throw new HttpError(404, "shift_not_found", "Shift template not found");
    }

    await db.shiftTemplate.delete({ where: { id: shiftId } });

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
