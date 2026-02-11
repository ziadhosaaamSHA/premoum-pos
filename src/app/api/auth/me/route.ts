import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    return jsonOk({
      user: auth.user,
      session: {
        id: auth.sessionId,
        expiresAt: auth.expiresAt,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
