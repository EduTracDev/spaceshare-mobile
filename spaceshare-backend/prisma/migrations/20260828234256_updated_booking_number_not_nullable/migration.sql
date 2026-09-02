/*
  Warnings:

  - Made the column `bookingNumber` on table `Booking` required. This step will fail if there are existing NULL values in that column.
  - Made the column `disputeNumber` on table `Dispute` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "bookingNumber" SET NOT NULL;

-- AlterTable
ALTER TABLE "Dispute" ALTER COLUMN "disputeNumber" SET NOT NULL;
