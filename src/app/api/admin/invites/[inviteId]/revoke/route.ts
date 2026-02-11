import { InviteStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { revokeInviteSchema } from "@/server/validation/schemas";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ inviteId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["users:invite"] });
    const { inviteId } = await context.params;
    const payload = await readJson(request, revokeInviteSchema);

    const invite = await db.invite.findUnique({ where: { id: inviteId } });
    if (!invite) {
      throw new HttpError(404, "invite_not_found", "Invite not found");
    }

    if (invite.status === InviteStatus.PENDING) {
      const revoked = await db.invite.update({
        where: { id: invite.id },
        data: {
          status: InviteStatus.REVOKED,
          revokedAt: new Date(),
          metadata: payload.reason ? { reason: payload.reason } : undefined,
        },
      });

      return jsonOk({
        invite: {
          id: revoked.id,
          status: revoked.status,
          revokedAt: revoked.revokedAt,
        },
        mode: "disabled",
      });
    }

    if (invite.status === InviteStatus.REVOKED || invite.status === InviteStatus.EXPIRED) {
      await db.invite.delete({
        where: { id: invite.id },
      });
      return jsonOk({
        deleted: true,
        mode: "hard_deleted",
      });
    }

    throw new HttpError(400, "invite_not_deletable", "Accepted invites cannot be deleted from this action");
  } catch (error) {
    return jsonError(error);
  }
}
