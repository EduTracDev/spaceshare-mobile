import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { createListing, getMyListings, getListingById, updateListing, deleteListing } from '../services/listing.service';

export const create = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    if (req.userRole !== 'HOST') return res.status(403).json({ message: 'Only hosts can create listings' });

    const listing = await createListing(req.userId, req.body);
    return res.status(201).json({ message: 'Listing submitted for approval', listing });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const getMine = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const listings = await getMyListings(req.userId);
    return res.status(200).json({ listings });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const getOne = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const listing = await getListingById(id as string);
    return res.status(200).json({ listing });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};

export const update = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    const listing = await updateListing(id as string, req.userId, req.body);
    return res.status(200).json({ message: 'Listing updated successfully', listing });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const remove = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    const result = await deleteListing(id as string, req.userId);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};