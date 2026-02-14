import { PrismaClient, Prisma } from "@prisma/client";

export const BRANDING_ID = "branding";

export type BrandingSettings = {
  id: string;
  brandName: string;
  brandTagline: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardColor: string;
  borderColor: string;
  topbarColor: string;
  topbarTextColor: string;
  tableHeaderColor: string;
  tableHeaderTextColor: string;
  backgroundOpacity: number;
  cardOpacity: number;
  topbarOpacity: number;
  tableHeaderOpacity: number;
  sidebarOpacity: number;
  sidebarColor: string;
  sidebarTextColor: string;
};

export const DEFAULT_BRANDING: BrandingSettings = {
  id: BRANDING_ID,
  brandName: "Premium POS",
  brandTagline: "مطعم ومقهى",
  logoUrl: null,
  primaryColor: "#e06d4c",
  secondaryColor: "#2f8f83",
  backgroundColor: "#f7f3ee",
  cardColor: "#ffffff",
  borderColor: "#e6e1db",
  topbarColor: "#ffffff",
  topbarTextColor: "#1b1b1b",
  tableHeaderColor: "#fbfaf8",
  tableHeaderTextColor: "#6b6b6b",
  backgroundOpacity: 100,
  cardOpacity: 100,
  topbarOpacity: 0,
  tableHeaderOpacity: 100,
  sidebarOpacity: 100,
  sidebarColor: "#1f2a2b",
  sidebarTextColor: "#f6f3ef",
};

export function normalizeBranding(row: Partial<BrandingSettings> | null | undefined): BrandingSettings {
  if (!row) return { ...DEFAULT_BRANDING };
  return {
    id: row.id || BRANDING_ID,
    brandName: row.brandName || DEFAULT_BRANDING.brandName,
    brandTagline: row.brandTagline ?? DEFAULT_BRANDING.brandTagline,
    logoUrl: row.logoUrl ?? DEFAULT_BRANDING.logoUrl,
    primaryColor: row.primaryColor || DEFAULT_BRANDING.primaryColor,
    secondaryColor: row.secondaryColor || DEFAULT_BRANDING.secondaryColor,
    backgroundColor: row.backgroundColor || DEFAULT_BRANDING.backgroundColor,
    cardColor: row.cardColor || DEFAULT_BRANDING.cardColor,
    borderColor: row.borderColor || DEFAULT_BRANDING.borderColor,
    topbarColor: row.topbarColor || DEFAULT_BRANDING.topbarColor,
    topbarTextColor: row.topbarTextColor || DEFAULT_BRANDING.topbarTextColor,
    tableHeaderColor: row.tableHeaderColor || DEFAULT_BRANDING.tableHeaderColor,
    tableHeaderTextColor: row.tableHeaderTextColor || DEFAULT_BRANDING.tableHeaderTextColor,
    backgroundOpacity:
      typeof row.backgroundOpacity === "number" && Number.isFinite(row.backgroundOpacity)
        ? row.backgroundOpacity
        : DEFAULT_BRANDING.backgroundOpacity,
    cardOpacity:
      typeof row.cardOpacity === "number" && Number.isFinite(row.cardOpacity)
        ? row.cardOpacity
        : DEFAULT_BRANDING.cardOpacity,
    topbarOpacity:
      typeof row.topbarOpacity === "number" && Number.isFinite(row.topbarOpacity)
        ? row.topbarOpacity
        : DEFAULT_BRANDING.topbarOpacity,
    tableHeaderOpacity:
      typeof row.tableHeaderOpacity === "number" && Number.isFinite(row.tableHeaderOpacity)
        ? row.tableHeaderOpacity
        : DEFAULT_BRANDING.tableHeaderOpacity,
    sidebarOpacity:
      typeof row.sidebarOpacity === "number" && Number.isFinite(row.sidebarOpacity)
        ? row.sidebarOpacity
        : DEFAULT_BRANDING.sidebarOpacity,
    sidebarColor: row.sidebarColor || DEFAULT_BRANDING.sidebarColor,
    sidebarTextColor: row.sidebarTextColor || DEFAULT_BRANDING.sidebarTextColor,
  };
}

export async function fetchBranding(client: PrismaClient | Prisma.TransactionClient) {
  const row = await client.brandingSettings.findUnique({
    where: { id: BRANDING_ID },
  });
  return normalizeBranding(row || null);
}
