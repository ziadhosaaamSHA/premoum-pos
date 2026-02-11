import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { leaveCreateSchema } from "@/server/validation/schemas";
import { mapLeave, parseUiDate, toLeaveStatus } from "@/server/hr/mappers";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["hr:view"] });

    const leaves = await db.leave.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
      },
    });

    return jsonOk({ leaves: leaves.map((row) => mapLeave(row)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["hr:manage"] });
    const payload = await readJson(request, leaveCreateSchema);

    const [employee, fromDate, toDate] = await Promise.all([
      db.employee.findUnique({ where: { id: payload.employeeId }, select: { id: true } }),
      Promise.resolve(parseUiDate(payload.from)),
      Promise.resolve(parseUiDate(payload.to)),
    ]);

    if (!employee) {
      throw new HttpError(404, "employee_not_found", "Employee not found");
    }

    if (!fromDate || !toDate) {
      throw new HttpError(400, "invalid_date", "Invalid leave date");
    }

    if (fromDate > toDate) {
      throw new HttpError(400, "invalid_range", "Leave start date must be before end date");
    }

    const leave = await db.leave.create({
      data: {
        employeeId: payload.employeeId,
        fromDate,
        toDate,
        status: toLeaveStatus(payload.status),
        reason: payload.reason?.trim() || null,
      },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
      },
    });

    return jsonOk({ leave: mapLeave(leave) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
