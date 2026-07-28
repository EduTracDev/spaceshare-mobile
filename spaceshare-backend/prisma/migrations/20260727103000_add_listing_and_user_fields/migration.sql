CREATE TYPE "PricingModel" AS ENUM ('FIXED', 'ATTENDEE_TIER');

CREATE TYPE "ListingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "spaceName" TEXT NOT NULL,
    "spaceCategory" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photos" TEXT[],
    "amenities" TEXT[],
    "spaceCapacity" INTEGER NOT NULL,
    "pricingModel" "PricingModel" NOT NULL,
    "spacePrice" INTEGER,
    "attendeeTiers" JSONB,
    "addOns" JSONB,
    "hostRules" TEXT NOT NULL,
    "parkingInstruction" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "unavailableDates" TEXT[],
    "status" "ListingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Listing" ADD CONSTRAINT "Listing_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;