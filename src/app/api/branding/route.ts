import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { fetchBranding } from "@/server/settings/branding";

export async function GET(_request: NextRequest) {
  try {
    const branding = await fetchBranding(db);
    return jsonOk({ branding });
  } catch (error) {
    return jsonError(error);
  }
}
