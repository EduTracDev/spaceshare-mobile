import prisma from '../utils/prisma';

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
  spacePrice: string;
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
  if (!data.spacePrice?.trim()) throw new Error('Space price is required');
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
      spacePrice: parseInt(data.spacePrice, 10),
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
export const getPublicListings = async () => {
  return prisma.listing.findMany({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
  });
};

export const getPublicListingById = async (id: string) => {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing || listing.status !== 'APPROVED') {
    throw new Error('Listing not found');
  }
  return listing;
};

export const updateListing = async (
  id: string,
  hostId: string,
  data: Partial<CreateListingInput>
) => {
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) throw new Error('Listing not found');
  if (existing.hostId !== hostId) throw new Error('You do not have permission to edit this listing');

  const updateData: any = {};

  if (data.spaceName !== undefined) updateData.spaceName = data.spaceName;
  if (data.spaceCategory !== undefined) updateData.spaceCategory = data.spaceCategory;
  if (data.addressLine !== undefined) updateData.addressLine = data.addressLine;
  if (data.area !== undefined) updateData.area = data.area;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.photos !== undefined) updateData.photos = data.photos;
  if (data.amenities !== undefined) updateData.amenities = data.amenities;
if (data.spaceCapacity !== undefined) updateData.spaceCapacity = parseInt(data.spaceCapacity, 10);
  if (data.spacePrice !== undefined) updateData.spacePrice = parseInt(data.spacePrice, 10);
  if (data.addOns !== undefined) updateData.addOns = data.addOns;
  if (data.hostRules !== undefined) updateData.hostRules = data.hostRules;
  if (data.parkingInstruction !== undefined) updateData.parkingInstruction = data.parkingInstruction;
  if (data.startTime !== undefined) updateData.startTime = data.startTime;
  if (data.endTime !== undefined) updateData.endTime = data.endTime;
  if (data.unavailableDates !== undefined) updateData.unavailableDates = data.unavailableDates;

  const updated = await prisma.listing.update({
    where: { id },
    data: updateData,
  });

  return updated;
};

export const deleteListing = async (id: string, hostId: string) => {
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) throw new Error('Listing not found');
  if (existing.hostId !== hostId) throw new Error('You do not have permission to delete this listing');

  await prisma.listing.delete({ where: { id } });
  return { message: 'Listing deleted' };
};