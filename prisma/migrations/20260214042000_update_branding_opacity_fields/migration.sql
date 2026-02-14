-- Drop old unified opacity column and add per-surface opacity controls
ALTER TABLE "BrandingSettings"
  DROP COLUMN IF EXISTS "surfaceOpacity",
  ADD COLUMN "backgroundOpacity" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "cardOpacity" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "topbarOpacity" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "tableHeaderOpacity" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "sidebarOpacity" INTEGER NOT NULL DEFAULT 100;
