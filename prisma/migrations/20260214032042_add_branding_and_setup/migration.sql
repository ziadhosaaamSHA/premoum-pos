-- AlterTable
ALTER TABLE "BrandingSettings" ADD COLUMN     "backgroundColor" TEXT NOT NULL DEFAULT '#f7f3ee',
ADD COLUMN     "borderColor" TEXT NOT NULL DEFAULT '#e6e1db',
ADD COLUMN     "cardColor" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN     "sidebarColor" TEXT NOT NULL DEFAULT '#1f2a2b',
ADD COLUMN     "sidebarTextColor" TEXT NOT NULL DEFAULT '#f6f3ef';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT;

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "setupCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);
