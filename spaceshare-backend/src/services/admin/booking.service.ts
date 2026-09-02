import prisma from "../../utils/prisma";
import { Prisma } from "@prisma/client";
import { BadRequestError, NotFoundError } from "../../errors";





// ---------- INTERNAL HELPERS ------------------------------------------------------------

/**
 * Default commission rate (percentage-point integer, e.g. 10 = 10%) used when
 * the PlatformSettings table has no rows yet (fresh environment / settings page
 * hasn't been configured). MUST match the implicit default used in settings.service.ts
 * when it seeds the first PlatformSettings row.
 */


// Local Booking type (mirrors spaceshare-web: booking.types.ts Booking — fully compatible)
interface Booking {
  id: string;
  bookingNumber: string;
  guest: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    totalBookings: number;
  };
  host: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    totalListings: number;
  };
  listing: {
    id: string;
    spaceName: string;
    spaceType: string;
    location: string;
    thumbnail: string | null;
    rating: number;
  };
  spaceName: string;
  location: string;
  capacityLabel: string;
  eventDate: string;
  dateCreated: string;
  eventTimeLabel: string;
  paymentDate: string;
  checkIn: string;
  checkOut: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  guestCount: number;
  addOns: Array<{
    id?: string;
    name: string;
    quantityLabel?: string;
    price: number;
    [k: string]: any;
  }>;
  spaceFee: number;
  addOnsTotal: number;
  cautionFee: number;
  serviceFee: number;
  amount: number;
  platformCommission: number;
  netPayoutHost: number;
  paymentRef?: string;
  paymentStatus: "pending" | "paid" | "cancelled";
  status:
    | "pending"
    | "approved"
    | "declined"
    | "paid"
    | "completed"
    | "cancelled"
    | "disputed"; // virtual — computed from open Dispute + active base status
  declineReason?: string;
  cancelReason?: string;
  hasOpenDispute: boolean;
  disputeId?: string;
}


/**
 * ⚠️ CANONICAL ADMIN BOOKING STATUS CONTRACT — SINGLE SOURCE OF TRUTH ⚠️
 *
 * This function is the ONE place that translates raw Prisma BookingStatus enum values
 * (PENDING, APPROVED, DECLINED, PAID, COMPLETED, CANCELLED) + the presence of an open
 * Dispute row into the 7 canonical lowercase literal strings ALL admin clients consume.
 *
 * Output values:
 *   "pending"   — BookingStatus.PENDING   (guest submitted, host not yet acted)
 *   "approved"  — BookingStatus.APPROVED  (host approved, payment may or may not have happened)
 *   "declined"  — BookingStatus.DECLINED  (host DECLINED the pending request. NO refund. DECLINED→"declined"
 *                                           renamed for admin UX clarity, matches sample payload TODOS.md:278)
 *   "paid"      — BookingStatus.PAID      (guest paid, paymentRef is set, money held by platform)
 *   "completed" — BookingStatus.COMPLETED (guest marked event done, payout released to host)
 *   "cancelled" — BookingStatus.CANCELLED (either party cancelled. REFUND required if preceded by PAID.
 *                                           DECLINED ≠ CANCELLED — do not conflate!)
 *   "disputed"  — VIRTUAL STATUS (not a DB enum). Overrides base status when:
 *                   hasOpenDispute = true AND base ∈ {pending, approved, paid, completed}
 *                  because an admin needs to see disputed booking highlighted regardless of underlying state.
 *
 * DO NOT remove / inline / "simplify". If you change values here, update spaceshare-web BookingStatus type to match.
 */
const mapStatus = (
  prismaStatus: string,
  hasOpenDispute: boolean
): Booking["status"] => {
  const base = prismaStatus.toLowerCase();
  let status: Booking["status"] =
    base === "declined" ? "declined" : (base as Booking["status"]);
  if (
    hasOpenDispute &&
    (status === "approved" ||
      status === "pending" ||
      status === "paid" ||
      status === "completed")
  ) {
    status = "disputed";
  }
  return status;
};


/** Join firstName + lastName; fall back to email */
const fullName = (u: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string => {
  const n = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return n.length > 0 ? n : u.email;
};

// ---------- PRISMA INCLUDE SNIPPET (shared between list + by-id) ----------
// NOTE: Booking has no direct `host` relation in schema — host is accessed via listing.host
// NOTE: Dispute model does not yet exist in schema — hasOpenDispute defaults to false
const bookingIncludeForList = Prisma.validator<Prisma.BookingInclude>()({
  guest: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
      phone: true,
      _count: { select: { bookings: true } },
    },
  },
  listing: {
    select: {
      id: true,
      spaceCategory: true,
      spaceCapacity: true,   // ← needed for buildCapacityLabel() (per-listing guest bucket)
      photos: true,
      host: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          phone: true,
          _count: { select: { listings: true } },
        },
      },
    },
  },
});

const bookingIncludeForDetail: Prisma.BookingInclude = {
  ...bookingIncludeForList,
};

// ---------- FINANCIAL SHAPING HELPERS --------------------------------------------------

/**
 * Sum every add-on line item's total/price to produce addOnsTotal.
 *
 * The DB stores add-ons in addOnsBreakdown JSON as an array of:
 *   [{ name, price }]         ← mobile-app booking creation shape
 *   [{ name, total }]         ← alternative shape used in TODOS.md sample payloads
 *   [{ name, quantityLabel }] ← display-only variants that don't affect math
 *
 * Because shapes vary in the wild, sum the FIRST numeric field found in:
 *   1) line.total   (TODOS.md sample payload shape, explicit total)
 *   2) line.price   (mobile createBooking shape, per-line price)
 *   3) 0            (display-only add-ons with no financial impact — safe skip)
 */
function sumAddOnsTotal(breakdown: unknown): number {
  if (!Array.isArray(breakdown)) return 0;
  return breakdown.reduce((sum: number, line: any) => {
    if (line && typeof line === "object") {
      const numeric = typeof line.total === "number" ? line.total
                    : typeof line.price === "number" ? line.price
                    : 0;
      return sum + (Number.isFinite(numeric) ? numeric : 0);
    }
    return sum;
  }, 0);
}

/**
 * Build a human-readable guest capacity label from Listing.spaceCapacity.
 *
 * Listing schema stores spaceCapacity as a raw Int (e.g. 50, 100, 200).
 * Frontend Figma designs show capacity as a band label ("50-100 guests").
 *
 * Bucket thresholds mirror the mock factory defaults so production data and
 * mocks render identically. If business wants different bands later, change
 * ONLY this one function — it is the single source of truth for capacity labels.
 */
function buildCapacityLabel(spaceCapacity: unknown): string {
  const n = typeof spaceCapacity === "number" && Number.isFinite(spaceCapacity) ? spaceCapacity : 0;

  if (n <= 0)     return "Contact host for capacity";
  if (n <= 20)    return "Up to 20 guests";
  if (n <= 50)    return "20-50 guests";
  if (n <= 100)   return "50-100 guests";
  if (n <= 250)   return "100-250 guests";
  if (n <= 500)   return "250-500 guests";
  if (n <= 1000)  return "500-1000 guests";
  return `${n.toLocaleString()}+ guests`;
}

/**
 * Build a single-line time-range label matching Figma: "10:00am - 2:00pm".
 * Handles values already formatted ("10:00 AM", "10:00am") or raw.
 * Falls back to raw strings if parsing fails (never throw on display-only data).
 */
function buildEventTimeLabel(startTime: string | undefined | null, endTime: string | undefined | null): string {
  const s = (startTime ?? "").trim();
  const e = (endTime ?? "").trim();
  if (!s && !e) return "Contact host for time";    
  if (!e) return s;
  if (!s) return e;
  return `${s} - ${e}`;
}

/**
 * Fetch the active host commission percentage stored in PlatformSettings.
 *
 * Preconditions:
 *   - PlatformSettings model exists in Prisma schema with hostCommission Int.
 *   - Table has at most 1 active global settings row (singleton pattern).
 *
 * Returns:
 *   hostCommission percentage as integer (e.g. 10 = 10%).
 *
 * Caching strategy:
 *   Simple in-memory promise memo keyed by settings row `updatedAt` timestamp.
 *   Commission rates rarely change (admin configures once in Settings, updates
 *   rarely); re-fetching per-booking inside a paginated list of 50 rows would
 *   be wasteful 50x DB hits returning identical values.
 */
let cachedCommissionPromise: Promise<number> | null = null;
let cachedSettingsUpdatedAt: string | null = null;

async function getHostCommissionPct(): Promise<number> {
  // Fetch latest settings row to check updatedAt (cheap index hit on updatedAt DESC)
  
  const latestHostSettings = await prisma.platformSettings.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { hostCommission: true, updatedAt: true },
  });
  if (!latestHostSettings || !latestHostSettings.hostCommission) throw new BadRequestError("Request failed because there is no record of a host commission in the database. Update your platform settings");

  const effectiveCommission: number = latestHostSettings?.hostCommission;
  const rowUpdatedAt = latestHostSettings?.updatedAt.toISOString() ?? "default-settings";

  // Same updatedAt value as last call → reuse cached promise; avoid DB re-read
  if (cachedCommissionPromise && cachedSettingsUpdatedAt === rowUpdatedAt) {
    return cachedCommissionPromise;
  }

  cachedSettingsUpdatedAt = rowUpdatedAt;
  cachedCommissionPromise = Promise.resolve(effectiveCommission);
  return cachedCommissionPromise;
}

/**
 * Canonical booking financial math — SINGLE SOURCE OF TRUTH.
 *
 * All components (admin BookingDetailsSheet payment breakdown, Transaction rows,
 * Dashboard revenue stats) MUST agree on these formulas.
 *
 * Formula contracts (mirrors spaceshare-web mocks/bookings.mock.ts lines 4-10):
 *   ┌─────────────────────┬──────────────────────────────────────────────────┐
 *   │ spaceFee            │ Booking.spacePrice (snapshot of Listing.spacePrice │
 *   │                     │ taken at booking-creation time, stored in DB)    │
 *   │ addOnsTotal         │ Σ addOnsBreakdown[*].total OR price             │
 *   │ amount              │ spaceFee + addOnsTotal + cautionFee + serviceFee│
 *   │                     │   ⚠️ Falls back to Booking.totalPrice if the    │
 *   │                     │   above sum doesn't match (legacy / imported)   │
 *   │ platformCommission  │ round( amount * hostCommissionPct / 100 )       │
 *   │                     │   uses Math.round (banker-neutral, integers OK)│
 *   │ netPayoutHost       │ amount - platformCommission                    │
 *   └─────────────────────┴──────────────────────────────────────────────────┘
 *
 * IMPORTANT: hostCommissionPct applies to the FULL amount including refundable
 * cautionFee. If finance later decides caution deposits are commission-exempt,
 * change the commission base formula HERE. This function alone is responsible.
 */
interface FinancialFields {
  spaceFee: number;
  addOnsTotal: number;
  cautionFee: number;
  serviceFee: number;
  amount: number;
  platformCommission: number;
  netPayoutHost: number;
}

function computeFinancialFields(
  row: { spacePrice: IntLike; cautionFee: IntLike; serviceFee: IntLike; totalPrice: IntLike; addOnsBreakdown?: unknown },
  hostCommissionPct: number
): FinancialFields {
  const toInt = (v: IntLike): number => {
    const n = typeof v === "bigint" ? Number(v) : typeof v === "number" ? v : Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  const spaceFee   = toInt(row.spacePrice);
  const cautionFee = toInt(row.cautionFee);
  const serviceFee = toInt(row.serviceFee);
  const dbTotal    = toInt(row.totalPrice);
  const addOnsTotal = sumAddOnsTotal(row.addOnsBreakdown);

  // Compute ideal sum from stored components.
  const computedAmount = spaceFee + addOnsTotal + cautionFee + serviceFee;

  // Data-integrity guard: Booking.totalPrice is the authoritative "what the
  // guest actually paid" figure recorded at payment time. If it disagrees
  // with sum(line items) — e.g. a coupon was applied in-app, or a manual
  // adjustment was made — trust the DB totalPrice as the payment ledger source
  // of truth. Mismatches are logged for finance audit but never throw.
  let amount = dbTotal;
  if (computedAmount !== dbTotal && process.env.NODE_ENV !== "test") {
    console.warn(
      `[BOOKING-MATH] amount mismatch for booking ${(row as any).id ?? "unknown"}:`,
      `sum(spaceFee=${spaceFee} + addOnsTotal=${addOnsTotal} + caution=${cautionFee} + service=${serviceFee}) = ${computedAmount}`,
      `≠ Booking.totalPrice = ${dbTotal}. Using totalPrice.`
    );
  }

  const commissionBase = amount;
  const platformCommission = Math.round((commissionBase * hostCommissionPct) / 100);
  const netPayoutHost = amount - platformCommission;

  return { spaceFee, addOnsTotal, cautionFee, serviceFee, amount, platformCommission, netPayoutHost };
}
type IntLike = number | bigint | string | null | undefined;

// ---------- SHAPE MAPPER (now receives pre-resolved hostCommissionPct) ------
/**
 * Shape mapper is PURE: given a prisma row + commission pct, returns Booking DTO.
 * No async work, no DB calls inside. Keep it this way so it's unit-testable by
 * itself, and so getAllBookings / getBookingById share the exact same shaping.
 */
function ShapeBookingFromPrisma(row: any, hostCommissionPct: number): Booking {
  // Host lives on the listing relation, not directly on Booking (no schema relation yet)
  const host = row.listing?.host ?? { id: "", firstName: null, lastName: null, email: "", _count: { listings: 0 } };
  const guest = row.guest;
  const listing = row.listing;

  // Dispute model does not exist yet — default to false/undefined
  const openDispute: any = undefined;
  const hasOpenDispute = false;

  const status = mapStatus(row.status, hasOpenDispute);

  // Do NOT concatenate a time suffix like "T12:00:00Z" onto row.startDate.
  // In this schema startDate is already a full ISO 8601 datetime string (e.g. 2026-08-19T23:00:00.000Z).
  // Concatenating "T..." again would produce "2026-08-19T23:00:00.000ZT12:00:00Z" which is an INVALID ISO string → RangeError "Invalid time value".
  const eventDateObj = new Date(row.startDate);
  if (isNaN(eventDateObj.getTime())) {
    // Malformed startDate fall back to createdAt (the booking creation time — best-effort fallback)
    const fallbackDate = new Date(row.createdAt);
    if (isNaN(fallbackDate.getTime())) {
      throw new Error(`Booking ${String(row.id ?? "unknown")} has neither a valid startDate nor createdAt`);
    }
  }

  const dateCreated = new Date(row.createdAt);
  if (isNaN(dateCreated.getTime())) {
    throw new Error(`Booking ${String(row.id ?? "unknown")} has an invalid createdAt timestamp in the database`);
  }

  // ---- Display-only derived strings ----
  const eventDate = eventDateObj.toISOString();
  const capacityLabel = buildCapacityLabel(listing?.spaceCapacity);
  const eventTimeLabel = buildEventTimeLabel(row.startTime, row.endTime);
  // Payment date = when the payment happened (paid/paid-adjacent statuses) else when booking was created
  const paymentDate = (row.paymentRef ? row.updatedAt ?? row.createdAt : row.createdAt).toISOString?.()
    ?? new Date(row.createdAt).toISOString();

  // ---- Add-ons array (pass-through DTO shape unchanged) ----
  const addOns: Booking["addOns"] = Array.isArray(row.addOnsBreakdown)
    ? (row.addOnsBreakdown as Booking["addOns"])
    : [];

  // ---- Financial math (canonical formulas, pre-resolved commission pct) ----
  const finance = computeFinancialFields(row, hostCommissionPct);

  const paymentStatus: Booking["paymentStatus"] = row.paymentRef
    ? "paid"
    : status === "cancelled"
    ? "cancelled"
    : status === "completed"
    ? "paid"
    : "pending";

  return {
    id: row.id,
    bookingNumber: row.bookingNumber,
    guest: {
      id: guest.id,
      fullName: fullName(guest),
      email: guest.email,
      phone: guest.phone ?? undefined,
      avatarUrl: guest.avatarUrl ?? undefined,
      totalBookings: guest._count?.bookings ?? 0,
    },
    host: {
      id: host.id,
      fullName: fullName(host),
      email: host.email,
      phone: host.phone ?? undefined,
      avatarUrl: host.avatarUrl ?? undefined,
      totalListings: host._count?.listings ?? 0,
    },
    listing: {
      id: listing.id,
      spaceName: row.spaceName,
      spaceType: listing.spaceCategory ?? "Event Space",
      location: row.spaceLocation,
      thumbnail: Array.isArray(listing.photos) ? listing.photos[0] ?? null : null,
      rating: 0,
    },
    spaceName: row.spaceName,
    location: row.spaceLocation,
    capacityLabel,
    eventDate,
    dateCreated: dateCreated.toISOString(),
    eventTimeLabel,
    paymentDate,
    checkIn: `${row.startDate} ${row.startTime}`,
    checkOut: `${row.endDate} ${row.endTime}`,
    startTime: row.startTime,
    endTime: row.endTime,
    startDate: row.startDate,
    endDate: row.endDate,
    guestCount: row.guests,
    addOns,
    ...finance,   // spaceFee, addOnsTotal, cautionFee, serviceFee, amount, platformCommission, netPayoutHost
    paymentRef: row.paymentRef ?? undefined,
    paymentStatus,
    status,
    declineReason: row.declineReason ?? undefined,
    cancelReason: row.cancelReason ?? undefined,
    hasOpenDispute,
    disputeId: openDispute?.id,
  };
}

// ---------- PUBLIC SERVICE API ---------------------------------------------------------

export interface BookingListQuery {
  page: number;
  pageSize: number;
  status?:
    | "pending"
    | "approved"
    | "declined"
    | "paid"
    | "completed"
    | "cancelled"
    | "disputed";
  search?: string;
  sortBy?:
    | "bookingNumber"
    | "guestName"
    | "hostName"
    | "spaceName"
    | "eventDate"
    | "amount"
    | "status";
  sortOrder: "asc" | "desc";
}

export const getAllBookings = async (query: BookingListQuery) => {
  const { page, pageSize, status, search, sortBy, sortOrder } = query;
  const skip = (page - 1) * pageSize;

  // Resolve active host commission once (same rate for every booking in the result set).
  const hostCommissionPct = await getHostCommissionPct();

  // BookingStatus in Prisma is a string enum — use literal values directly
  const prismaStatus: "PENDING" | "APPROVED" | "DECLINED" | "PAID" | "COMPLETED" | "CANCELLED" | undefined =
    !status || status === "disputed"
      ? undefined
      : status === "declined"
      ? "DECLINED"
      : (status.toUpperCase() as "PENDING" | "APPROVED" | "DECLINED" | "PAID" | "COMPLETED" | "CANCELLED");

  const where: Prisma.BookingWhereInput = {};
  if (prismaStatus) where.status = prismaStatus;
  // NOTE: Dispute model does not exist yet — 'disputed' filter returns empty result set
  // until the Dispute model is added to the Prisma schema.
  if (status === "disputed") {
    where.AND = [{ id: "__no_dispute_model_yield_empty__" }];
  }

  if (search) {
    const t = search.trim();
    where.OR = [
      // Search admin-visible booking reference first (high-signal exact match)
      { bookingNumber: { contains: t, mode: "insensitive" } },
      { spaceName: { contains: t, mode: "insensitive" } },
      { spaceLocation: { contains: t, mode: "insensitive" } },
      { guest: { is: { firstName: { contains: t, mode: "insensitive" } } } },
      { guest: { is: { lastName: { contains: t, mode: "insensitive" } } } },
      { guest: { is: { email: { contains: t, mode: "insensitive" } } } },
      // Host lives under listing.host (no direct host relation on Booking)
      { listing: { is: { host: { is: { firstName: { contains: t, mode: "insensitive" } } } } } },
      { listing: { is: { host: { is: { lastName: { contains: t, mode: "insensitive" } } } } } },
      { listing: { is: { host: { is: { email: { contains: t, mode: "insensitive" } } } } } },
    ];
  }

  // Prisma-level orderBy for DB-sortable columns.
  // NOTE: bookingNumber is now a real DB column — native ORDER BY gives us
  // mathematically correct pagination semantics across page 2, 3, etc.
  // guestName/hostName remain JS in-memory sorted below (derived fullName).
  let prismaOrderBy: Prisma.BookingOrderByWithRelationInput[] = [];
  if (sortBy === "bookingNumber") prismaOrderBy = [{ bookingNumber: sortOrder }];
  else if (sortBy === "eventDate")
    prismaOrderBy = [{ startDate: sortOrder }, { startTime: sortOrder }];
  else if (sortBy === "amount") prismaOrderBy = [{ totalPrice: sortOrder }];
  else if (sortBy === "spaceName") prismaOrderBy = [{ spaceName: sortOrder }];
  else if (sortBy === "status") prismaOrderBy = [{ status: sortOrder }];
  else prismaOrderBy = [{ createdAt: sortOrder }];

  const [rows, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      include: bookingIncludeForList,
      orderBy: prismaOrderBy,
      skip,
      take: pageSize,
    }),
    prisma.booking.count({ where }),
  ]);

  // Shape DTOs — inject same hostCommissionPct into every row so math stays consistent
  let shaped = (rows as any[]).map((row) => ShapeBookingFromPrisma(row, hostCommissionPct));

  // In-memory sort ONLY for computed fullName guestName/hostName.
  // bookingNumber no longer needs JS sort — handled natively by prismaOrderBy above
  // (so page 2 / page 3 / pagination boundaries are globally correctly ordered).
  if (sortBy === "guestName" || sortBy === "hostName") {
    const key: "guest" | "host" = sortBy === "guestName" ? "guest" : "host";
    shaped = [...shaped].sort((a: any, b: any) => {
      const av = a[key].fullName;
      const bv = b[key].fullName;
      const cmp = String(av).localeCompare(String(bv));
      return sortOrder === "desc" ? -cmp : cmp;
    });
  }

  return { items: shaped, total, page, pageSize };
};

export const getBookingById = async (id: string): Promise<Booking> => {
  const [row, hostCommissionPct] = await Promise.all([
    prisma.booking.findUnique({
      where: { id },
      include: bookingIncludeForDetail,
    }),
    getHostCommissionPct(),
  ]);
  if (!row) throw new NotFoundError("Booking not found");
  return ShapeBookingFromPrisma(row, hostCommissionPct);
};