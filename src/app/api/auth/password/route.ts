import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { hashPassword } from "@/server/auth/password";
import { jsonError, jsonOk, readJson } from "@/server/http";
import { passwordChangeSchema } from "@/server/validation/schemas";

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const payload = await readJson(request, passwordChangeSchema);

    const passwordHash = await hashPassword(payload.password);
    await db.user.update({
      where: { id: auth.user.id },
      data: { passwordHash },
    });

    return jsonOk({ updated: true });
  } catch (error) {
    return jsonError(error);
  }
}
