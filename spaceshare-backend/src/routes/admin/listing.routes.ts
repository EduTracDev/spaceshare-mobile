import { Router } from "express";
import {
  approve,
  getListing,
  getListings,
  reject,
  reactivate,
  suspend,
} from "../../controllers/admin/listing.controller";

const adminListingRoutes = Router();

// --- Read-only endpoints (still protected by parent router's requireAdmin) ---
adminListingRoutes.get("/", getListings);
adminListingRoutes.get("/:id", getListing);

// --- Status transition endpoints (PENDING → APPROVED / REJECTED → APPROVED / SUSPENDED etc.) ---
adminListingRoutes.post("/:id/approve", approve);
adminListingRoutes.post("/:id/reject", reject);
adminListingRoutes.post("/:id/suspend", suspend);
adminListingRoutes.post("/:id/reactivate", reactivate);

export default adminListingRoutes;