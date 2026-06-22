import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk } from "@/server/http";
import { fetchSystemSettings, SYSTEM_SETTINGS_ID } from "@/server/system/setup";
import { normalizeBusinessMode } from "@/lib/businessMode";

export async function GET() {
  try {
    const settings = await fetchSystemSettings(db);
    const ownerCount = await db.user.count({ where: { isOwner: true } });
    return jsonOk({
      setup: {
        completedAt: settings.setupCompletedAt ? settings.setupCompletedAt.toISOString() : null,
        isComplete: Boolean(settings.setupCompletedAt),
        hasOwner: ownerCount > 0,
        businessMode: settings.businessMode,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["settings:manage"] });
    const payload = await request.json().catch(() => ({}));
    const businessMode = normalizeBusinessMode(payload?.businessMode);
    const settings = await db.systemSettings.upsert({
      where: { id: SYSTEM_SETTINGS_ID },
      update: { setupCompletedAt: new Date(), businessMode },
      create: { id: SYSTEM_SETTINGS_ID, setupCompletedAt: new Date(), businessMode },
    });
    return jsonOk({
      setup: {
        completedAt: settings.setupCompletedAt?.toISOString() || null,
        isComplete: Boolean(settings.setupCompletedAt),
        businessMode: normalizeBusinessMode(settings.businessMode),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
