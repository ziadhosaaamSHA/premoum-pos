import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk } from "@/server/http";
import { fetchSystemSettings, SYSTEM_SETTINGS_ID } from "@/server/system/setup";

export async function GET(request: NextRequest) {
  try {
    const settings = await fetchSystemSettings(db);
    const ownerCount = await db.user.count({ where: { isOwner: true } });
    return jsonOk({
      setup: {
        completedAt: settings.setupCompletedAt ? settings.setupCompletedAt.toISOString() : null,
        isComplete: Boolean(settings.setupCompletedAt),
        hasOwner: ownerCount > 0,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["settings:manage"] });
    const settings = await db.systemSettings.upsert({
      where: { id: SYSTEM_SETTINGS_ID },
      update: { setupCompletedAt: new Date() },
      create: { id: SYSTEM_SETTINGS_ID, setupCompletedAt: new Date() },
    });
    return jsonOk({
      setup: {
        completedAt: settings.setupCompletedAt?.toISOString() || null,
        isComplete: Boolean(settings.setupCompletedAt),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
