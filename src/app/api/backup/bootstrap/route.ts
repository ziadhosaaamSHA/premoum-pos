import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk } from "@/server/http";
import { mapBackupRecord } from "@/server/backup/mappers";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["backup:view"] });

    const records = await db.backupRecord.findMany({
      orderBy: { createdAt: "desc" },
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
      backups: records.map((row) => mapBackupRecord(row)),
    });
  } catch (error) {
    return jsonError(error);
  }
}
