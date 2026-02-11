import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { roleUpdateSchema } from "@/server/validation/schemas";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ roleId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["roles:manage"] });
    const { roleId } = await context.params;
    const payload = await readJson(request, roleUpdateSchema);

    const role = await db.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: { select: { permissionId: true } },
      },
    });
    if (!role) {
      throw new HttpError(404, "role_not_found", "Role not found");
    }

    if (role.isSystem && payload.name && payload.name !== role.name) {
      throw new HttpError(400, "system_role_protected", "System role name cannot be changed");
    }

    let permissionIds: string[] | null = null;
    if (payload.permissionCodes) {
      const permissions = await db.permission.findMany({
        where: { code: { in: payload.permissionCodes } },
        select: { id: true },
      });
      if (permissions.length !== payload.permissionCodes.length) {
        throw new HttpError(400, "invalid_permissions", "One or more permission codes are invalid");
      }
      permissionIds = permissions.map((permission) => permission.id);
    }

    const updatedRole = await db.$transaction(async (tx) => {
      const updated = await tx.role.update({
        where: { id: roleId },
        data: {
          name: payload.name?.trim(),
          description: payload.description?.trim(),
        },
      });

      if (permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId } });
        if (permissionIds.length) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
            skipDuplicates: true,
          });
        }
      }

      return updated;
    });

    return jsonOk({ role: updatedRole });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ roleId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["roles:manage"] });
    const { roleId } = await context.params;

    const role = await db.role.findUnique({
      where: { id: roleId },
      include: { users: { select: { userId: true } } },
    });
    if (!role) {
      throw new HttpError(404, "role_not_found", "Role not found");
    }
    if (role.isSystem) {
      throw new HttpError(400, "system_role_protected", "System roles cannot be deleted");
    }

    if (role.isActive) {
      await db.role.update({
        where: { id: role.id },
        data: { isActive: false },
      });
      return jsonOk({ deleted: false, mode: "disabled" });
    }

    if (role.users.length > 0) {
      throw new HttpError(
        400,
        "role_in_use",
        "Disabled role is still assigned to users and cannot be permanently deleted"
      );
    }

    const inviteCount = await db.invite.count({
      where: { roleId: role.id },
    });
    if (inviteCount > 0) {
      throw new HttpError(
        400,
        "role_has_invites",
        "Disabled role still has invite records and cannot be permanently deleted"
      );
    }

    await db.role.delete({ where: { id: roleId } });
    return jsonOk({ deleted: true, mode: "hard_deleted" });
  } catch (error) {
    return jsonError(error);
  }
}
