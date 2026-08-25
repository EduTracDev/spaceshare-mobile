// c:\Users\user\Projects\Curr Proj\SPACE_SHARE-ADM\spaceshare-mobile\spaceshare-backend\src\services\admin\listing.service.ts
import prisma from "../../utils/prisma";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
} from "../../errors";
import { type ListingStatus as PrismaListingStatus, type Prisma, LogActivity } from "@prisma/client";
import { createAuditLog } from "./audit-log.service";

/** ------------------------------------------------------------
 * Mappings: Prisma enum (UPPERCASE) ↔ Frontend string (lowercase)
 * ---------------------------------------------------------- */
const STATUS_FROM_PRISMA: Record<PrismaListingStatus, "pending" | "approved" | "rejected" | "suspended"> = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
};

const STATUS_TO_PRISMA: Record<string, PrismaListingStatus> = {
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
  suspended: "SUSPENDED",
};

/** Format date to "DD/MM/YYYY hh:mm A" (Nigeria / UTC+1) to match users page style */
function formatDateSubmitted(date: Date): string {
  const d = new Date(date.getTime() + 60 * 60 * 1000);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  let h24 = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const ampm = h24 >= 12 ? "PM" : "AM";
  h24 = h24 % 12;
  if (h24 === 0) h24 = 12;
  const hh = String(h24).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${m} ${ampm}`;
}

/** Currency formatter — ₦ Nigerian Naira, no decimals */
function naira(n: number | bigint | null | undefined): string {
  if (n === null || n === undefined) return "₦0";
  const num = typeof n === "bigint" ? Number(n) : n;
  return (
    "₦" +
    num
      .toFixed(0)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  );
}

/** ------------------------------------------------------------
 * Shape a raw Prisma listing + host row + host aggregate count
 * into the frontend Listing DTO shape. Tolerates missing DB fields
 * by fabricating sensible fallbacks (e.g. slug = id).
 * ---------------------------------------------------------- */
type RawListingRow = {
  id: string;
  spaceName: string;
  spaceCategory: string;
  addressLine: string;
  area: string;
  description: string;
  photos: string[];
  amenities: string[];
  spaceCapacity: number;
  spacePrice: number;
  addOns?: any;
  hostRules: string;
  parkingInstruction?: string | null;
  startTime: string;
  endTime: string;
  unavailableDates: string[];
  status: PrismaListingStatus;
  rejectionReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  host: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    avatarUrl: string | null;
    _count?: { listings?: number };
  };
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: Date;
    author: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  }>;
};

const fullName = (u: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string => {
  const n = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return n.length > 0 ? n : u.email;
};

function shapeListing(row: RawListingRow) {
  const { host } = row;
  const hostFullName = fullName(host);

  const status = STATUS_FROM_PRISMA[row.status];

  // Normalize addOns to array from stored Json
  const storedAddOns: any[] = Array.isArray(row.addOns) ? row.addOns : [];
  const addOns = storedAddOns.map((a, i) => ({
    id: String(a?.id ?? `${row.id}-ao-${i}`),
    name: String(a?.name ?? "Add-on"),
    quantityLabel: String(a?.quantityLabel ?? a?.available ?? "1"),
    price: Number(a?.price ?? a?.unitPrice ?? 0),
  }));

  return {
    id: row.id,
    slug: row.id, // Slug not stored in DB; reuse id
    spaceName: row.spaceName,
    host: {
      id: host.id,
      fullName: hostFullName,
      avatarUrl: host.avatarUrl ?? undefined,
      totalListings: host?._count?.listings ?? 0,
    },
    location: [row.addressLine, row.area].filter(Boolean).join(" | "),
    price: row.spacePrice,
    priceDisplay: naira(row.spacePrice),
    submittedAt: formatDateSubmitted(row.createdAt),
    status,
    category: (row.spaceCategory || "hall") as
      | "rooftop"
      | "garden"
      | "studio"
      | "open_space"
      | "lounge"
      | "hall",
    capacity: row.spaceCapacity,
    description: row.description,
    coverImageUrl: row.photos?.[0] ?? "",
    gallery: row.photos ?? [],
    amenities: row.amenities ?? [],
    houseRules: row.hostRules
      ? row.hostRules.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      : [],
    parkingInstructions: row.parkingInstruction
      ? row.parkingInstruction.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      : [],
    addOns,
    reviews: (row.reviews || []).map((r) => {
      const reviewerName = r.author
        ? fullName(r.author as any)
        : "Anonymous";
      return {
        id: r.id,
        reviewerName,
        rating: typeof r.rating === "number" ? r.rating : 0,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      };
    }),
    rejectionReason: row.rejectionReason ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** ------------------------------------------------------------
 * Public service methods (called by listing.controller.ts)
 * ---------------------------------------------------------- */
export interface GetListingsFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "all" | "pending" | "approved" | "rejected" | "suspended";
  sortBy?: "spaceName" | "location" | "price" | "submittedAt" | "status";
  sortOrder?: "asc" | "desc";
}

export async function getAllListings(filters: GetListingsFilters) {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 10));
  const skip = (page - 1) * pageSize;

  // --- WHERE clause -------------------------------------------------
  const where: Prisma.ListingWhereInput = {};

  if (filters.status && filters.status !== "all") {
    const mapped = STATUS_TO_PRISMA[filters.status];
    if (!mapped) throw new BadRequestError("Invalid listing status filter");
    where.status = mapped;
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { spaceName: { contains: q, mode: "insensitive" as const } },
      { addressLine: { contains: q, mode: "insensitive" as const } },
      { area: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
      {
        host: {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        },
      },
    ];
  }

  // --- ORDER BY clause ---------------------------------------------
  const SORTABLE: Record<string, Prisma.ListingOrderByWithRelationInput> = {
    spaceName: { spaceName: "asc" },
    price: { spacePrice: "asc" },
    status: { status: "asc" },
    submittedAt: { createdAt: "asc" },
    location: { addressLine: "asc" },
  };
  const baseOrder: Prisma.ListingOrderByWithRelationInput = SORTABLE[filters.sortBy ?? ""] ?? {
    createdAt: "desc",
  };
  // Flip direction if sortOrder === 'desc' on the primary field key
  const orderBy: Prisma.ListingOrderByWithRelationInput[] = [];
  Object.entries(baseOrder).forEach(([key, val]) => {
    if (typeof val === "string") {
      orderBy.push({
        [key]: filters.sortOrder === "asc" ? "asc" : "desc",
      } as Prisma.ListingOrderByWithRelationInput);
    } else {
      orderBy.push(baseOrder);
    }
  });
  if (orderBy.length === 0) orderBy.push({ createdAt: "desc" });

  // --- DB query (paginated) ----------------------------------------
  const [itemsRaw, total] = await prisma.$transaction([
    prisma.listing.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        host: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            _count: { select: { listings: true } },
          },
        },
        reviews: {
          where: { visibility: "VISIBLE" },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            author: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    }),
    prisma.listing.count({ where }),
  ]);

  const items = itemsRaw.map((r) => shapeListing(r as any));
  return { items, total, page, pageSize };
}

export async function getListingById(id: string) {
  if (!id) throw new BadRequestError("Listing id is required");
  const row = await prisma.listing.findUnique({
    where: { id },
    include: {
      host: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          _count: { select: { listings: true } },
        },
      },
      reviews: {
        where: { visibility: "VISIBLE" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          author: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });
  if (!row) throw new NotFoundError("Listing not found");
  return shapeListing(row as any);
}

/** Helper: validate admin action caller (id + role + not suspended) */
async function validateActor(actorId: string) {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, role: true, status: true },
  });
  if (!actor) throw new UnauthenticatedError("Invalid action request");
  if (
    (actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") ||
    actor.status === "SUSPENDED"
  ) {
    throw new ForbiddenError("You are not authorised for this action");
  }
  return actor;
}

/** ------------------------------------------------------------
 * State transitions
 *   PENDING  --approve--> APPROVED
 *   PENDING  --reject-->  REJECTED   (optional rejection reason)
 *   APPROVED --suspend--> SUSPENDED
 *   SUSPENDED --reactivate--> APPROVED
 * ---------------------------------------------------------- */
export async function approveListing(id: string, actorId: string) {
  await validateActor(actorId);
  if (!id) throw new BadRequestError("Listing id is required");

  const existing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, spaceName: true, status: true },
  });
  if (!existing) throw new NotFoundError("Listing not found");
  if (existing.status !== "PENDING") {
    throw new BadRequestError(
      `Only pending listings can be approved. Current status: ${existing.status.toLowerCase()}`
    );
  }

  const row = await prisma.listing.update({
    where: { id },
    data: {
      status: "APPROVED",
      rejectionReason: null, // Clear any prior rejection on re-approval
    },
    include: {
      host: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          _count: { select: { listings: true } },
        },
      },
    },
  });

  // audit log
  await createAuditLog({
    action: LogActivity.APPROVED_SPACE_LISTING,
    actorId,
    description: `Approved space listing ${existing.spaceName}`,
  })

  return {
    message: "Listing approved successfully",
    listing: shapeListing(row as any),
  };
}

export async function rejectListing(
  id: string,
  actorId: string,
  opts?: { reason?: string }
) {
  await validateActor(actorId);
  if (!id) throw new BadRequestError("Listing id is required");

  const existing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, spaceName: true, status: true },
  });
  if (!existing) throw new NotFoundError("Listing not found");
  if (existing.status !== "PENDING") {
    throw new BadRequestError(
      `Only pending listings can be rejected. Current status: ${existing.status.toLowerCase()}`
    );
  }

  const row = await prisma.listing.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectionReason: opts?.reason?.trim() || null,
    },
    include: {
      host: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          _count: { select: { listings: true } },
        },
      },
    },
  });
  // audit log
  await createAuditLog({
    action: LogActivity.REJECTED_SPACE_LISTING,
    actorId,
    description: `Rejected space listing ${existing.spaceName}`,
  })

  return {
    message: "Listing rejected successfully",
    listing: shapeListing(row as any),
  };
}

export async function suspendListing(id: string, actorId: string) {
  await validateActor(actorId);
  if (!id) throw new BadRequestError("Listing id is required");

  const existing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, spaceName: true, status: true },
  });
  if (!existing) throw new NotFoundError("Listing not found");
  if (existing.status !== "APPROVED") {
    throw new BadRequestError(
      `Only approved listings can be suspended. Current status: ${existing.status.toLowerCase()}`
    );
  }

  const row = await prisma.listing.update({
    where: { id },
    data: { status: "SUSPENDED" },
    include: {
      host: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          _count: { select: { listings: true } },
        },
      },
    },
  });
  // audit log
  await createAuditLog({
    action: LogActivity.SUSPENDED_SPACE_LISTING,
    actorId,
    description: `Suspended space listing ${existing.spaceName}`,
  })


  return {
    message: "Listing suspended successfully",
    listing: shapeListing(row as any),
  };
}

export async function reactivateListing(id: string, actorId: string) {
  await validateActor(actorId);
  if (!id) throw new BadRequestError("Listing id is required");

  const existing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, spaceName: true, status: true },
  });
  if (!existing) throw new NotFoundError("Listing not found");
  if (existing.status !== "SUSPENDED") {
    throw new BadRequestError(
      `Only suspended listings can be reactivated. Current status: ${existing.status.toLowerCase()}`
    );
  }

  const row = await prisma.listing.update({
    where: { id },
    data: { status: "APPROVED" },
    include: {
      host: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          _count: { select: { listings: true } },
        },
      },
    },
  });

  // audit log
  await createAuditLog({
    action: LogActivity.REACTIVATED_SPACE_LISTING,
    actorId,
    description: `Reactivated space listing ${existing.spaceName}`,
  })

  return {
    message: "Listing reactivated successfully",
    listing: shapeListing(row as any),
  };
}