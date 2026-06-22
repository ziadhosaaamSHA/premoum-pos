import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk } from "@/server/http";
import { normalizeBusinessMode } from "@/lib/businessMode";
import { fetchSystemSettings, SYSTEM_SETTINGS_ID } from "@/server/system/setup";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { anyPermission: ["settings:view", "settings:manage"] });
    const settings = await fetchSystemSettings(db);
    return jsonOk({ businessMode: settings.businessMode });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["settings:manage"] });
    const payload = await request.json().catch(() => ({}));
    const businessMode = normalizeBusinessMode(payload?.businessMode);

    const settings = await db.systemSettings.upsert({
      where: { id: SYSTEM_SETTINGS_ID },
      update: { businessMode },
      create: { id: SYSTEM_SETTINGS_ID, businessMode },
    });

    return jsonOk({ businessMode: normalizeBusinessMode(settings.businessMode) });
  } catch (error) {
    return jsonError(error);
  }
}
