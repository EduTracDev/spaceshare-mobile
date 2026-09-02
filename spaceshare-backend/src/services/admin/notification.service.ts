import prisma from '../../utils/prisma';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../errors';
import { Prisma, $Enums } from '@prisma/client';
import { markAsRead as mobileMarkAsRead } from '../notification.service';
import { createNotification } from '../notification.service';


/* -------------------------------------------------------------------------- */
/*                           PUBLIC SERVICE API                               */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/admin/notifications?tab=...
 *
 * Always returns: { items, total, page, pageSize, unreadCount }
 *
 * unreadCount = admin user's FULL inbox unread count across all tabs/pages.
 * This lets the bell badge show the correct number even when admin is paging
 * through "tab=all" mixed rows on page 3.
 */
export async function listAdminNotifications(
  adminUserId: string,
  query: AdminNotifListQuery,
) {
  if (!adminUserId) throw new BadRequestError('Admin userId required');
  const { page, pageSize, tab } = query;
  const skip = (page - 1) * pageSize;

  // Full-inbox WHERE — userId scoped + optional unread-only tab filter.
  const whereTabFiltered: Prisma.NotificationWhereInput = {
    userId: adminUserId,
    ...(tab === 'unread' ? { read: false } : {}),
  };

  // No-tab-filtered WHERE (always user scoped) — used for global unread count.
  const whereAll: Prisma.NotificationWhereInput = { userId: adminUserId, read: false };

  const [rows, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: whereTabFiltered,
      select: NOTIF_SELECT,
      orderBy: { createdAt: 'desc' },  // newest notifications first
      skip, take: pageSize,
    }),
    prisma.notification.count({ where: whereTabFiltered }),
    prisma.notification.count({ where: whereAll }),
  ]);

  const items = (rows as PrismaNotifRow[]).map(shapeAdminNotification);

  return { items, total, page, pageSize, unreadCount };
}

/**
 * PATCH /api/admin/notifications/:id/read
 *
 * Reuses mobile service markAsRead for: notification-exists check +
 * ownership check (userId === notification.userId). Throws E.NOTFOUND or
 * Forbidden so we get consistent error messages across mobile+admin.
 *
 * Returns the fully shaped admin notification with isRead=true for frontend to
 * patch its UI state without a refetch.
 */
export async function markOneAdminAsRead(notificationId: string, adminUserId: string) {
  if (!notificationId) throw new BadRequestError('Notification id required');
  if (!adminUserId)    throw new BadRequestError('Admin userId required');

  try {
    const updated = await mobileMarkAsRead(notificationId, adminUserId);
    return shapeAdminNotification(updated as PrismaNotifRow);
  } catch (err: any) {
    // Mobile service throws plain Error(). Translate to our CustomErrors so the
    // global error handler censor + status codes work as expected.
    const msg: string = (err?.message ?? '').toString();
    if (msg.includes('not found'))          throw new NotFoundError(msg || 'Notification not found');
    if (msg.includes('permission'))         throw new ForbiddenError(msg);
    throw new BadRequestError(msg || 'Failed to mark notification as read');
  }
}

/**
 * PATCH /api/admin/notifications/read-all
 *
 * Bulk marks admin user's every unread notification as read. Returns the exact
 * count flipped so frontend can show a toast like "Marked 23 notifications read".
 */
export async function markAllAdminAsRead(adminUserId: string): Promise<number> {
  if (!adminUserId) throw new BadRequestError('Admin userId required');

  // Callback transaction = atomic + type-safe (array overload disallows Promise<T>,
  // only raw PrismaPromise<T> which is what prisma.x() returns before awaiting).
  const updatedCount = await prisma.$transaction(async (tx) => {
    const count = await tx.notification.count({
      where: { userId: adminUserId, read: false },
    });
    await tx.notification.updateMany({
      where: { userId: adminUserId, read: false },
      data: { read: true },
    });
    return count;
  });
  return updatedCount;
}

/**
 * DELETE /api/admin/notifications
 *
 * Hard-deletes every notification row for this admin user. Used by the
 * Clear-All action in the notification drawer. Returns the removed count
 * for UX feedback ("14 notifications deleted").
 */
export async function clearAllAdminNotifications(adminUserId: string): Promise<number> {
  if (!adminUserId) throw new BadRequestError('Admin userId required');
  const deleted = await prisma.notification.deleteMany({ where: { userId: adminUserId } });
  return deleted.count;
}




// HELPERS
/**
 * Broadcasts one notification to EVERY admin role in the User table.
 * FIRE-AND-FORGET pattern (never awaits, never throws, never blocks caller).
 *
 * Usage: broadcastToAdmins({ type: 'DISPUTE_RAISED', title: 'New dispute', body: '...', referenceId: 'DP-001' })
 *        — call it and move on, no await needed.
 */
export function broadcastToAdmins(payload: {
  type: $Enums.NotificationType;
  title: string;
  body: string;
  referenceId?: string;
}): void {
  // Kick off the async flow — intentionally unawaited (fire-and-forget pattern).
  // Never await this call site — it MUST not block the originating HTTP response.
  (async () => {
    try {
      // 1) Fetch every admin user so we write one notif row per admin.
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
        select: { id: true },
      });

      await Promise.all(
        admins.map((admin) =>
          createNotification(
            admin.id,
            payload.type,
            payload.title,
            payload.body,
            undefined,
            payload.referenceId,
          ).catch(() => {})
        )
      );
    } catch {
      /* NEVER let broadcast failure blow up the originating HTTP call */
    }
  })();
}

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export interface AdminNotifListQuery {
  page: number;
  pageSize: number;
  tab: 'all' | 'unread';
}

/* -------------------------------------------------------------------------- */
/*                          PRISMA ENUM → FRONTEND TYPE MAP                  */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/* 8 admin-specific types. Frontend sends lowercase snake_case:               */
/*                                                                        */
/*   Prisma enum  BOOKING_REQUIRES_ATTENTION  →  "booking_requires_attention" */
/*                                                                            */
/* 15 mobile types (BOOKING_REQUEST_SENT, etc.) — only 3 of them are ever    */
/* routed to admin inboxes today. That's OK: we include ALL 23+ enum values  */
/* in this EXHAUSTIVE map so TypeScript forces future enum additions to be    */
/* added here explicitly (prevents silent runtime undefined).                */
/* -------------------------------------------------------------------------- */

type AnyNotificationType = $Enums.NotificationType;

/** Exhaustive switch — TS warns if a new NotificationType appears in enum. */
function frontendTypeFromPrisma(t: AnyNotificationType): string {
  switch (t) {
    // ————— ADMIN-SPECIFIC 8 TYPES —————————————————————————————————————————
    case 'LISTING_SUBMITTED':         return 'listing_submitted';
    case 'BOOKING_REQUIRES_ATTENTION':return 'booking_requires_attention';
    case 'NEW_USER_REGISTERED':       return 'new_user_registered';
    case 'REVIEW_REPORTED':           return 'review_reported';
    case 'PAYOUT_READY':              return 'payout_ready';
    case 'ADMIN_ACTIVITY':            return 'admin_activity';
    case 'TRANSACTION_FAILED':        return 'transaction_failed';
    case 'DISPUTE_RAISED':            return 'dispute_raised';

    // ————— MOBILE 15 TYPES (may appear, treat as informational) ————————————
    case 'BOOKING_REQUEST_SENT':  return 'booking_requires_attention';
    case 'BOOKING_APPROVED':      return 'booking_requires_attention';
    case 'BOOKING_DECLINED':      return 'booking_requires_attention';
    case 'BOOKING_CANCELLED':     return 'booking_requires_attention';
    case 'PAYMENT_SUCCESSFUL':    return 'booking_requires_attention';
    case 'PAYMENT_FAILED':        return 'transaction_failed';
    case 'REVIEW_REMINDER':       return 'admin_activity';
    case 'DISPUTE_SUBMITTED':     return 'dispute_raised';
    case 'REFUND_PROCESSED':      return 'transaction_failed';
    case 'NEW_BOOKING_REQUEST':   return 'booking_requires_attention';
    case 'LISTING_APPROVED':      return 'listing_submitted';
    case 'LISTING_REJECTED':      return 'listing_submitted';
    case 'REVIEW_RECEIVED':       return 'review_reported';
    case 'PAYOUT_SENT':           return 'payout_ready';

    // Defensive: future unknown types → render with generic badge label
    default: return 'admin_activity';
  }
}

/* -------------------------------------------------------------------------- */
/*                          TARGET ROUTE COMPUTATION                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/* targetPath is NOT persisted in DB. It's computed per-notification on      */
/* every read. This means URL route renames require a single switch change    */
/* here (no migration backfill, no stale rows in DB).                        */
/* -------------------------------------------------------------------------- */

function targetPathFrom(prismaType: AnyNotificationType, referenceId: string | null): string | undefined {
  const ref = referenceId ?? '';

  switch (prismaType) {
    case 'LISTING_SUBMITTED':
    case 'LISTING_APPROVED':
    case 'LISTING_REJECTED':
      return ref ? `/listings?search=${encodeURIComponent(ref)}` : '/listings';

    case 'BOOKING_REQUIRES_ATTENTION':
    case 'BOOKING_REQUEST_SENT':
    case 'BOOKING_APPROVED':
    case 'BOOKING_DECLINED':
    case 'BOOKING_CANCELLED':
    case 'PAYMENT_SUCCESSFUL':
    case 'NEW_BOOKING_REQUEST':
      return ref ? `/bookings?search=${encodeURIComponent(ref)}` : '/bookings';

    case 'NEW_USER_REGISTERED':
      return '/users';

    case 'REVIEW_REPORTED':
    case 'REVIEW_RECEIVED':
      return ref ? `/reported-reviews?search=${encodeURIComponent(ref)}` : '/reported-reviews';

    case 'PAYOUT_READY':
    case 'PAYOUT_SENT':
      return '/transactions';

    case 'TRANSACTION_FAILED':
    case 'REFUND_PROCESSED':
    case 'PAYMENT_FAILED':
      return '/transactions';

    case 'DISPUTE_RAISED':
    case 'DISPUTE_SUBMITTED':
      return ref ? `/disputes?search=${encodeURIComponent(ref)}` : '/disputes';

    case 'ADMIN_ACTIVITY':
    case 'REVIEW_REMINDER':
      return '/audit-log';

    default:
      return undefined;
  }
}

/* -------------------------------------------------------------------------- */
/*                              DTO SHAPER                                    */
/* -------------------------------------------------------------------------- */

type PrismaNotifRow = Prisma.NotificationGetPayload<{
  select: { id: true; type: true; title: true; body: true; createdAt: true;
            read: true; referenceId: true };
}>;

function shapeAdminNotification(dbRow: PrismaNotifRow) {
  const frontendType = frontendTypeFromPrisma(dbRow.type as AnyNotificationType);
  return {
    id: dbRow.id,
    type: frontendType,
    title: dbRow.title,
    body: dbRow.body,
    createdAt: dbRow.createdAt.toISOString(),
    isRead: !!dbRow.read,              // rename DB:read → frontend:isRead
    referenceId: dbRow.referenceId ?? undefined,   // null → undefined for frontend Optional field
    targetPath: targetPathFrom(dbRow.type as AnyNotificationType, dbRow.referenceId),
  } as const;
}

const NOTIF_SELECT = Prisma.validator<Prisma.NotificationSelect>()({
  id: true, type: true, title: true, body: true, createdAt: true, read: true, referenceId: true,
});