import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { HttpError, jsonError, jsonOk, readJson } from "@/server/http";
import { backupCreateSchema } from "@/server/validation/schemas";
import { buildSystemSnapshot } from "@/server/system/maintenance";
import { writeBackupFile, deleteBackupFile } from "@/server/backup/storage";
import { mapBackupRecord } from "@/server/backup/mappers";
import { generateCode } from "@/server/pos/mappers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, { allPermissions: ["backup:manage"] });
    const payload = await readJson(request, backupCreateSchema);

    const snapshot = await buildSystemSnapshot();
    const content = JSON.stringify(snapshot, null, 2);
    const sizeBytes = Buffer.byteLength(content, "utf8");

    let reference = generateCode("BKP").replace(/[^A-Za-z0-9_-]/g, "-");
    reference = reference.slice(0, 40);
    if (!reference) {
      throw new HttpError(500, "backup_reference_failed", "Could not generate backup reference");
    }

    const storagePath = await writeBackupFile(reference, content);

    try {
      const record = await db.backupRecord.create({
        data: {
          reference,
          status: "COMPLETED",
          sizeBytes,
          storagePath,
          note: payload.note?.trim() || "نسخة احتياطية يدوية",
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

      return jsonOk({ backup: mapBackupRecord(record) }, { status: 201 });
    } catch (error) {
      await deleteBackupFile(reference);
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}
