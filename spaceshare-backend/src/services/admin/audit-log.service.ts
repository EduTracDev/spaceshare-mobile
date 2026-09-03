import prisma from "../../utils/prisma";
import { Prisma } from "@prisma/client";
import type { LogActivity } from "@prisma/client";
import { broadcastToAdmins } from "./notification.service";

// ---------------------------------------------------------------------------
// DTO — matches what the frontend AuditLog table expects.
// The schema stores `action` as the LogActivity ENUM (UPPER_SNAKE_CASE) but
// the UI wants a human-readable string ("Admin login", "Approved space listing", …).
// We also attach the actor (User) row so the table can display name/email/avatar.
// ---------------------------------------------------------------------------
export interface AuditLogDTO {
  id: string;
  actor: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
  };
  timestamp: string;    // ISO string, createdAt from DB
  action: string;       // Human-readable (mapped from LogActivity enum)
  description: string;
  targetUserId?: string | null;
}

export interface PaginatedAuditLogs {
  items: AuditLogDTO[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditLogListQuery {
  page: number;
  pageSize: number;
  search?: string;
  dateRange?: { start: string | null; end: string | null };
  sortBy?: "actorName" | "timestamp" | "action" | "description";
  sortOrder: "asc" | "desc";
}

// ----- Enum → Human readable mapping (matches frontend AuditLogAction[] + extended enums) -----
const ACTION_LABEL: Record<LogActivity, string> = {
  INVITED_ADMIN: "Invited admin user",
  UPDATED_COMMISSION: "Updated platform commission",
  ADMIN_SUSPENDED_USER: "Admin suspend user",
  ADMIN_RESTORED_USER: "Restored user access",
  ADMIN_LOGIN: "Admin login",
  ADMIN_LOGOUT: "Admin Logout",
  RESENT_ADMIN_INVITATION: "Resent admin invitation",
  REVOKED_ADMIN_INVITATION: "Cancelled admin invitation",
  SUPERADMIN_SUSPENDED_ADMIN: "Suspended admin user",
  RESTORED_ADMIN_ACCESS: "Restored admin access",
  APPROVED_SPACE_LISTING: "Approved space listing",
  REJECTED_SPACE_LISTING: "Rejected space listing",
  SUSPENDED_SPACE_LISTING: "Suspended space listing",
  REACTIVATED_SPACE_LISTING: "Reactivated space listing",
  REMOVED_REVIEW: "Removed review",
  RESTORED_REVIEW: "Restored review",
  VERIFIED_PAYMENT: "Verified payment",
  VERIFIED_DISPUTE_RESOLUTION: "Verified dispute resolution",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fullName = (u: { firstName: string | null; lastName: string | null; email: string }): string => {
  const n = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return n.length > 0 ? n : u.email;
};

const AUDIT_LOG_INCLUDE = Prisma.validator<Prisma.AuditLogInclude>()({
  actor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
    },
  },
});

function shapeAuditLogFromPrisma(row: any): AuditLogDTO {
  const actor = row.actor;
  return {
    id: row.id,
    actor: {
      id: actor.id,
      fullName: fullName(actor),
      email: actor.email,
      avatarUrl: actor.avatarUrl ?? undefined,
    },
    timestamp: new Date(row.createdAt).toISOString(),
    action: ACTION_LABEL[row.action as LogActivity] ?? String(row.action),
    description: row.description,
    targetUserId: row.targetUserId ?? null,
  };
}

// ---------------------------------------------------------------------------
// Public service API
// ---------------------------------------------------------------------------

/**
 * Paginated, searchable, date-range filterable, sortable audit log list.
 *
 * Search covers: actor fullName / actor email / description / human-readable action label
 * (note: the raw LogActivity enum is NOT searched — only the mapped display string)
 *
 * Sorting:
 *  - timestamp / action / description → Prisma-level ORDER BY
 *  - actorName → in-memory sort on computed `fullName` (not a real DB column)
 */
export const getAllAuditLogs = async (query: AuditLogListQuery): Promise<PaginatedAuditLogs> => {
  const { page, pageSize, search, dateRange, sortBy, sortOrder } = query;
  const skip = (page - 1) * pageSize;

  const where: Prisma.AuditLogWhereInput = {};

  // ---- Date range filter ----
  if (dateRange?.start || dateRange?.end) {
    where.createdAt = {};
    if (dateRange.start) {
      where.createdAt.gte = new Date(dateRange.start);
    }
    if (dateRange.end) {
      // End-of-day: add 23h59m59s so the filter is inclusive of the selected "end" date.
      const endDay = new Date(dateRange.end);
      endDay.setHours(23, 59, 59, 999);
      where.createdAt.lte = endDay;
    }
  }

  // ---- Search filter ----
  if (search) {
    const t = search.trim();

    // Collect enum values whose human-readable label matches (case-insensitive).
    // We have to map action → label in app code since Postgres doesn't know our labels.
    const matchedActivities = (Object.keys(ACTION_LABEL) as LogActivity[]).filter((k) =>
      ACTION_LABEL[k].toLowerCase().includes(t.toLowerCase())
    );

    where.OR = [
      { description: { contains: t, mode: "insensitive" } },
      { actor: { is: { firstName: { contains: t, mode: "insensitive" } } } },
      { actor: { is: { lastName: { contains: t, mode: "insensitive" } } } },
      { actor: { is: { email: { contains: t, mode: "insensitive" } } } },
      ...(matchedActivities.length > 0 ? [{ action: { in: matchedActivities } }] : []),
    ];
  }

  // ---- Prisma-level orderBy ----
  let prismaOrderBy: Prisma.AuditLogOrderByWithRelationInput[] = [];
  if (sortBy === "timestamp") prismaOrderBy = [{ createdAt: sortOrder }];
  else if (sortBy === "description") prismaOrderBy = [{ description: sortOrder }];
  else if (sortBy === "action") prismaOrderBy = [{ action: sortOrder }];
  else prismaOrderBy = [{ createdAt: "desc" }];

  const [rows, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      include: AUDIT_LOG_INCLUDE,
      orderBy: prismaOrderBy,
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Shape DTOs
  let shaped = (rows as any[]).map(shapeAuditLogFromPrisma);

  // ---- In-memory sort: actorName (computed fullName is not a DB column) ----
  if (sortBy === "actorName") {
    shaped = [...shaped].sort((a, b) => {
      const cmp = a.actor.fullName.localeCompare(b.actor.fullName);
      return sortOrder === "desc" ? -cmp : cmp;
    });
  }

  return { items: shaped, total, page, pageSize };
};

/**
 * Create an audit log entry. Called from admin mutation services
 * (approveListing, suspendUser, inviteAdmin, etc.).
 *
 * This is fire-and-forget friendly: errors writing audit logs do NOT bubble
 * up to break the primary mutation — they are just logged to stderr. If you
 * need strict audit, await it and wrap in a Prisma $transaction in the caller.
 *
 * @param actorId  Admin user who performed the action (from req.userId).
 * @param action   One of the LogActivity enum values (typed, no free-form strings).
 * @param description Human readable summary (displayed in the audit-log table).
 * @param targetUserId Optional — when the action targets a specific user.
 */
export const createAuditLog = async (input: {
  actorId: string;
  action: LogActivity;
  description: string;
  targetUserId?: string;
}): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        description: input.description,
        targetUserId: input.targetUserId ?? undefined,
      },
    });

    // Broadcast ADMIN_ACTIVITY to all OTHER admins (situational awareness).
    // Exclude login/logout noise — those happen on every tab open / token refresh
    // and would fill every admin's inbox with non-useful spam.
    const ACTIVITIES_TO_NOTIFY = new Set<LogActivity>([
      'INVITED_ADMIN',
      'UPDATED_COMMISSION',
      'ADMIN_SUSPENDED_USER',
      'ADMIN_RESTORED_USER',
      'RESENT_ADMIN_INVITATION',
      'REVOKED_ADMIN_INVITATION',
      'SUPERADMIN_SUSPENDED_ADMIN',
      'RESTORED_ADMIN_ACCESS',
      'APPROVED_SPACE_LISTING',
      'REJECTED_SPACE_LISTING',
      'SUSPENDED_SPACE_LISTING',
      'REACTIVATED_SPACE_LISTING',
      'REMOVED_REVIEW',
      'RESTORED_REVIEW',
      'VERIFIED_PAYMENT',
      'VERIFIED_DISPUTE_RESOLUTION',
    ]);
    if (ACTIVITIES_TO_NOTIFY.has(input.action)) {
      broadcastToAdmins({
        type: 'ADMIN_ACTIVITY',
        title: ACTION_LABEL[input.action] ?? String(input.action),
        body: input.description,
        referenceId: input.targetUserId ?? undefined,
      });
    }
  } catch (err) {
    // Never break the main request because audit-write / broadcast failed. Just log.
    console.error("[AUDIT WRITE FAILED]", {
      action: input.action,
      actorId: input.actorId,
      description: input.description,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};