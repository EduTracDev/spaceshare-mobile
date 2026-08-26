/*
  Warnings:

  - The values [SUSPENDED_USER] on the enum `LogActivity` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LogActivity_new" AS ENUM ('INVITED_ADMIN', 'UPDATED_COMMISSION', 'ADMIN_SUSPENDED_USER', 'ADMIN_RESTORED_USER', 'ADMIN_LOGIN', 'ADMIN_LOGOUT', 'RESENT_ADMIN_INVITATION', 'REVOKED_ADMIN_INVITATION', 'SUPERADMIN_SUSPENDED_ADMIN', 'RESTORED_ADMIN_ACCESS', 'APPROVED_SPACE_LISTING', 'REJECTED_SPACE_LISTING', 'REMOVED_REVIEW', 'RESTORED_REVIEW', 'VERIFIED_PAYMENT', 'VERIFIED_DISPUTE_RESOLUTION');
ALTER TABLE "AuditLog" ALTER COLUMN "action" TYPE "LogActivity_new" USING ("action"::text::"LogActivity_new");
ALTER TYPE "LogActivity" RENAME TO "LogActivity_old";
ALTER TYPE "LogActivity_new" RENAME TO "LogActivity";
DROP TYPE "LogActivity_old";
COMMIT;
