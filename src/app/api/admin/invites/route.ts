import { InviteStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { createInvite } from "@/server/auth/invites";
import { getRequestOrigin, jsonError, jsonOk, readJson } from "@/server/http";
import { inviteCreateSchema } from "@/server/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { anyPermission: ["users:invite", "users:manage"] });

    const invites = await db.invite.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        role: { select: { id: true, name: true, isActive: true } },
        user: { select: { id: true, email: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    return jsonOk({
      invites: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        status: invite.status,
        role: invite.role,
        user: invite.user,
        createdBy: invite.createdBy,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        acceptedAt: invite.acceptedAt,
        isExpired:
          invite.status === InviteStatus.PENDING && invite.expiresAt.getTime() < Date.now(),
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, { allPermissions: ["users:invite"] });
    const payload = await readJson(request, inviteCreateSchema);

    const { invite, token } = await createInvite({
      email: payload.email,
      roleId: payload.roleId,
      createdById: auth.user.id,
    });

    const appUrl = getRequestOrigin(request);
    const inviteLink = `${appUrl}/accept-invite?token=${encodeURIComponent(token)}`;

    return jsonOk({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
      },
      inviteLink,
      token, // Useful for testing in non-email environments
    });
  } catch (error) {
    return jsonError(error);
  }
}
