-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT,
ADD COLUMN "firstName" TEXT,
ADD COLUMN "isFirstLogin" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "phone" TEXT;