-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushToken" TEXT,
ADD COLUMN     "smsNotifications" BOOLEAN NOT NULL DEFAULT true;
