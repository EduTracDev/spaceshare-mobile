import prisma from "../../utils/prisma";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthenticatedError } from "../../errors";
import type { Role, UserStatus, Prisma } from "@prisma/client";


/** Map frontend's lowercase string (e.g. "host") to Prisma enum "HOST" */
const ROLE_MAP: Record<string, Role> = {
  host: "HOST",
  guest: "GUEST",
  admin: "ADMIN",
  super_admin: "SUPER_ADMIN",
};

/** Map frontend status (lowercase) to Prisma UserStatus enum */
const STATUS_MAP: Record<string, UserStatus> = {
  pending: "PENDING",
  active: "ACTIVE",
  suspended: "SUSPENDED",
};

/** Map Prisma enum → lowercase frontend string */
const fromRole = (r: Role): string => r.toLowerCase();
const fromStatus = (s: UserStatus): string => s.toLowerCase();

/** Format a DateTime (ISO) to the frontend's expected "DD/MM/YYYY hh:mm A" (Nigeria / UTC+1) */
function formatDateRegistered(date: Date): string {
  // Offset for West Africa Standard Time (UTC+1)
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

/** Convert a DB User row + aggregated counts into the AnyUser shape expected by the frontend */
function shapeUser(user: {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  avatarUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  invitedAt: Date | null;
  invitedBy: string | null;
  updatedAt: Date;
  permissions?: any;
  _count: { listings: number; bookings: number };
}) {
  const role = fromRole(user.role);
  const base = {
    id: user.id,
    fullName:
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.lastName || user.email.split("@")[0],
    email: user.email,
    phone: user.phone ?? undefined,
    role,
    status: fromStatus(user.status),
    avatarUrl: user.avatarUrl ?? undefined,
    dateRegistered: formatDateRegistered(user.createdAt),
    lastActiveAt: user.lastLoginAt?.toISOString(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };

  if (role === "admin" || role === "super_admin") {
    return {
      ...base,
      role: role as "admin" | "super_admin",
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      invitedAt: user.invitedAt?.toISOString(),
      invitedBy: user.invitedBy ?? undefined,
    } as const;
  }

  if (role === "host") {
    return {
      ...base,
      role: "host" as const,
      totalListings: user._count.listings,
    };
  }

  // guest (default)
  return {
    ...base,
    role: "guest" as const,
    totalBookings: user._count.bookings,
  };
}

export interface GetAllUsersFilters {
  role: "host" | "guest" | "admin";
  search?: string;
  status?: "all" | "pending" | "active" | "suspended";
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export async function getAllUsers(filters: GetAllUsersFilters) {
  const role = ROLE_MAP[filters.role];
  if (!role) throw new BadRequestError("Invalid role");

  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 10));
  const skip = (page - 1) * pageSize;

  // --- Prisma `where` clause ----------------------------------------------
  const where: any = { role };

  if (filters.status && filters.status !== "all") {
    const mappedStatus = STATUS_MAP[filters.status];
    if (!mappedStatus) throw new BadRequestError("Invalid status filter");
    where.status = mappedStatus;
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  // --- Prisma `orderBy` ----------------------------------------------------
  const SORTABLE_FIELDS: Record<string, string> = {
    fullName: "firstName", // DB doesn't have fullName; closest orderable = firstName
    firstName: "firstName",
    lastName: "lastName",
    email: "email",
    phone: "phone",
    role: "role",
    status: "status",
    dateRegistered: "createdAt",
    createdAt: "createdAt",
    lastLoginAt: "lastLoginAt",
    updatedAt: "updatedAt",
  };
  const sortField = filters.sortBy ? SORTABLE_FIELDS[filters.sortBy] : "createdAt";
  const sortDir = filters.sortOrder === "asc" ? "asc" : "desc";
  const orderBy:Prisma.UserOrderByWithRelationInput = sortField ? { [sortField]: sortDir } : { createdAt: "desc" };

  // --- Prisma transaction (count + page) in one round-trip ----------------
  const [itemsRaw, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        lastLoginAt: true,
        invitedAt: true,
        invitedBy: true,
        updatedAt: true,
        _count: { select: { listings: true, bookings: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const items = itemsRaw.map(shapeUser as any);

  return { items, total, page, pageSize };
}

export async function getUserById(id: string) {
  if (!id) throw new BadRequestError("User id is required");
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      avatarUrl: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      lastLoginAt: true,
      invitedAt: true,
      invitedBy: true,
      updatedAt: true,
      _count: { select: { listings: true, bookings: true } },
    },
  });
  if (!user) throw new NotFoundError("User not found");
  return (shapeUser as any)(user);
}

/** Suspend (soft deactivate) a user account by setting status = SUSPENDED */
export async function suspendUser(id: string, suspenderId: string) {
  if (!id) throw new BadRequestError("User id is required");

  const suspender = await prisma.user.findUnique({
    where: { id: suspenderId },
    select: { id: true, role: true, status: true }
  })
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, email: true, status: true, role: true },
  });
  if (!suspender) throw new UnauthenticatedError("Invalid action request");
  if ((suspender.role !== "ADMIN" && suspender.role !== "SUPER_ADMIN") || suspender.status === "SUSPENDED") throw new ForbiddenError("You are not authorised for this action");
  if (!existing) throw new NotFoundError("User not found");
  if (existing.status === "SUSPENDED") throw new BadRequestError("This account is already suspended");
  if (suspender.role === "ADMIN" && existing.role === "ADMIN") throw new ForbiddenError("Admin users cannot suspend other admin users");
  const fullName = existing.firstName && existing.lastName ? `${existing.firstName} ${existing.lastName}` : existing.email.split("@")[0];

  await prisma.user.update({ where: { id }, data: { status: "SUSPENDED" } });
  // Create audit log
  // await prisma.auditLog.create({
  //   data: {
  //     action: "attempted to suspend user",
  //     actor: suspenderId,
  //     description: "non admin user attempted to suspend"
  //   },
  // })

  return {
    success: true as const,
    message: `${fullName} has been suspended.`,
  };
}

/** Reactivate a suspended user account */
export async function reactivateUser(id: string, reactiverId: string) {
  if (!id) throw new BadRequestError("User id is required");
  const reactivator = await prisma.user.findUnique({
    where: { id: reactiverId },
    select: { id: true, role: true, status: true }
  })
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, email: true, status: true, role: true },
  });
  if (!reactivator) throw new UnauthenticatedError("Invalid action request");
  if ((reactivator.role !== "ADMIN" && reactivator.role !== "SUPER_ADMIN") || reactivator.status === "SUSPENDED") throw new ForbiddenError("You are not authorised for this action");
  if (!existing) throw new BadRequestError("This user does not exist");
  if (existing.status === "ACTIVE") throw new BadRequestError("This account is already active");
  if (reactivator.role === "ADMIN" && existing.role === "ADMIN") throw new ForbiddenError("Admin users cannot reactivate other admin users");
  if (!existing) throw new NotFoundError("User not found");
  if (existing.status !== "SUSPENDED") throw new BadRequestError("Only suspended accounts can be reactivated");

  const fullName = existing.firstName && existing.lastName ? `${existing.firstName} ${existing.lastName}` : existing.email.split("@")[0];

  await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } });
  // Create audit log
  // await prisma.auditLog.create({
  //   data: {
  //     action: "attempted to suspend user",
  //     actor: suspenderId,
  //     description: "non admin user attempted to suspend"
  //   },
  // })
  return {
    success: true as const,
    message: `${fullName}'s account has been reactivated.`,
  };
}


/**
 * Invite a new admin user (only SUPER_ADMIN should be allowed to do this in production).
 * Creates the User record with status = PENDING + invitedAt / invitedBy fields populated.
 * The actual invitation email (one-time setup link) is sent separately.
 */
export async function inviteAdmin(payload: {
  email: string;
  fullName: string;
  role?: "admin" | "super_admin";
  permissions?: string[];
  invitedBy?: string;
}) {
  const { email, fullName, role = "admin", permissions = [], invitedBy } = payload;

  if (!email) throw new BadRequestError("Email is required");
  if (!fullName) throw new BadRequestError("Full name is required");

  // Split the provided full name as best we can. Invitee updates own profile later.
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ") || null;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new BadRequestError("A user with this email already exists");

  const created = await prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      role: role === "super_admin" ? "SUPER_ADMIN" : "ADMIN",
      status: "PENDING",
      isVerified: false,
      invitedAt: new Date(),
      invitedBy: invitedBy ?? null,
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      updatedAt: true,
      invitedAt: true,
      invitedBy: true,
      _count: { select: { listings: true, bookings: true } },
    },
  });

  const admin = (shapeUser as any)({
    ...created,
    avatarUrl: null,
    phone: null,
    lastLoginAt: null,
    permissions,
  }) as {
    id: string;
    fullName: string;
    email: string;
    role: "admin" | "super_admin";
    permissions: string[];
    status: string;
    invitedAt?: string;
    invitedBy?: string;
    createdAt: string;
    updatedAt: string;
  };

  return {
    success: true as const,
    message: `Invitation sent to ${email}.`,
    admin,
  };
}