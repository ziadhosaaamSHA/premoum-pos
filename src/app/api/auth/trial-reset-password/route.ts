import { UserStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { assertStrongPassword, hashPassword } from "@/server/auth/password";
import { getClientIp, HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { assertRateLimit } from "@/server/rate-limit";
import { trialResetPasswordSchema } from "@/server/validation/schemas";

function isTrialResetEnabled() {
  return process.env.TRIAL_PASSWORD_RESET_ENABLED !== "false";
}

export async function POST(request: NextRequest) {
  try {
    if (!isTrialResetEnabled()) {
      throw new HttpError(403, "trial_reset_disabled", "Trial password reset is disabled");
    }

    const payload = await readJson(request, trialResetPasswordSchema);
    assertStrongPassword(payload.password);

    const ipAddress = getClientIp(request);
    const email = payload.email.toLowerCase().trim();
    assertRateLimit(`auth:trial-reset:${ipAddress}:${email}`, { limit: 4, windowMs: 15 * 60 * 1000 });

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, status: true, inviteAcceptedAt: true },
    });

    // Do not reveal whether the email exists.
    if (!user) {
      return jsonOk({ ok: true, trial: true });
    }

    const passwordHash = await hashPassword(payload.password);

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        ...(user.status === UserStatus.INVITED
          ? {
              status: UserStatus.ACTIVE,
              inviteAcceptedAt: user.inviteAcceptedAt || new Date(),
            }
          : {}),
      },
    });

    await db.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return jsonOk({ ok: true, trial: true });
  } catch (error) {
    return jsonError(error);
  }
}
