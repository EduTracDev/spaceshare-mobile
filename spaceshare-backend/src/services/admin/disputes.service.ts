import prisma from '../../utils/prisma';
import { BadRequestError, NotFoundError } from '../../errors';
import { Prisma } from '@prisma/client';
import { createNotification } from '../notification.service';
import { createAuditLog } from './audit-log.service';
import { LogActivity } from '@prisma/client';

/* -------------------------------------------------------------------------- */
/*                               TYPES & CONSTS                               */
/* -------------------------------------------------------------------------- */

export type AdminDisputeStatusFilter = 'all' | 'new' | 'resolved';

export interface DisputeListQuery {
  page: number;
  pageSize: number;
  status: AdminDisputeStatusFilter;
  search?: string;
  sortBy?:
    | 'disputeNumber'
    | 'bookingNumber'
    | 'guestName'
    | 'hostName'
    | 'spaceName'
    | 'dateFiled'
    | 'status';
  sortOrder: 'asc' | 'desc';
}

/** Date format helpers — same conventions as booking.service admin shapes */
function formatDateFull(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = d.getDate(), month = d.getMonth() + 1, year = d.getFullYear();
  return `${pad(day)}/${pad(month)}/${year}`;
}

function formatDateTimeWAT(d: Date): string {
  // WAT (UTC+1) display offset. Keep consistent with other admin shapes.
  const wat = new Date(d.getTime() + 60 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const datePart = formatDateFull(wat);
  let hh = wat.getHours(), mm = wat.getMinutes();
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12; if (hh === 0) hh = 12;
  return `${datePart} ${pad(hh)}:${pad(mm)} ${ampm}`;
}

/** Shape name/avatar for raisedByParty display */
function shapeParty(u: { id: string; firstName: string | null; lastName: string | null; email: string; avatarUrl: string | null }) {
  const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;
  return {
    id: u.id,
    fullName,
    email: u.email,
    ...(u.avatarUrl ? { avatarUrl: u.avatarUrl } : {}),
  };
}

/* -------------------------------------------------------------------------- */
/*                           PRISMA INCLUDE STATEMENT                        */
/* -------------------------------------------------------------------------- */

const disputeInclude = Prisma.validator<Prisma.DisputeInclude>()({
  booking: {
    include: {
      guest: {
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
      },
      listing: {
        include: {
          host: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
        },
      },
    },
  },
  raisedBy: {
    select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
  },
  resolvedBy: {
    select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
  },
});

type DisputeRow = Prisma.DisputeGetPayload<{ include: typeof disputeInclude }>;

/* -------------------------------------------------------------------------- */
/*                              STATUS MAPPINGS                               */
/* -------------------------------------------------------------------------- */

/** Frontend collapses 4 DB states → 2 semantic buckets: */
const DB_OPEN_STATUSES: Array<'OPEN' | 'UNDER_REVIEW'> = ['OPEN', 'UNDER_REVIEW'];
const DB_RESOLVED_STATUSES: Array<'RESOLVED' | 'REJECTED'> = ['RESOLVED', 'REJECTED'];

function frontendStatusFromDb(dbStatus: string): 'new' | 'resolved' {
  return DB_OPEN_STATUSES.includes(dbStatus as any) ? 'new' : 'resolved';
}

/* -------------------------------------------------------------------------- */
/*                              EVIDENCE ARRAY WRAP                           */
/* -------------------------------------------------------------------------- */
/**
 * Option A: Wrap single-string evidenceUrl into 1-element synthetic array.
 * If evidenceUrl is null → return empty array.
 * File name / kind / mime are guessed from URL extension (best-effort, best
 * we can do before a real DisputeAttachment model is introduced).
 */
function shapeEvidence(evidenceUrl: string | null, disputeId: string) {
  if (!evidenceUrl || evidenceUrl.trim().length === 0) return [];

  const urlLower = evidenceUrl.toLowerCase();
  let kind: 'document' | 'image' = 'document';
  let mimeType = 'application/octet-stream';

  const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.bmp'];
  if (IMAGE_EXTS.some((ext) => urlLower.endsWith(ext))) {
    kind = 'image';
    if (urlLower.endsWith('.png')) mimeType = 'image/png';
    else if (urlLower.endsWith('.gif')) mimeType = 'image/gif';
    else if (urlLower.endsWith('.webp')) mimeType = 'image/webp';
    else mimeType = 'image/jpeg';
  } else if (urlLower.endsWith('.pdf')) {
    mimeType = 'application/pdf';
  }

  // Extract filename from URL path (after last /)
  let fileName = 'Submitted evidence';
  try {
    const pathname = new URL(evidenceUrl).pathname;
    const last = pathname.split('/').filter(Boolean).pop();
    if (last) fileName = decodeURIComponent(last);
  } catch {
    /* invalid or data URL — keep default name */
  }

  return [
    {
      id: `ev-${disputeId}-1`,
      name: fileName,
      sizeLabel: '—',       // unknown — not stored in DB today
      kind,
      downloadUrl: evidenceUrl,
      mimeType,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*                                 DTO SHAPER                                 */
/* -------------------------------------------------------------------------- */

function ShapeDisputeFromPrisma(row: DisputeRow) {
  const guest = shapeParty(row.booking.guest as any);
  const host  = shapeParty(row.booking.listing.host as any);

  const raisedBy: 'host' | 'guest' =
    row.raisedById === row.booking.guestId ? 'guest' : 'host';

  const raisedByParty = raisedBy === 'guest' ? guest : host;

  return {
    id: row.id,
    disputeNumber: row.disputeNumber,
    bookingNumber: row.booking.bookingNumber,
    guest,
    host,
    spaceName: row.booking.spaceName,
    dateFiled:     formatDateFull(row.createdAt),
    dateTimeFiled: formatDateTimeWAT(row.createdAt),
    status: frontendStatusFromDb(row.status),
    raisedBy,
    raisedByParty,
    reason: row.issueDetail,
    evidence: shapeEvidence(row.evidenceUrl, row.id),
  } as const;
}

/* -------------------------------------------------------------------------- */
/*                            PUBLIC SERVICE API                              */
/* -------------------------------------------------------------------------- */

export async function getAllDisputes(query: DisputeListQuery) {
  const { page, pageSize, status, search, sortBy, sortOrder } = query;
  const skip = (page - 1) * pageSize;

  // ---------------------------- WHERE ----------------------------------------
  const where: Prisma.DisputeWhereInput = {};
  if (status === 'new')      where.status = { in: DB_OPEN_STATUSES };
  if (status === 'resolved') where.status = { in: DB_RESOLVED_STATUSES };

  if (search) {
    const t = search.trim();
    where.OR = [
      { disputeNumber: { contains: t, mode: 'insensitive' } },
      { booking: { is: { bookingNumber: { contains: t, mode: 'insensitive' } } } },
      { booking: { is: { spaceName:     { contains: t, mode: 'insensitive' } } } },
      // Guest (booking.guest)
      { booking: { is: { guest: { is: { firstName: { contains: t, mode: 'insensitive' } } } } } },
      { booking: { is: { guest: { is: { lastName:  { contains: t, mode: 'insensitive' } } } } } },
      { booking: { is: { guest: { is: { email:     { contains: t, mode: 'insensitive' } } } } } },
      // Host (booking.listing.host)
      { booking: { is: { listing: { is: { host: { is: { firstName: { contains: t, mode: 'insensitive' } } } } } } } },
      { booking: { is: { listing: { is: { host: { is: { lastName:  { contains: t, mode: 'insensitive' } } } } } } } },
      { booking: { is: { listing: { is: { host: { is: { email:     { contains: t, mode: 'insensitive' } } } } } } } },
    ];
  }

  // ---------------------------- ORDER BY (DB-NATIVE) -------------------------
  let prismaOrderBy: Prisma.DisputeOrderByWithRelationInput[] = [];
  if (sortBy === 'disputeNumber') prismaOrderBy = [{ disputeNumber: sortOrder }];
  else if (sortBy === 'bookingNumber')
    prismaOrderBy = [{ booking: { bookingNumber: sortOrder } } as any];
  else if (sortBy === 'spaceName')
    prismaOrderBy = [{ booking: { spaceName: sortOrder } } as any];
  else if (sortBy === 'dateFiled') prismaOrderBy = [{ createdAt: sortOrder }];
  else if (sortBy === 'status')    prismaOrderBy = [{ status: sortOrder }];
  else prismaOrderBy = [{ createdAt: 'desc' }];

  // ---------------------------- QUERY ----------------------------------------
  const [rows, total] = await prisma.$transaction([
    prisma.dispute.findMany({
      where,
      include: disputeInclude,
      orderBy: prismaOrderBy,
      skip,
      take: pageSize,
    }),
    prisma.dispute.count({ where }),
  ]);

  // ---------------------------- SHAPE + IN-MEMORY SORTS ----------------------
  let shaped = (rows as DisputeRow[]).map(ShapeDisputeFromPrisma);

  // guestName / hostName are derived (firstName + lastName concat) → JS sort
  // ONLY for these 2 keys, others are DB-native. DisputeNumber already handled natively.
  if (sortBy === 'guestName' || sortBy === 'hostName') {
    const key: 'guest' | 'host' = sortBy === 'guestName' ? 'guest' : 'host';
    const factor = sortOrder === 'asc' ? 1 : -1;
    shaped = [...shaped].sort((a: any, b: any) =>
      a[key].fullName.localeCompare(b[key].fullName) * factor,
    );
  }

  // Status: DB-level only guarantees raw enum sort (UNDER_REVIEW ≠ "new" vs "resolved"
  // semantics). Re-sort the shaped array bucketed for explicit frontend status order.
  if (sortBy === 'status') {
    const factor = sortOrder === 'asc' ? 1 : -1;
    shaped = [...shaped].sort((a: any, b: any) =>
      String(a.status).localeCompare(String(b.status)) * factor,
    );
  }

  return { items: shaped, total, page, pageSize };
}

/**
 * Admin GET by dispute CUID or disputeNumber string.
 * Unlike mobile's getDisputeById — NO ownership checks. Admins see everything.
 */
export async function getDisputeById(idOrNumber: string) {
  if (!idOrNumber || idOrNumber.length === 0) throw new BadRequestError('Dispute id required');

  // Try CUID path first (findUnique for strong consistency). Fallback to
  // findFirst(disputeNumber match) so DP-001 strings also resolve correctly.
  let row: DisputeRow | null = await prisma.dispute.findUnique({
    where: { id: idOrNumber },
    include: disputeInclude,
  });

  if (!row) {
    row = await prisma.dispute.findFirst({
      where: { disputeNumber: idOrNumber },
      include: disputeInclude,
    });
  }

  if (!row) throw new NotFoundError('Dispute not found');
  return ShapeDisputeFromPrisma(row);
}

/**
 * Admin resolve (PATCH /:id/resolve). Requires the dispute to still be in the
 * "new" bucket (OPEN / UNDER_REVIEW). Already RESOLVED / REJECTED disputes
 * return BadRequest — prevents double-actions.
 *
 * Side effects (fire-and-forget — never block the HTTP response):
 *   1. Write audit log VERIFIED_DISPUTE_RESOLUTION
 *   2. Send notifications to: raiser + counterparty
 */
export async function resolveDispute(
  idOrNumber: string,
  adminUserId: string,
  resolutionNote: string,
) {
  if (!idOrNumber) throw new BadRequestError('Dispute id required');
  if (!adminUserId) throw new BadRequestError('Admin userId required');

  // Resolve the dispute row (supports both CUID + disputeNumber lookup)
  let row = await prisma.dispute.findUnique({
    where: { id: idOrNumber },
    include: disputeInclude,
  });
  if (!row) {
    row = await prisma.dispute.findFirst({
      where: { disputeNumber: idOrNumber },
      include: disputeInclude,
    });
  }
  if (!row) throw new NotFoundError('Dispute not found');

  if (DB_RESOLVED_STATUSES.includes(row.status as any)) {
    throw new BadRequestError('This dispute is already resolved');
  }

  // --- MAIN WRITE ------------------------------------------------------------
  const updated = await prisma.dispute.update({
    where: { id: row.id },
    data: {
      status: 'RESOLVED',
      resolutionNote,
      resolvedById: adminUserId,
      resolvedAt: new Date(),
    },
    include: disputeInclude,
  });

  const shaped = ShapeDisputeFromPrisma(updated);

  // --- SIDE EFFECTS (fire-and-forget, never fail response) -------------------
  const counterpartyId =
    updated.raisedById === updated.booking.guestId
      ? updated.booking.listing.hostId
      : updated.booking.guestId;


  // 1) Audit log (fire-and-forget — never block response, never throw)
  (async () => {
    try {
      await createAuditLog({
        actorId: adminUserId,
        action: LogActivity.VERIFIED_DISPUTE_RESOLUTION,
        description: `Admin resolved dispute ${shaped.disputeNumber} on booking ${shaped.bookingNumber} — "${resolutionNote}"`,
        targetUserId: updated.raisedById,
      });
    } catch {
      /* audit must never break API call */
    }
  })();

  // 2) Notifications — both parties (same mobile service, safe to call)
  try {
    // Raise-side
    createNotification(
      updated.raisedById,
      'DISPUTE_SUBMITTED',
      'Dispute Update',
      `Your dispute for ${shaped.spaceName} (${shaped.bookingNumber}) has been reviewed and resolved.`,
      updated.bookingId,
    ).catch(() => {});

    // Counter-party
    createNotification(
      counterpartyId,
      'DISPUTE_SUBMITTED',
      'Dispute Update',
      `The dispute on booking ${shaped.bookingNumber} (${shaped.spaceName}) has been resolved by admin.`,
      updated.bookingId,
    ).catch(() => {});
  } catch { /* notifications should never break API call */ }

  return shaped;
}