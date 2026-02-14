"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";

export type Branding = {
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

const defaultBranding: Branding = {
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

type BrandingContextValue = {
  branding: Branding;
  loading: boolean;
  refresh: () => Promise<void>;
  setBranding: (next: Branding) => void;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

function normalizeBranding(value?: Partial<Branding> | null): Branding {
  if (!value) return { ...defaultBranding };
  return {
    brandName: value.brandName || defaultBranding.brandName,
    brandTagline: value.brandTagline ?? defaultBranding.brandTagline,
    logoUrl: value.logoUrl ?? defaultBranding.logoUrl,
    primaryColor: value.primaryColor || defaultBranding.primaryColor,
    secondaryColor: value.secondaryColor || defaultBranding.secondaryColor,
    backgroundColor: value.backgroundColor || defaultBranding.backgroundColor,
    cardColor: value.cardColor || defaultBranding.cardColor,
    borderColor: value.borderColor || defaultBranding.borderColor,
    topbarColor: value.topbarColor || defaultBranding.topbarColor,
    topbarTextColor: value.topbarTextColor || defaultBranding.topbarTextColor,
    tableHeaderColor: value.tableHeaderColor || defaultBranding.tableHeaderColor,
    tableHeaderTextColor: value.tableHeaderTextColor || defaultBranding.tableHeaderTextColor,
    backgroundOpacity:
      typeof value.backgroundOpacity === "number" && Number.isFinite(value.backgroundOpacity)
        ? value.backgroundOpacity
        : defaultBranding.backgroundOpacity,
    cardOpacity:
      typeof value.cardOpacity === "number" && Number.isFinite(value.cardOpacity)
        ? value.cardOpacity
        : defaultBranding.cardOpacity,
    topbarOpacity:
      typeof value.topbarOpacity === "number" && Number.isFinite(value.topbarOpacity)
        ? value.topbarOpacity
        : defaultBranding.topbarOpacity,
    tableHeaderOpacity:
      typeof value.tableHeaderOpacity === "number" && Number.isFinite(value.tableHeaderOpacity)
        ? value.tableHeaderOpacity
        : defaultBranding.tableHeaderOpacity,
    sidebarOpacity:
      typeof value.sidebarOpacity === "number" && Number.isFinite(value.sidebarOpacity)
        ? value.sidebarOpacity
        : defaultBranding.sidebarOpacity,
    sidebarColor: value.sidebarColor || defaultBranding.sidebarColor,
    sidebarTextColor: value.sidebarTextColor || defaultBranding.sidebarTextColor,
  };
}

function adjustColor(hex: string, amount: number) {
  let raw = hex.replace("#", "");
  if (raw.length === 3) {
    raw = raw
      .split("")
      .map((ch) => `${ch}${ch}`)
      .join("");
  }
  if (raw.length !== 6) return hex;
  const num = parseInt(raw, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function toRgba(hex: string, opacity: number) {
  let raw = hex.replace("#", "");
  if (raw.length === 3) {
    raw = raw
      .split("")
      .map((ch) => `${ch}${ch}`)
      .join("");
  }
  if (raw.length !== 6) return hex;
  const num = parseInt(raw, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const alpha = Math.min(1, Math.max(0, opacity));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyBrandingTheme(branding: Branding, theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isDark = theme === "dark";
  const backgroundOpacity = Math.min(1, Math.max(0, branding.backgroundOpacity / 100));
  const cardOpacity = Math.min(1, Math.max(0, branding.cardOpacity / 100));
  const topbarOpacity = Math.min(1, Math.max(0, branding.topbarOpacity / 100));
  const tableHeaderOpacity = Math.min(1, Math.max(0, branding.tableHeaderOpacity / 100));
  const sidebarOpacity = Math.min(1, Math.max(0, branding.sidebarOpacity / 100));
  root.style.setProperty("--color-accent", branding.primaryColor);
  root.style.setProperty("--color-accent-dark", adjustColor(branding.primaryColor, -24));
  root.style.setProperty("--color-accent-2", branding.secondaryColor);

  if (!isDark) {
    root.style.setProperty("--color-bg", toRgba(branding.backgroundColor, backgroundOpacity));
    root.style.setProperty(
      "--color-bg-accent-1",
      toRgba(adjustColor(branding.backgroundColor, 22), backgroundOpacity)
    );
    root.style.setProperty(
      "--color-bg-accent-2",
      toRgba(adjustColor(branding.backgroundColor, -20), backgroundOpacity)
    );
    root.style.setProperty("--color-card", toRgba(branding.cardColor, cardOpacity));
    root.style.setProperty("--color-border", branding.borderColor);
    root.style.setProperty("--color-topbar", toRgba(branding.topbarColor, topbarOpacity));
    root.style.setProperty("--color-topbar-ink", branding.topbarTextColor);
    root.style.setProperty("--color-table-head", toRgba(branding.tableHeaderColor, tableHeaderOpacity));
    root.style.setProperty("--color-table-head-ink", branding.tableHeaderTextColor);
    root.style.setProperty("--color-sidebar", toRgba(branding.sidebarColor, sidebarOpacity));
    root.style.setProperty("--color-sidebar-ink", branding.sidebarTextColor);
  } else {
    [
      "--color-bg",
      "--color-bg-accent-1",
      "--color-bg-accent-2",
      "--color-card",
      "--color-border",
      "--color-topbar",
      "--color-topbar-ink",
      "--color-table-head",
      "--color-table-head-ink",
      "--color-sidebar",
      "--color-sidebar-ink",
    ].forEach((property) => root.style.removeProperty(property));
  }
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding>(defaultBranding);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  const refresh = useCallback(async () => {
    try {
      const payload = await apiRequest<{ branding: Branding }>("/api/branding");
      setBranding(normalizeBranding(payload.branding));
    } catch {
      setBranding(defaultBranding);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    applyBrandingTheme(branding, theme);
  }, [branding, theme]);

  const value = useMemo(
    () => ({
      branding,
      loading,
      refresh,
      setBranding,
    }),
    [branding, loading, refresh]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within BrandingProvider");
  }
  return context;
}
