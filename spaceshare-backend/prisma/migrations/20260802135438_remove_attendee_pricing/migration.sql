/*
  Warnings:

  - You are about to drop the column `attendeeTiers` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `pricingModel` on the `Listing` table. All the data in the column will be lost.
  - Made the column `spacePrice` on table `Listing` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "attendeeTiers",
DROP COLUMN "pricingModel",
ALTER COLUMN "spacePrice" SET NOT NULL;

-- DropEnum
DROP TYPE "PricingModel";
