import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { shiftTemplateCreateSchema } from "@/server/validation/schemas";
import { mapShiftTemplate, normalizeTime, toShiftStatus } from "@/server/hr/mappers";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["hr:view"] });

    const shifts = await db.shiftTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });

    return jsonOk({ shifts: shifts.map((row) => mapShiftTemplate(row)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["hr:manage"] });
    const payload = await readJson(request, shiftTemplateCreateSchema);

    const startTime = normalizeTime(payload.startTime);
    const endTime = normalizeTime(payload.endTime);

    if (!startTime || !endTime) {
      throw new HttpError(400, "invalid_time", "Invalid shift time format");
    }

    const shift = await db.shiftTemplate.create({
      data: {
        name: payload.name.trim(),
        startTime,
        endTime,
        staffCount: payload.staffCount ?? null,
        status: toShiftStatus(payload.status),
      },
    });

    return jsonOk({ shift: mapShiftTemplate(shift) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
