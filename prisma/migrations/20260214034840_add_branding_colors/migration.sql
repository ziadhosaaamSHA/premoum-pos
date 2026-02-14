-- AlterTable
ALTER TABLE "BrandingSettings" ADD COLUMN     "tableHeaderColor" TEXT NOT NULL DEFAULT '#fbfaf8',
ADD COLUMN     "tableHeaderTextColor" TEXT NOT NULL DEFAULT '#6b6b6b',
ADD COLUMN     "topbarColor" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN     "topbarTextColor" TEXT NOT NULL DEFAULT '#1b1b1b';
