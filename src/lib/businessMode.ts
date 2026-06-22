export const BUSINESS_MODES = ["cafe_restaurant", "retail"] as const;

export type BusinessMode = (typeof BUSINESS_MODES)[number];

export const DEFAULT_BUSINESS_MODE: BusinessMode = "cafe_restaurant";

export function normalizeBusinessMode(value: unknown): BusinessMode {
  return value === "retail" ? "retail" : DEFAULT_BUSINESS_MODE;
}

export function isRetailMode(value: unknown) {
  return normalizeBusinessMode(value) === "retail";
}

