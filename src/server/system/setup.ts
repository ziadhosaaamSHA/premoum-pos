import { PrismaClient, Prisma } from "@prisma/client";
import { DEFAULT_BUSINESS_MODE, normalizeBusinessMode } from "@/lib/businessMode";

export const SYSTEM_SETTINGS_ID = "system";

type Client = PrismaClient | Prisma.TransactionClient;

export async function fetchSystemSettings(client: Client) {
  const settings = await client.systemSettings.upsert({
    where: { id: SYSTEM_SETTINGS_ID },
    update: {},
    create: { id: SYSTEM_SETTINGS_ID, businessMode: DEFAULT_BUSINESS_MODE },
  });
  return {
    ...settings,
    businessMode: normalizeBusinessMode(settings.businessMode),
  };
}

export async function isSetupComplete(client: Client) {
  const settings = await fetchSystemSettings(client);
  return Boolean(settings.setupCompletedAt);
}
