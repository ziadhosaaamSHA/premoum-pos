import { NextRequest, NextResponse } from "next/server";
import { assertRateLimit } from "@/server/rate-limit";
import { getClientIp, HttpError, jsonError, readJson } from "@/server/http";
import { acceptInvite } from "@/server/auth/invites";
import { createSession, getSessionUser } from "@/server/auth/session";
import { setSessionCookie } from "@/server/auth/cookies";
import { acceptInviteSchema } from "@/server/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    const payload = await readJson(request, acceptInviteSchema);
    const ipAddress = getClientIp(request);
    assertRateLimit(`auth:accept-invite:${ipAddress}`, { limit: 8, windowMs: 15 * 60 * 1000 });

    const user = await acceptInvite({
      token: payload.token,
      fullName: payload.fullName,
      password: payload.password,
    });

    const { token, expiresAt } = await createSession(user.id, {
      ipAddress,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    const session = await getSessionUser(token);
    if (!session) {
      throw new HttpError(500, "session_error", "Failed to create user session");
    }

    const response = NextResponse.json({
      ok: true,
      data: {
        user: session.user,
        expiresAt,
      },
    });
    setSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
