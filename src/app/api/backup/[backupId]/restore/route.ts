import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk } from "@/server/http";
import {
  parseSystemSnapshot,
  restoreSystemSnapshot,
  summarizeSnapshot,
} from "@/server/system/maintenance";
import { readBackupFile } from "@/server/backup/storage";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ backupId: string }> }
) {
  try {
    await requireAuth(request, { allPermissions: ["backup:manage"] });
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

    let snapshot: unknown;
    if (backup.payload) {
      snapshot = backup.payload;
    } else {
      const { content } = await readBackupFile(backup.reference).catch(() => {
        throw new HttpError(404, "backup_file_missing", "Backup file is missing");
      });
      snapshot = JSON.parse(content);
    }

    const parsed = parseSystemSnapshot(snapshot);
    if (!parsed) {
      throw new HttpError(400, "invalid_snapshot", "Backup file format is invalid");
    }

    await restoreSystemSnapshot(parsed);

    await db.backupRecord.update({
      where: { id: backupId },
      data: {
        restoredAt: new Date(),
      },
    });

    return jsonOk({
      restored: true,
      summary: summarizeSnapshot(parsed),
    });
  } catch (error) {
    return jsonError(error);
  }
}
