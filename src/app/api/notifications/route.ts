import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk } from "@/server/http";
import { buildNotificationsForUser } from "@/server/notifications/service";

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth(request);
    const notifications = await buildNotificationsForUser(user);
    return jsonOk({ notifications });
  } catch (error) {
    return jsonError(error);
  }
}
