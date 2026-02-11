import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk, readJson } from "@/server/http";
import { systemResetSchema } from "@/server/validation/schemas";
import { resetSystemData } from "@/server/system/maintenance";

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["system:reset"] });
    const payload = await readJson(request, systemResetSchema);

    await resetSystemData(payload.scope);

    return jsonOk({
      reset: true,
      scope: payload.scope,
    });
  } catch (error) {
    return jsonError(error);
  }
}
