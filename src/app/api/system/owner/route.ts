import { NextRequest, NextResponse } from "next/server";
import { UserStatus } from "@prisma/client";
import { db } from "@/server/db";
import { assertRateLimit } from "@/server/rate-limit";
import { getClientIp, HttpError, jsonError, readJson } from "@/server/http";
import { ownerSignupSchema } from "@/server/validation/schemas";
import { assertStrongPassword, hashPassword } from "@/server/auth/password";
import { createSession, getSessionUser } from "@/server/auth/session";
import { setSessionCookie } from "@/server/auth/cookies";
import { ensureDefaultRoles } from "@/server/system/roles";

export async function POST(request: NextRequest) {
  try {
    const payload = await readJson(request, ownerSignupSchema);
    const ipAddress = getClientIp(request);
    assertRateLimit(`system:owner-signup:${ipAddress}`, { limit: 4, windowMs: 15 * 60 * 1000 });

    const existingUsers = await db.user.count();
    if (existingUsers > 0) {
      throw new HttpError(409, "owner_exists", "Owner account already exists.");
    }

    const email = payload.email.trim().toLowerCase();
    const fullName = payload.fullName.trim();

    assertStrongPassword(payload.password);
    const passwordHash = await hashPassword(payload.password);

    const ownerId = await db.$transaction(async (tx) => {
      const roles = await ensureDefaultRoles(tx);
      const ownerRole = roles.Owner;
      if (!ownerRole) {
        throw new HttpError(500, "role_missing", "Owner role is not available.");
      }

      const owner = await tx.user.create({
        data: {
          email,
          fullName,
          passwordHash,
          status: UserStatus.ACTIVE,
          isOwner: true,
          inviteAcceptedAt: new Date(),
        },
      });

      await tx.userRole.create({
        data: { userId: owner.id, roleId: ownerRole.id },
      });

      return owner.id;
    });

    const { token, expiresAt } = await createSession(ownerId, {
      ipAddress,
      userAgent: request.headers.get("user-agent") || undefined,
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
