import { PrismaClient, Prisma } from "@prisma/client";

export const SYSTEM_SETTINGS_ID = "system";

type Client = PrismaClient | Prisma.TransactionClient;

export async function fetchSystemSettings(client: Client) {
  return client.systemSettings.upsert({
    where: { id: SYSTEM_SETTINGS_ID },
    update: {},
    create: { id: SYSTEM_SETTINGS_ID },
  });
}

export async function isSetupComplete(client: Client) {
  const settings = await fetchSystemSettings(client);
  return Boolean(settings.setupCompletedAt);
}
