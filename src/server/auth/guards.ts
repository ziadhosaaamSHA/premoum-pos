import { NextRequest } from "next/server";
import { HttpError } from "@/server/http";
import { getSessionToken } from "@/server/auth/cookies";
import { AuthUser, getSessionUser } from "@/server/auth/session";

export type AuthContext = {
  user: AuthUser;
  sessionId: string;
  expiresAt: Date;
};

type RequireAuthOptions = {
  allPermissions?: string[];
  anyPermission?: string[];
};

export async function requireAuth(
  request: NextRequest,
  options?: RequireAuthOptions
): Promise<AuthContext> {
  const token = getSessionToken(request);
  if (!token) {
    throw new HttpError(401, "unauthorized", "Authentication required");
  }

  const session = await getSessionUser(token);
  if (!session) {
    throw new HttpError(401, "invalid_session", "Session is invalid or expired");
  }

  const ctx: AuthContext = {
    user: session.user,
    sessionId: session.sessionId,
    expiresAt: session.expiresAt,
  };

  if (ctx.user.isOwner) return ctx;

  if (options?.allPermissions?.length) {
    const missing = options.allPermissions.filter((permission) => !ctx.user.permissions.includes(permission));
    if (missing.length > 0) {
      throw new HttpError(403, "forbidden", "Missing required permissions");
    }
  }

  if (options?.anyPermission?.length) {
    const hasAny = options.anyPermission.some((permission) => ctx.user.permissions.includes(permission));
    if (!hasAny) {
      throw new HttpError(403, "forbidden", "Missing required permissions");
    }
  }

  return ctx;
}
