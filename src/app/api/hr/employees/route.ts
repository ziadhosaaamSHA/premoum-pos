import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk, readJson } from "@/server/http";
import { employeeCreateSchema } from "@/server/validation/schemas";
import { mapEmployee, toEmployeeStatus } from "@/server/hr/mappers";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["hr:view"] });

    const employees = await db.employee.findMany({
      orderBy: { createdAt: "desc" },
    });

    return jsonOk({ employees: employees.map((row) => mapEmployee(row)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["hr:manage"] });
    const payload = await readJson(request, employeeCreateSchema);

    const employee = await db.employee.create({
      data: {
        name: payload.name.trim(),
        roleTitle: payload.role.trim(),
        phone: payload.phone?.trim() || null,
        status: toEmployeeStatus(payload.status),
      },
    });

    return jsonOk({ employee: mapEmployee(employee) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
