-- CreateEnum
CREATE TYPE "ReportedReviewStatus" AS ENUM ('CLOSED', 'PENDING');

-- CreateEnum
CREATE TYPE "ReviewVisibility" AS ENUM ('VISIBLE', 'REMOVED', 'HIDDEN_BY_HOST', 'FLAGGED');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "visibility" "ReviewVisibility" NOT NULL DEFAULT 'VISIBLE',
    "reportReason" TEXT,
    "reportedById" TEXT,
    "reportStatus" "ReportedReviewStatus",
    "moderatedAt" TIMESTAMP(3),
    "moderatedNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "Review_listingId_createdAt_idx" ON "Review"("listingId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Review_hostId_createdAt_idx" ON "Review"("hostId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Review_reportStatus_createdAt_idx" ON "Review"("reportStatus", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
