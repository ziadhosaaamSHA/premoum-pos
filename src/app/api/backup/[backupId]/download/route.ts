import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError } from "@/server/http";
import { readBackupFile } from "@/server/backup/storage";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ backupId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["backup:view"] });
    const { backupId } = await context.params;

    const backup = await db.backupRecord.findUnique({
      where: { id: backupId },
      select: {
        id: true,
        reference: true,
        payload: true,
      },
    });

    if (!backup) {
      throw new HttpError(404, "backup_not_found", "Backup record not found");
    }

    let content: string;
    if (backup.payload) {
      content = JSON.stringify(backup.payload, null, 2);
    } else {
      content = await readBackupFile(backup.reference)
        .then((result) => result.content)
        .catch(() => {
          throw new HttpError(404, "backup_file_missing", "Backup file is missing");
        });
    }

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${backup.reference}.json"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
