import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getSessionToken } from "@/server/auth/cookies";
import { revokeSession } from "@/server/auth/session";
import { jsonError } from "@/server/http";

export async function POST(request: NextRequest) {
  try {
    const token = getSessionToken(request);
    if (token) {
      await revokeSession(token);
    }

    const response = NextResponse.json({ ok: true, data: { loggedOut: true } });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
