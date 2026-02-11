import { InviteStatus, UserStatus } from "@prisma/client";
import { db } from "@/server/db";
import { INVITE_TTL_HOURS } from "@/server/auth/constants";
import { createOpaqueToken, hashToken } from "@/server/auth/token";
import { assertStrongPassword, hashPassword } from "@/server/auth/password";
import { HttpError } from "@/server/http";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildFallbackNameFromEmail(email: string) {
  const local = email.split("@")[0] || "user";
  return local.replace(/[._-]/g, " ").trim() || "New User";
}

export async function createInvite(input: {
  email: string;
  roleId: string;
  createdById: string;
}) {
  const email = normalizeEmail(input.email);
  const role = await db.role.findUnique({ where: { id: input.roleId } });
  if (!role) {
    throw new HttpError(404, "role_not_found", "Role not found");
  }
  if (!role.isActive) {
    throw new HttpError(400, "role_disabled", "Role is disabled and cannot be used for new invites");
  }

  const existingActiveUser = await db.user.findUnique({
    where: { email },
    select: { id: true, status: true, passwordHash: true },
  });

  if (
    existingActiveUser &&
    existingActiveUser.status === UserStatus.ACTIVE &&
    existingActiveUser.passwordHash
  ) {
    throw new HttpError(409, "user_exists", "A registered active user already exists with this email.");
  }

  const user = existingActiveUser
    ? await db.user.update({
        where: { id: existingActiveUser.id },
        data: { status: UserStatus.INVITED },
      })
    : await db.user.create({
        data: {
          email,
          fullName: buildFallbackNameFromEmail(email),
          status: UserStatus.INVITED,
          createdById: input.createdById,
        },
      });

  const token = createOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

  const invite = await db.invite.create({
    data: {
      email,
      tokenHash,
      roleId: role.id,
      userId: user.id,
      createdById: input.createdById,
      expiresAt,
    },
    include: {
      role: { select: { id: true, name: true } },
      user: { select: { id: true, email: true } },
    },
  });

  return { invite, token };
}

export async function acceptInvite(input: {
  token: string;
  fullName: string;
  password: string;
}) {
  const tokenHash = hashToken(input.token);
  const invite = await db.invite.findUnique({
    where: { tokenHash },
    include: { user: true, role: true },
  });

  if (!invite) {
    throw new HttpError(404, "invite_not_found", "Invite not found");
  }
  if (!invite.role.isActive) {
    throw new HttpError(400, "role_disabled", "The role assigned to this invite is disabled.");
  }

  if (invite.status === InviteStatus.REVOKED) {
    throw new HttpError(400, "invite_revoked", "Invite has been revoked.");
  }
  if (invite.status === InviteStatus.ACCEPTED) {
    throw new HttpError(400, "invite_used", "Invite has already been used.");
  }

  if (invite.expiresAt <= new Date()) {
    await db.invite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.EXPIRED },
    });
    throw new HttpError(400, "invite_expired", "Invite has expired.");
  }

  assertStrongPassword(input.password);
  const passwordHash = await hashPassword(input.password);

  const user = invite.user
    ? invite.user
    : await db.user.create({
        data: {
          email: invite.email,
          fullName: input.fullName.trim(),
          status: UserStatus.INVITED,
          createdById: invite.createdById,
        },
      });

  const acceptedAt = new Date();

  const updatedUser = await db.$transaction(async (tx) => {
    const nextUser = await tx.user.update({
      where: { id: user.id },
      data: {
        email: invite.email,
        fullName: input.fullName.trim(),
        passwordHash,
        status: UserStatus.ACTIVE,
        inviteAcceptedAt: acceptedAt,
      },
    });

    await tx.userRole.upsert({
      where: { userId_roleId: { userId: nextUser.id, roleId: invite.roleId } },
      update: {},
      create: { userId: nextUser.id, roleId: invite.roleId },
    });

    await tx.invite.update({
      where: { id: invite.id },
      data: {
        status: InviteStatus.ACCEPTED,
        acceptedAt,
      },
    });

    return nextUser;
  });

  return updatedUser;
}
