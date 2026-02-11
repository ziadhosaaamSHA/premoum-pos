import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { anyPermission: ["roles:manage", "users:manage"] });

    const permissions = await db.permission.findMany({
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        label: true,
        description: true,
      },
    });

    return jsonOk({ permissions });
  } catch (error) {
    return jsonError(error);
  }
}
