import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["users:manage"] });
    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();
    const status = request.nextUrl.searchParams.get("status")?.trim();

    const users = await db.user.findMany({
      where: {
        ...(status ? { status: status as "INVITED" | "ACTIVE" | "SUSPENDED" } : {}),
      },
      orderBy: { createdAt: "desc" },
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

    const filtered = users.filter((user) => {
      if (!search) return true;
      return (
        user.email.toLowerCase().includes(search) ||
        user.fullName.toLowerCase().includes(search) ||
        user.userRoles.some((userRole) => userRole.role.name.toLowerCase().includes(search))
      );
    });

    return jsonOk({
      users: filtered.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        status: user.status,
        isOwner: user.isOwner,
        createdAt: user.createdAt,
        inviteAcceptedAt: user.inviteAcceptedAt,
        lastLoginAt: user.lastLoginAt,
        roles: user.userRoles.map((userRole) => userRole.role),
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
