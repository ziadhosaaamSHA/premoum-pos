import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/guards";
import { clearSessionCookie } from "@/server/auth/cookies";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { systemFactoryResetSchema } from "@/server/validation/schemas";
import { factoryResetSystemData } from "@/server/system/maintenance";
import { FACTORY_RESET_PHRASE } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["system:reset"] });
    const payload = await readJson(request, systemFactoryResetSchema);

    if (payload.confirmText.trim() !== FACTORY_RESET_PHRASE) {
      throw new HttpError(400, "confirm_mismatch", "Confirmation phrase does not match.");
    }

    await factoryResetSystemData();

    const response = jsonOk({ reset: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
