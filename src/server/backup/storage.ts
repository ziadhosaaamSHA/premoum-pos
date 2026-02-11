import path from "path";
import { promises as fs } from "fs";
import { HttpError } from "@/server/http";

const BACKUP_DIR = process.env.BACKUP_STORAGE_DIR || path.join(process.cwd(), "storage", "backups");

function assertReference(reference: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(reference)) {
    throw new HttpError(400, "invalid_backup_reference", "Invalid backup reference");
  }
}

export async function ensureBackupDir() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  return BACKUP_DIR;
}

export function buildBackupFilePath(reference: string) {
  assertReference(reference);
  return path.join(BACKUP_DIR, `${reference}.json`);
}

export async function writeBackupFile(reference: string, content: string) {
  await ensureBackupDir();
  const filePath = buildBackupFilePath(reference);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

export async function readBackupFile(reference: string) {
  const filePath = buildBackupFilePath(reference);
  const content = await fs.readFile(filePath, "utf8");
  return { filePath, content };
}

export async function deleteBackupFile(reference: string) {
  const filePath = buildBackupFilePath(reference);
  await fs.unlink(filePath).catch(() => undefined);
}
