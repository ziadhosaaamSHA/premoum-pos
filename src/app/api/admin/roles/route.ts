import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { roleCreateSchema } from "@/server/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["roles:manage"] });

    const roles = await db.role.findMany({
      orderBy: [{ isSystem: "desc" }, { isActive: "desc" }, { name: "asc" }],
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: { id: true, code: true, label: true },
            },
          },
        },
        users: {
          select: { userId: true },
        },
      },
    });

    return jsonOk({
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        isActive: role.isActive,
        usersCount: role.users.length,
        permissions: role.rolePermissions.map((rp) => rp.permission),
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["roles:manage"] });
    const payload = await readJson(request, roleCreateSchema);

    const existing = await db.role.findUnique({
      where: { name: payload.name.trim() },
      select: { id: true },
    });
    if (existing) {
      throw new HttpError(409, "role_exists", "Role name already exists");
    }

    const permissions = payload.permissionCodes.length
      ? await db.permission.findMany({
          where: { code: { in: payload.permissionCodes } },
          select: { id: true, code: true },
        })
      : [];

    if (permissions.length !== payload.permissionCodes.length) {
      throw new HttpError(400, "invalid_permissions", "One or more permission codes are invalid");
    }

    const role = await db.role.create({
      data: {
        name: payload.name.trim(),
        description: payload.description.trim(),
        isSystem: false,
        isActive: true,
        rolePermissions: {
          createMany: {
            data: permissions.map((permission) => ({ permissionId: permission.id })),
            skipDuplicates: true,
          },
        },
      },
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: { id: true, code: true, label: true },
            },
          },
        },
      },
    });

    return jsonOk({
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        isActive: role.isActive,
        permissions: role.rolePermissions.map((rp) => rp.permission),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
