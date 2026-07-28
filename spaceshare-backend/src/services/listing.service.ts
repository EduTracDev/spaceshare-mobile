import prisma from '../utils/prisma';

type PricingTier = { minGuests: string; maxGuests: string; price: string };
type AddOnItem = { name: string; unitPrice: string; available: string };

type CreateListingInput = {
  spaceName: string;
  spaceCategory: string;
  addressLine: string;
  area: string;
  description: string;
  photos: string[];
  amenities: string[];
  spaceCapacity: string;
  pricingModel: 'FIXED' | 'ATTENDEE_TIER';
  spacePrice: string;
  attendeeTiers: PricingTier[];
  addOns: AddOnItem[];
  hostRules: string;
  parkingInstruction: string;
  startTime: string;
  endTime: string;
  unavailableDates: string[];
};

export const createListing = async (hostId: string, data: CreateListingInput) => {
  if (!data.spaceName?.trim()) throw new Error('Space name is required');
  if (!data.photos || data.photos.length === 0) throw new Error('At least one photo is required');
  if (!data.spaceCapacity?.trim()) throw new Error('Space capacity is required');
  if (data.pricingModel === 'FIXED' && !data.spacePrice?.trim()) {
    throw new Error('Space price is required for fixed pricing');
  }
  if (data.pricingModel === 'ATTENDEE_TIER' && (!data.attendeeTiers || data.attendeeTiers.length === 0)) {
    throw new Error('At least one pricing tier is required');
  }
  if (!data.hostRules?.trim()) throw new Error('Host rules are required');

  const listing = await prisma.listing.create({
    data: {
      hostId,
      spaceName: data.spaceName,
      spaceCategory: data.spaceCategory,
      addressLine: data.addressLine,
      area: data.area,
      description: data.description,
      photos: data.photos,
      amenities: data.amenities,
      spaceCapacity: parseInt(data.spaceCapacity, 10),
      pricingModel: data.pricingModel,
      spacePrice: data.spacePrice ? parseInt(data.spacePrice, 10) : null,
      attendeeTiers: data.pricingModel === 'ATTENDEE_TIER' ? data.attendeeTiers : undefined,
      addOns: data.addOns && data.addOns.length > 0 ? data.addOns : undefined,
      hostRules: data.hostRules,
      parkingInstruction: data.parkingInstruction || null,
      startTime: data.startTime,
      endTime: data.endTime,
      unavailableDates: data.unavailableDates,
    },
  });

  return listing;
};

export const getMyListings = async (hostId: string) => {
  return prisma.listing.findMany({
    where: { hostId },
    orderBy: { createdAt: 'desc' },
  });
};

export const getListingById = async (id: string) => {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) throw new Error('Listing not found');
  return listing;
};