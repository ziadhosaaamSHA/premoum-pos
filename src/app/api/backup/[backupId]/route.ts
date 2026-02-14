import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk } from "@/server/http";
import { mapBackupRecord } from "@/server/backup/mappers";
import { deleteBackupFile, readBackupFile } from "@/server/backup/storage";
import { parseSystemSnapshot, summarizeSnapshot } from "@/server/system/maintenance";

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
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!backup) {
      throw new HttpError(404, "backup_not_found", "Backup record not found");
    }

    let summary: ReturnType<typeof summarizeSnapshot> | null = null;

    try {
      if (backup.payload) {
        const parsed = parseSystemSnapshot(backup.payload);
        summary = parsed ? summarizeSnapshot(parsed) : null;
      } else {
        const { content } = await readBackupFile(backup.reference);
        const parsed = parseSystemSnapshot(JSON.parse(content));
        summary = parsed ? summarizeSnapshot(parsed) : null;
      }
    } catch {
      summary = null;
    }

    return jsonOk({
      backup: mapBackupRecord(backup),
      summary,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
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
      },
    });

    if (!backup) {
      throw new HttpError(404, "backup_not_found", "Backup record not found");
    }

    await db.backupRecord.delete({ where: { id: backupId } });
    await deleteBackupFile(backup.reference);

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
