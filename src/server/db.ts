import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function cleanConnectionString(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));

  return quoted ? trimmed.slice(1, -1).trim() : trimmed;
}

const connectionString = cleanConnectionString(process.env.DATABASE_URL);

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

try {
  const parsed = new URL(connectionString);
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("invalid_protocol");
  }
} catch {
  throw new Error(
    "DATABASE_URL must start with postgresql:// or postgres://. Do not include the variable name, literal quotes, or an unescaped password in the value.",
  );
}

const adapter = new PrismaPg({ connectionString });

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
