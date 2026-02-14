import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk, readJson } from "@/server/http";
import { brandingUpdateSchema } from "@/server/validation/schemas";
import { BRANDING_ID, fetchBranding, normalizeBranding } from "@/server/settings/branding";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { anyPermission: ["settings:view", "settings:manage"] });
    const branding = await fetchBranding(db);
    return jsonOk({ branding });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["settings:manage"] });
    const payload = await readJson(request, brandingUpdateSchema);

    const branding = await db.brandingSettings.upsert({
      where: { id: BRANDING_ID },
      update: {
        brandName: payload.brandName.trim(),
        brandTagline: payload.brandTagline?.trim() || null,
        logoUrl: payload.logoUrl?.trim() || null,
        primaryColor: payload.primaryColor,
        secondaryColor: payload.secondaryColor,
        backgroundColor: payload.backgroundColor,
        cardColor: payload.cardColor,
        borderColor: payload.borderColor,
        topbarColor: payload.topbarColor,
        topbarTextColor: payload.topbarTextColor,
        tableHeaderColor: payload.tableHeaderColor,
        tableHeaderTextColor: payload.tableHeaderTextColor,
        backgroundOpacity: payload.backgroundOpacity,
        cardOpacity: payload.cardOpacity,
        topbarOpacity: payload.topbarOpacity,
        tableHeaderOpacity: payload.tableHeaderOpacity,
        sidebarOpacity: payload.sidebarOpacity,
        sidebarColor: payload.sidebarColor,
        sidebarTextColor: payload.sidebarTextColor,
      },
      create: {
        id: BRANDING_ID,
        brandName: payload.brandName.trim(),
        brandTagline: payload.brandTagline?.trim() || null,
        logoUrl: payload.logoUrl?.trim() || null,
        primaryColor: payload.primaryColor,
        secondaryColor: payload.secondaryColor,
        backgroundColor: payload.backgroundColor,
        cardColor: payload.cardColor,
        borderColor: payload.borderColor,
        topbarColor: payload.topbarColor,
        topbarTextColor: payload.topbarTextColor,
        tableHeaderColor: payload.tableHeaderColor,
        tableHeaderTextColor: payload.tableHeaderTextColor,
        backgroundOpacity: payload.backgroundOpacity,
        cardOpacity: payload.cardOpacity,
        topbarOpacity: payload.topbarOpacity,
        tableHeaderOpacity: payload.tableHeaderOpacity,
        sidebarOpacity: payload.sidebarOpacity,
        sidebarColor: payload.sidebarColor,
        sidebarTextColor: payload.sidebarTextColor,
      },
    });

    return jsonOk({ branding: normalizeBranding(branding) });
  } catch (error) {
    return jsonError(error);
  }
}
