import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { createListing, getMyListings, getListingById } from '../services/listing.service';

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
    const listing = await getListingById(id);
    return res.status(200).json({ listing });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};