/*
  Warnings:

  - A unique constraint covering the columns `[bookingNumber]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[disputeNumber]` on the table `Dispute` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'LISTING_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_REQUIRES_ATTENTION';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_USER_REGISTERED';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_REPORTED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYOUT_READY';
ALTER TYPE "NotificationType" ADD VALUE 'ADMIN_ACTIVITY';
ALTER TYPE "NotificationType" ADD VALUE 'TRANSACTION_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'DISPUTE_RAISED';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "bookingNumber" TEXT;

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "disputeNumber" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "referenceId" TEXT;

-- CreateTable
CREATE TABLE "NumberSequence" (
    "key" TEXT NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "Booking"("bookingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_disputeNumber_key" ON "Dispute"("disputeNumber");
