import { UserStatus } from "@prisma/client";
import { db } from "@/server/db";
import { SESSION_TTL_HOURS } from "@/server/auth/constants";
import { createOpaqueToken, hashToken } from "@/server/auth/token";

const sessionInclude = {
  user: {
    include: {
      userRoles: {
        where: {
          role: {
            is: {
              isActive: true,
            },
          },
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: UserStatus;
  isOwner: boolean;
  roles: string[];
  permissions: string[];
};

function mapUser(user: {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: UserStatus;
  isOwner: boolean;
  userRoles: Array<{
    role: {
      name: string;
      rolePermissions: Array<{ permission: { code: string } }>;
    };
  }>;
}): AuthUser {
  const roles = user.userRoles.map((userRole) => userRole.role.name);
  const permissions = Array.from(
    new Set(user.userRoles.flatMap((userRole) => userRole.role.rolePermissions.map((rp) => rp.permission.code)))
  );
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    status: user.status,
    isOwner: user.isOwner,
    roles,
    permissions,
  };
}

export async function createSession(
  userId: string,
  context?: { ipAddress?: string; userAgent?: string }
) {
  const token = createOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  await db.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    },
  });

  return { token, expiresAt };
}

export async function getSessionUser(token: string) {
  const tokenHash = hashToken(token);
  const session = await db.session.findUnique({
    where: { tokenHash },
    include: sessionInclude,
  });
  if (!session) return null;

  if (session.revokedAt || session.expiresAt <= new Date()) {
    return null;
  }

  if (session.user.status !== UserStatus.ACTIVE) {
    return null;
  }

  return {
    sessionId: session.id,
    user: mapUser(session.user),
    expiresAt: session.expiresAt,
  };
}

export async function revokeSession(token: string) {
  const tokenHash = hashToken(token);
  await db.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
