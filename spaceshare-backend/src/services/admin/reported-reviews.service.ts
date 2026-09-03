import prisma from "../../utils/prisma";
import { LogActivity, Prisma, ReportedReviewStatus as PrismaReportStatus } from "@prisma/client";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthenticatedError } from "../../errors";
import { createAuditLog } from "./audit-log.service";



const REPORT_STATUS_FROM_PRISMA: Record<PrismaReportStatus, "pending" | "closed"> = {
  PENDING: "pending",
  CLOSED: "closed",
};

const fullName = (u: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string => {
  const n = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return n.length > 0 ? n : u.email;
};

type RawReportedReviewRow = {
  id: string;
  bookingId: string;
  listingId: string;
  listing: { spaceName: string };
  authorId: string;
  author: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    avatarUrl: string | null;
  };
  hostId: string;
  host: { role: string };
  rating: number;
  comment: string;
  visibility: any;
  reportReason: string | null;
  reportedById: string | null;
  reportedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    avatarUrl: string | null;
    role: string;
  } | null;
  reportStatus: PrismaReportStatus;
  moderatedAt: Date | null;
  moderatedNote: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function shapeReportedReview(row: RawReportedReviewRow) {
  const reporter = row.reportedBy;
  const reporterRole: "host" | "guest" = reporter?.role === "HOST" || reporter?.role === "ADMIN"
    ? "host"
    : "guest";

  return {
    id: row.id,
    spaceName: row.listing.spaceName,
    reviewText: row.comment,
    writtenAt: row.createdAt.toISOString(),
    author: {
      id: row.author.id,
      fullName: fullName(row.author),
      email: row.author.email,
      avatarUrl: row.author.avatarUrl ?? undefined,
    },
    reason: row.reportReason as any,
    reportedBy: {
      id: reporter?.id ?? "",
      fullName: reporter ? fullName(reporter) : "Unknown",
      email: reporter?.email ?? "",
      avatarUrl: reporter?.avatarUrl ?? undefined,
      role: reporterRole,
    },
    status: REPORT_STATUS_FROM_PRISMA[row.reportStatus],
    moderatedAt: row.moderatedAt?.toISOString(),
  };
}

const reportedReviewIncludeForList = Prisma.validator<Prisma.ReviewInclude>()({
  listing: { select: { spaceName: true } },
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
    },
  },
  reportedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
      role: true,
    },
  },
});

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

export async function recomputeListingAggregates(listingId: string) {
  const visibleReviews = await prisma.review.findMany({
    where: {
      listingId,
      visibility: "VISIBLE",
    },
    select: { rating: true },
  });

  const reviewCount = visibleReviews.length;
  const avgRating =
    reviewCount === 0
      ? 0
      : visibleReviews.reduce((s, r) => s + (typeof r.rating === "number" ? r.rating : 0), 0) /
        reviewCount;

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      avgRating: Number(avgRating.toFixed(2)),
      reviewCount,
    },
  });
}

export interface ReportedReviewsQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: "pending" | "closed";
  sortBy?: "spaceName" | "writtenAt" | "status" | "authorName" | "reporterName";
  sortOrder: "asc" | "desc";
}

export async function getReportedReviews(query: ReportedReviewsQuery) {
  const { page, pageSize, search, status, sortBy, sortOrder } = query;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ReviewWhereInput = {
    reportStatus: { not: undefined as any },
    AND: [{ reportReason: { not: null } }],
  };

  if (status) {
    where.reportStatus = status === "pending" ? "PENDING" : "CLOSED";
  }

  if (search && search.trim()) {
    const t = search.trim();
    where.OR = [
      { listing: { is: { spaceName: { contains: t, mode: "insensitive" } } } },
      { comment: { contains: t, mode: "insensitive" } },
      { reportReason: { contains: t, mode: "insensitive" } },
      {
        author: {
          is: {
            OR: [
              { firstName: { contains: t, mode: "insensitive" } },
              { lastName: { contains: t, mode: "insensitive" } },
              { email: { contains: t, mode: "insensitive" } },
            ],
          },
        },
      },
      {
        reportedBy: {
          is: {
            OR: [
              { firstName: { contains: t, mode: "insensitive" } },
              { lastName: { contains: t, mode: "insensitive" } },
              { email: { contains: t, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  let prismaOrderBy: Prisma.ReviewOrderByWithRelationInput[] = [];
  if (sortBy === "writtenAt") prismaOrderBy = [{ createdAt: sortOrder }];
  else if (sortBy === "spaceName") prismaOrderBy = [{ listing: { spaceName: sortOrder } }];
  else if (sortBy === "status") prismaOrderBy = [{ reportStatus: sortOrder }];
  else prismaOrderBy = [{ createdAt: "desc" }];

  const [rows, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      include: reportedReviewIncludeForList,
      orderBy: prismaOrderBy,
      skip,
      take: pageSize,
    }),
    prisma.review.count({ where }),
  ]);

  let shaped = (rows as any[]).map((r) => shapeReportedReview(r));

  if (sortBy === "authorName" || sortBy === "reporterName") {
    shaped = [...shaped].sort((a: any, b: any) => {
      const av = sortBy === "authorName" ? a.author.fullName : a.reportedBy.fullName;
      const bv = sortBy === "authorName" ? b.author.fullName : b.reportedBy.fullName;
      const cmp = String(av).localeCompare(String(bv));
      return sortOrder === "desc" ? -cmp : cmp;
    });
  }

  return { items: shaped, total, page, pageSize };
}

export async function getReportedReviewById(id: string) {
  if (!id) throw new BadRequestError("Reported review id is required");
  const row = await prisma.review.findUnique({
    where: { id },
    include: reportedReviewIncludeForList,
  });
  if (!row) throw new NotFoundError("Reported review not found");
  return shapeReportedReview(row as any);
}

export async function retainReview(id: string, actorId: string) {
  await validateActor(actorId);
  if (!id) throw new BadRequestError("Reported review needs to be provided before attempting deletion");

  const existing = await prisma.review.findUnique({
    where: { id },
    select: { id: true, reportStatus: true, listingId: true, author: true, reportedBy: true },
  });
  if (!existing) throw new NotFoundError("Reported review not found");

  const row = await prisma.review.update({
    where: { id },
    data: {
      reportStatus: "CLOSED",
      moderatedAt: new Date(),
    },
    include: reportedReviewIncludeForList,
  });
  // audit log
  createAuditLog({
    actorId,
    action: LogActivity.RESTORED_REVIEW,
    description: `Retained review reported by user ${existing?.reportedBy?.email}`,
  })


  return {
    message: "Review retained successfully",
    review: shapeReportedReview(row as any),
  };
}

export async function removeReview(id: string, actorId: string) {
  await validateActor(actorId);
  if (!id) throw new BadRequestError("Reported review id is required");

  const existing = await prisma.review.findUnique({
    where: { id },
    select: { id: true, reportStatus: true, listingId: true, visibility: true, reportedBy: true },
  });
  if (!existing) throw new NotFoundError("Reported review not found");

  const row = await prisma.review.update({
    where: { id },
    data: {
      reportStatus: "CLOSED",
      moderatedAt: new Date(),
      visibility: "REMOVED",
    },
    include: reportedReviewIncludeForList,
  });

  await recomputeListingAggregates(row.listingId);
  //audit log
  createAuditLog({
    actorId,
    action: LogActivity.REMOVED_REVIEW,
    description: `Removed review reported by user ${existing?.reportedBy?.email}`,
  })

  return {
    message: "Review removed successfully",
    review: shapeReportedReview(row as any),
  };
}

export async function adminDeleteReview(id: string, actorId: string) {
  await validateActor(actorId);
  if (!id) throw new BadRequestError("Review id is required");

  const existing = await prisma.review.findUnique({
    where: { id },
    select: { id: true, listingId: true, visibility: true, listing: true },
  });
  if (!existing) throw new NotFoundError("Review not found");
  if (existing.visibility === "REMOVED") {
    throw new BadRequestError("Review is already removed");
  }

  const row = await prisma.review.update({
    where: { id },
    data: {
      visibility: "REMOVED",
      moderatedAt: new Date(),
      moderatedNote: "Direct admin deletion from listing reviews panel",
    },
    include: reportedReviewIncludeForList,
  });

  await recomputeListingAggregates(row.listingId);
  // audit log
  createAuditLog({
    actorId,
    action: LogActivity.REMOVED_REVIEW,
    description: `Removed review from space listing ${existing.listing.spaceName}`
  })
  return {
    message: "Review deleted successfully",
    review: shapeReportedReview(row as any),
  };
}