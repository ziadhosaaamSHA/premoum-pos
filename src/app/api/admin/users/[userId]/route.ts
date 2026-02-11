import { UserStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { userUpdateSchema } from "@/server/validation/schemas";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAuth(request, { allPermissions: ["users:manage"] });
    const { userId } = await context.params;
    const payload = await readJson(request, userUpdateSchema);

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpError(404, "user_not_found", "User not found");
    }

    if (user.isOwner && auth.user.id !== user.id) {
      throw new HttpError(403, "owner_protected", "Owner account can only be updated by itself.");
    }

    const roleIds =
      payload.roleIds === undefined ? undefined : Array.from(new Set(payload.roleIds.map((id) => id.trim())));

    if (roleIds && roleIds.length === 0) {
      throw new HttpError(400, "missing_roles", "At least one role is required");
    }

    if (roleIds) {
      const roles = await db.role.findMany({
        where: { id: { in: roleIds }, isActive: true },
        select: { id: true, name: true },
      });
      if (roles.length !== roleIds.length) {
        throw new HttpError(400, "invalid_roles", "One or more role IDs are invalid or disabled");
      }

      if (user.isOwner) {
        const ownerRole = await db.role.findUnique({
          where: { name: "Owner" },
          select: { id: true },
        });
        if (ownerRole && !roleIds.includes(ownerRole.id)) {
          throw new HttpError(400, "owner_role_required", "Owner account must keep owner role");
        }
      }
    }

    const updated = await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          fullName: payload.fullName?.trim(),
          phone: payload.phone === undefined ? undefined : payload.phone,
          status: payload.status ? (payload.status as UserStatus) : undefined,
        },
      });

      if (roleIds) {
        await tx.userRole.deleteMany({ where: { userId: user.id } });
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: user.id, roleId })),
          skipDuplicates: true,
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          userRoles: {
            include: {
              role: {
                select: { id: true, name: true, description: true, isActive: true },
              },
            },
          },
        },
      });
    });

    return jsonOk({
      user: {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        phone: updated.phone,
        status: updated.status,
        isOwner: updated.isOwner,
        roles: updated.userRoles.map((item) => item.role),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAuth(request, { allPermissions: ["users:manage"] });
    const { userId } = await context.params;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpError(404, "user_not_found", "User not found");
    }
    if (user.isOwner) {
      throw new HttpError(400, "owner_protected", "Owner account cannot be deleted.");
    }
    if (auth.user.id === user.id) {
      throw new HttpError(400, "self_delete_blocked", "You cannot delete your own account.");
    }

    await db.user.update({
      where: { id: user.id },
      data: { status: UserStatus.SUSPENDED },
    });

    if (user.status !== UserStatus.SUSPENDED) {
      return jsonOk({ deleted: false, mode: "disabled" });
    }

    await db.user.delete({
      where: { id: user.id },
    });

    return jsonOk({ deleted: true, mode: "hard_deleted" });
  } catch (error) {
    return jsonError(error);
  }
}
