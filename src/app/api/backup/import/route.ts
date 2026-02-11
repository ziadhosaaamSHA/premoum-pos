import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { backupImportSchema } from "@/server/validation/schemas";
import {
  parseSystemSnapshot,
  restoreSystemSnapshot,
  summarizeSnapshot,
} from "@/server/system/maintenance";
import { deleteBackupFile, writeBackupFile } from "@/server/backup/storage";
import { mapBackupRecord } from "@/server/backup/mappers";
import { generateCode } from "@/server/pos/mappers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, { allPermissions: ["backup:manage"] });
    const payload = await readJson(request, backupImportSchema);

    const snapshot = parseSystemSnapshot(payload.snapshot);
    if (!snapshot) {
      throw new HttpError(400, "invalid_snapshot", "Snapshot payload is invalid");
    }

    await restoreSystemSnapshot(snapshot);

    const content = JSON.stringify(snapshot, null, 2);
    const sizeBytes = Buffer.byteLength(content, "utf8");
    let reference = generateCode("IMP").replace(/[^A-Za-z0-9_-]/g, "-");
    reference = reference.slice(0, 40);

    const storagePath = await writeBackupFile(reference, content);

    try {
      const record = await db.backupRecord.create({
        data: {
          reference,
          status: "COMPLETED",
          sizeBytes,
          storagePath,
          note: payload.note?.trim() || "استعادة من ملف محلي",
          restoredAt: new Date(),
          createdById: auth.user.id,
        },
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

      return jsonOk({
        backup: mapBackupRecord(record),
        summary: summarizeSnapshot(snapshot),
      });
    } catch (error) {
      await deleteBackupFile(reference);
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}
