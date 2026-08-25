/*
  Warnings:

  - You are about to drop the column `actor` on the `AuditLog` table. All the data in the column will be lost.
  - Added the required column `actorId` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `action` on the `AuditLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "LogActivity" AS ENUM ('INVITED_ADMIN', 'UPDATED_COMMISSION', 'SUSPENDED_USER');

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "actor",
ADD COLUMN     "actorId" TEXT NOT NULL,
ADD COLUMN     "targetUserId" TEXT,
DROP COLUMN "action",
ADD COLUMN     "action" "LogActivity" NOT NULL;

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
