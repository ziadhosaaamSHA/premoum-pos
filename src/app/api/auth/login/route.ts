import { UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { assertRateLimit } from "@/server/rate-limit";
import { getClientIp, HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { setSessionCookie } from "@/server/auth/cookies";
import { createSession, getSessionUser } from "@/server/auth/session";
import { verifyPassword } from "@/server/auth/password";
import { loginSchema } from "@/server/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    const payload = await readJson(request, loginSchema);
    const ipAddress = getClientIp(request);
    const email = payload.email.toLowerCase().trim();

    assertRateLimit(`auth:login:${ipAddress}:${email}`, { limit: 6, windowMs: 15 * 60 * 1000 });

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
        status: true,
      },
    });

    if (!user?.passwordHash) {
      throw new HttpError(401, "invalid_credentials", "Invalid email or password");
    }

    const isValid = await verifyPassword(user.passwordHash, payload.password);
    if (!isValid) {
      throw new HttpError(401, "invalid_credentials", "Invalid email or password");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new HttpError(403, "account_inactive", "Your account is not active");
    }

    const { token, expiresAt } = await createSession(user.id, {
      ipAddress,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const session = await getSessionUser(token);
    if (!session) {
      throw new HttpError(500, "session_error", "Unable to initialize session");
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

export async function GET() {
  return jsonOk({ status: "ready" });
}
