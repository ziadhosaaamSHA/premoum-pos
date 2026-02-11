import { BackupStatus } from "@prisma/client";

const backupStatusToUi: Record<BackupStatus, "completed" | "failed" | "running"> = {
  [BackupStatus.COMPLETED]: "completed",
  [BackupStatus.FAILED]: "failed",
  [BackupStatus.RUNNING]: "running",
};

type BackupRecordRow = {
  id: string;
  reference: string;
  status: BackupStatus;
  sizeBytes: number;
  storagePath: string | null;
  note: string | null;
  createdAt: Date;
  restoredAt: Date | null;
  createdBy: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

export function mapBackupRecord(row: BackupRecordRow) {
  return {
    id: row.id,
    reference: row.reference,
    fileName: `${row.reference}.json`,
    status: backupStatusToUi[row.status],
    sizeBytes: row.sizeBytes,
    note: row.note,
    storagePath: row.storagePath,
    createdAt: row.createdAt.toISOString(),
    restoredAt: row.restoredAt ? row.restoredAt.toISOString() : null,
    createdBy: row.createdBy
      ? {
          id: row.createdBy.id,
          fullName: row.createdBy.fullName,
          email: row.createdBy.email,
        }
      : null,
  };
}
