-- CreateEnum
CREATE TYPE "TransactionPurpose" AS ENUM ('HOST_PAYOUT', 'CAUTION_FEE_PAYOUT');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "purpose" "TransactionPurpose";
