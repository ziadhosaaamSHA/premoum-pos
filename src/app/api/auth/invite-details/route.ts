import { InviteStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { hashToken } from "@/server/auth/token";
import { HttpError, jsonError, jsonOk } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      throw new HttpError(400, "missing_token", "Invite token is required");
    }
    const invite = await db.invite.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        role: { select: { id: true, name: true, isActive: true } },
      },
    });
    if (!invite) {
      throw new HttpError(404, "invite_not_found", "Invite not found");
    }

    const expired = invite.expiresAt.getTime() <= Date.now();
    const usable = invite.status === InviteStatus.PENDING && !expired && invite.role.isActive;

    return jsonOk({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        expiresAt: invite.expiresAt,
        usable,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
