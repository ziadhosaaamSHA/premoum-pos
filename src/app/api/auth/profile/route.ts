import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { profileUpdateSchema } from "@/server/validation/schemas";

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const payload = await readJson(request, profileUpdateSchema);

    if (payload.fullName === undefined && payload.phone === undefined && payload.avatarUrl === undefined) {
      throw new HttpError(400, "missing_fields", "No profile fields provided");
    }

    const updated = await db.user.update({
      where: { id: auth.user.id },
      data: {
        fullName: payload.fullName?.trim(),
        phone: payload.phone === undefined ? undefined : payload.phone,
        avatarUrl: payload.avatarUrl === undefined ? undefined : payload.avatarUrl,
      },
    });

    return jsonOk({
      user: {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        phone: updated.phone,
        avatarUrl: updated.avatarUrl,
        status: updated.status,
        isOwner: updated.isOwner,
        roles: auth.user.roles,
        permissions: auth.user.permissions,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
