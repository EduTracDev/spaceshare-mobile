import { BadRequestError, ForbiddenError, NotFoundError } from "../../errors";
import { HOST_COMMISSION_PCT } from "../../utils/data";
import prisma from "../../utils/prisma";
import { Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import { TxRow, STATUS_PRIORITY, ListTransactionsParams, AdminTransaction, txInclude } from "../../types/admin/transactions.types";




/*                               SHAPER                                       */

export function shapeAdminTransaction(tx: TxRow): AdminTransaction {
  const { booking, recipient } = tx;
  const { listing, guest: bookingGuest, cancelledBy, cancelledByRole, cancelReason, cancelledAt } = booking;
  const host = listing.host;
  const guest = bookingGuest;

  /* Host shape — always required (bank account dash fallback) */
  const hostShape = {
    id: host.id,
    fullName: `${host.firstName ?? ""} ${host.lastName ?? ""}`.trim() || host.email,
    email: host.email,
    phone: host.phone ?? null,
    avatarUrl: host.avatarUrl ?? null,
    bankName: nullCoalesceDash(host.bankAccount?.bankName),
    accountNumber: nullCoalesceDash(host.bankAccount?.accountNumber),
    accountName: nullCoalesceDash(host.bankAccount?.accountName),
  };

  /* Guest shape — optional (bank account dash fallback if exists or not) */
  const guestShape: AdminTransaction["guest"] = guest
    ? {
        id: guest.id,
        fullName: `${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim() || guest.email,
        email: guest.email,
        phone: guest.phone ?? null,
        avatarUrl: guest.avatarUrl ?? null,
        bankName: nullCoalesceDash(guest.bankAccount?.bankName),
        accountNumber: nullCoalesceDash(guest.bankAccount?.accountNumber),
        accountName: nullCoalesceDash(guest.bankAccount?.accountName),
      }
    : undefined;

  /* Financial breakdown — derived FROM booking ONE SOURCE OF TRUTH.
     No per-transaction derivation (transaction.amount is per-row movement). */
  const spaceFee = Number(listing.spacePrice ?? 0);
  let addOnsTotal = 0;
  if (booking.addOnsBreakdown && Array.isArray(booking.addOnsBreakdown as any)) {
    addOnsTotal = (booking.addOnsBreakdown as any[]).reduce<number>(
      (sum, it) => sum + Number((it as any).price ?? 0),
      0
    );
  }
  const grossBookingAmount = Math.max(0, spaceFee + addOnsTotal);
  const commissionRate = Number(tx.commissionRate ?? HOST_COMMISSION_PCT);
  const platformCommission =
    Number(tx.commissionAmount) > 0
      ? Number(tx.commissionAmount)
      : Math.round((grossBookingAmount * commissionRate) / 100);
  const refundableCautionFee = Number(booking.cautionFee ?? 0);
  const netPayoutHost = Math.max(0, grossBookingAmount - platformCommission);

  /* Breakdown base (shared by all 3 transaction types) */
  const breakdownBase = {
    grossBookingAmount,
    platformCommission,
    refundableCautionFee,
    netPayoutHost,
  };

  /* Breakdown penalty fields ONLY for REFUND type */
  const refundBreakdown =
    tx.type === TransactionType.REFUND
      ? {
          /* Placeholder Option A today = 100% refund.
             Change to tiered cancellation policy here when finance rules arrive.
             Search "FINANCE REFUND TIERED POLICY" for future anchor. */
          refundAmountToGuest: Number(tx.amount),
          amountWithheldByPlatform: 0,
        }
      : {};

  /* Commission/netPayout shown at top-level row:
       PAYMENT  → commission stored, netPayout = net host
       PAYOUT   → commission = 0 (it's cash out), netPayout = tx.amount directly
       REFUND   → commission = 0, netPayout = refund amount
  */
  const commissionRow =
    tx.type === TransactionType.PAYMENT ? platformCommission : 0;
  const netPayoutRow =
    tx.type === TransactionType.PAYMENT
      ? netPayoutHost
      : Number(tx.amount);

  /* Recipient identity per NEW CONDITIONAL DB CHECK rule:
       PAYMENT → recipientId NULL (into corporate SpaceShare account).
       PAYOUT / REFUND → recipientId is a User FK JOIN.
     Never assume recipient exists unconditionally anymore (would crash PAYMENT rows).
  */
  let recipientRole: AdminTransaction["recipientRole"] = null;
  let recipientName: string | null = null;
  let recipientEmail: string | null = null;
  if (tx.type !== TransactionType.PAYMENT && recipient) {
    recipientRole = recipient.id === host.id ? "HOST" : "GUEST";
    recipientName =
      `${recipient.firstName ?? ""} ${recipient.lastName ?? ""}`.trim() ||
      recipient.email;
    recipientEmail = recipient.email ?? null;
  }

  /* Counter-party = the user on the "other side" (visible name in Payments tab because
     recipient is NULL platform). For payments: always Guest. For payouts/refunds: the
     primary customer-facing identity (which matches name chip in dialog header). */
  const cpObj =
    tx.type === TransactionType.PAYMENT ? (guest ?? host) : host;
  const counterpartyRole: "HOST" | "GUEST" =
    tx.type === TransactionType.PAYMENT ? "GUEST" : recipientRole ?? "HOST";
  const counterpartyName =
    `${cpObj.firstName ?? ""} ${cpObj.lastName ?? ""}`.trim() || cpObj.email;
  const counterpartyEmail = cpObj.email;

  /* Cancellation info snapshot */
  const cancellation: AdminTransaction["cancellation"] = cancelledAt && cancelledBy
    ? (() => {
        // Step 1: explicit CancelledByRole enum from Booking DB column (AUTHORITATIVE if set)
        let role: "HOST" | "GUEST" | "ADMIN" | undefined;
        if (cancelledByRole) {
          role = cancelledByRole as unknown as "HOST" | "GUEST" | "ADMIN";
        }
        // Step 2: if Booking.cancelledByRole was NULL for legacy rows, use the cancelling USER's actual .role column
        // (authoritative — SuperAdmin cancels → role is ADMIN, not guessed from recipient identity)
        if (!role && cancelledBy?.role) {
          switch (cancelledBy.role) {
            case "ADMIN":
            case "SUPER_ADMIN":
              role = "ADMIN";
              break;
            case "HOST":
              role = "HOST";
              break;
            case "GUEST":
            default:
              role = "GUEST";
              break;
          }
        }
        // Step 3 absolute last fallback only for very-old rows that have both explicit fields missing
        // (should be 0 rows after booking.service hooks populate cancelledByRole always).
        if (!role) {
          role = cancelledBy.id === host.id ? "HOST" : "GUEST";
        }

        return {
          byId: cancelledBy.id,
          byName:
            `${cancelledBy.firstName ?? ""} ${cancelledBy.lastName ?? ""}`.trim() ||
            cancelledBy.email ||
            (role ? `${role}` : "Unknown"),
          byEmail: cancelledBy.email || "—",
          byRole: role,
          timestamp: cancelledAt.toISOString(),
          reason: cancelReason || "No reason provided.",
        };
      })()
    : undefined;

  /* Refund card summary values */
  const refundInfo: AdminTransaction["refund"] =
    tx.type === TransactionType.REFUND
      ? {
          hostPayoutAmount: 0, // Figma Cancelled layout: N0 host payout.
          refundAmount: Number(tx.amount),
          refundedAt: tx.paidAt?.toISOString(),
        }
      : undefined;

  return {
    id: tx.id,
    type: lowerCaseType(tx.type),
    bookingNumber: booking.bookingNumber,
    transactionNumber: tx.transactionNumber,
    spaceName: booking.spaceName,
    bookingStatus: booking.status,
    eventDate: booking.startDate,
    transactionDate: tx.createdAt.toISOString(),
    amount: Number(tx.amount),
    commission: commissionRow,
    netPayout: netPayoutRow,
    purpose: tx.purpose ?? "",
    dbStatus: tx.status as AdminTransaction["dbStatus"],
    recipientRole,
    recipientName,
    recipientEmail,
    counterpartyRole,
    counterpartyName,
    counterpartyEmail,
    host: hostShape,
    guest: guestShape,
    breakdown: { ...breakdownBase, ...refundBreakdown },
    cancellation,
    refund: refundInfo,
  };
}

/* -------------------------------------------------------------------------- */
/*                           LIST TRANSACTIONS                                */
/*                                                                            */
/* Simplified! type & status are raw DB enums → direct Prisma WHERE.          */
/* No 7-status decoder, no 2-step ORM + VALUES workaround we needed before.   */
/* 100% pagination correct, sortBy=status global.                            */
/* -------------------------------------------------------------------------- */

export async function listTransactions(params: ListTransactionsParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(Math.max(1, params.pageSize ?? 10), 100);
  const skip = (page - 1) * pageSize;
  const sortBy = params.sortBy ?? "transactionDate";
  const sortOrder: "asc" | "desc" = params.sortOrder === "asc" ? "asc" : "desc";

  // ---------------- WHERE ASSEMBLY (literal SQL, no decoder!) ----------------
  const where: Prisma.TransactionWhereInput = {};

  const type = parseTypeParam(params.type);
  if (type) where.type = type;

  const status = parseStatusParam(params.status);
  if (status) where.status = status;

  // 3-way search: bookingNumber, transactionNumber, recipient name (ILIKE)
  if (params.search && params.search.trim().length > 0) {
    const q = params.search.trim();
    where.OR = [
      { booking: { bookingNumber: { contains: q, mode: "insensitive" } } },
      { transactionNumber: { contains: q, mode: "insensitive" } },
      { booking: { spaceName: { contains: q, mode: "insensitive" } } },
      { recipient: { firstName: { contains: q, mode: "insensitive" } } },
      { recipient: { lastName: { contains: q, mode: "insensitive" } } },
      { recipient: { email: { contains: q, mode: "insensitive" } } },
      { booking: { guest: { firstName: { contains: q, mode: "insensitive" } } } },
      { booking: { guest: { lastName: { contains: q, mode: "insensitive" } } } },
      { booking: { listing: { host: { firstName: { contains: q, mode: "insensitive" } } } } },
      { booking: { listing: { host: { lastName: { contains: q, mode: "insensitive" } } } } },
    ];
  }

  // ---------------- ORDER BY ASSEMBLY ----------------
  // If sortBy !== 'status' → 100% standard Prisma orderBy (fast, indexed)
  const nonStatusOrderBy: Prisma.TransactionOrderByWithRelationInput[] = [];
  switch (sortBy) {
    case "bookingNumber":
      nonStatusOrderBy.push({ booking: { bookingNumber: sortOrder } });
      break;
    case "transactionNumber":
      nonStatusOrderBy.push({ transactionNumber: sortOrder });
      break;
    case "spaceName":
      nonStatusOrderBy.push({ booking: { spaceName: sortOrder } });
      break;
    case "eventDate":
      nonStatusOrderBy.push({ booking: { startDate: sortOrder } });
      break;
    case "dateCancelled":
      nonStatusOrderBy.push({ booking: { cancelledAt: sortOrder } });
      break;
    case "amount":
      nonStatusOrderBy.push({ amount: sortOrder });
      break;
    case "commission":
      nonStatusOrderBy.push({ commissionAmount: sortOrder });
      break;
    case "netPayout":
      nonStatusOrderBy.push({ amount: sortOrder });
      break;
    case "transactionDate":
    default:
      nonStatusOrderBy.push({ createdAt: sortOrder });
      break;
  }
  // Break tie with createdAt desc
  nonStatusOrderBy.push({ createdAt: "desc" });

  // ---------------- COUNT TOTAL ----------------
  const total = await prisma.transaction.count({ where });

  // ---------------- FETCH ROWS ----------------
  let shaped: AdminTransaction[] = [];

  if (sortBy === "status") {
    /* Sort by STATUS priority: PENDING(needs attention) FIRST → FAILED → SUCCESSFUL.
       Since alphabetical order [F→P→S] is wrong, use CASE/WHEN priority integers.
       No 2-step workaround needed anymore (literal WHERE on type/status = bug-free!). */
    const priorityAsc = sortOrder === "asc" ? "ASC" : "DESC";
    const tiebreakAsc = sortOrder === "asc" ? "ASC" : "DESC";

    // Build WHERE predicate fragments SAFELY as Sql[] array (join separator is a plain string).
    // This fixes two bugs:
    //   (1) TSError: Prisma.join 2nd arg expected string, not Prisma.sql Sql object (line 493 crash)
    //   (2) Runtime bind-param count mismatch if type/status omitted via inline ${x ? foo : TRUE} inside the WHERE parenthesis.
    const whereFragments: Prisma.Sql[] = [];
    if (type) {
      whereFragments.push(Prisma.sql`t.type = ${type}::"TransactionType"`);
    }
    if (status) {
      whereFragments.push(Prisma.sql`t.status = ${status}::"TransactionStatus"`);
    }
    if (params.search && params.search.trim().length > 0) {
      const q = "%" + params.search.trim() + "%";
      whereFragments.push(Prisma.sql`(
        b."bookingNumber" ILIKE ${q}
        OR t."transactionNumber" ILIKE ${q}
        OR b."spaceName" ILIKE ${q}
        OR (r."firstName" || ' ' || r."lastName") ILIKE ${q}
        OR r."email" ILIKE ${q}
      )`);
    }
    const whereClause =
      whereFragments.length > 0
        ? Prisma.join(whereFragments, " AND ")
        : Prisma.sql`TRUE`;

    const orderQuery = Prisma.sql`
      SELECT t.id
      FROM "Transaction" t
      LEFT JOIN "Booking" b   ON b.id = t."bookingId"
      LEFT JOIN "User"    r   ON r.id = t."recipientId"
      WHERE (${whereClause})
      ORDER BY
        CASE t.status
          WHEN ${TransactionStatus.PENDING}::"TransactionStatus"    THEN ${STATUS_PRIORITY.PENDING}
          WHEN ${TransactionStatus.FAILED}::"TransactionStatus"     THEN ${STATUS_PRIORITY.FAILED}
          WHEN ${TransactionStatus.SUCCESSFUL}::"TransactionStatus" THEN ${STATUS_PRIORITY.SUCCESSFUL}
          ELSE 9
        END ${Prisma.raw(priorityAsc)},
        t."createdAt" ${Prisma.raw(tiebreakAsc)}
      LIMIT ${pageSize} OFFSET ${skip}
    `;

    const orderedIds = (await prisma.$queryRaw<Array<{ id: string }>>(orderQuery)).map((r) => r.id);

    if (orderedIds.length > 0) {
      const rows = await prisma.transaction.findMany({
        where: { id: { in: orderedIds } },
        include: txInclude,
      });
      const idToIndex = new Map(orderedIds.map((x, i) => [x, i]));
      rows.sort((a, b) => (idToIndex.get(a.id) ?? 9e9) - (idToIndex.get(b.id) ?? 9e9));
      shaped = rows.map(shapeAdminTransaction);
    }
  } else {
    // Non-status sort: straight Prisma ORM findMany with indexed orderBy + skip/take.
    const rows = await prisma.transaction.findMany({
      where,
      orderBy: nonStatusOrderBy,
      skip,
      take: pageSize,
      include: txInclude,
    });
    shaped = rows.map(shapeAdminTransaction);
  }

  return { items: shaped, total, page, pageSize };
}

/* -------------------------------------------------------------------------- */
/*                         GET TRANSACTION BY DETAIL                          */
/* -------------------------------------------------------------------------- */

export async function getTransactionById(id: string): Promise<AdminTransaction> {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new BadRequestError("Transaction id required");
  }
  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: txInclude,
  });
  if (!tx) throw new NotFoundError("Transaction not found");
  return shapeAdminTransaction(tx);
}

/* -------------------------------------------------------------------------- */
/*                         MARK PAYOUT AS PAID (ADMIN ACTION)                 */
/*                         5 🔒 IRONCLAD GUARDS                               */
/* -------------------------------------------------------------------------- */

export async function markPayoutsAsPaid(transactionId: string, adminUserId: string) {
  if (typeof transactionId !== "string" || transactionId.trim().length === 0) {
    throw new BadRequestError("Transaction id required.");
  }
  if (typeof adminUserId !== "string" || adminUserId.trim().length === 0) {
    throw new ForbiddenError("Admin identity missing.");
  }

  // Guard 1: Row exists, load everything for checks + targeted notification.
  // 1 Transaction ID = 1 recipient (per user UI clarification: 1:1, no batch host+guest).
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      booking: {
        include: {
          disputes: true,
          listing: true,
        },
      },
      recipient: true,
    },
  });
  if (!tx) throw new NotFoundError("Transaction not found.");

  // Guard 2: Type must be PAYOUT. Admin cannot use this route to mark PAYMENT/REFUND paid (wrong ledger).
  if (tx.type !== TransactionType.PAYOUT) {
    throw new BadRequestError(
      `Only payout rows can be marked as paid. Row type is '${tx.type}'.`
    );
  }

  // Guard 2b (defense in depth; DB CHECK should enforce. Still check API layer):
  if (!tx.recipientId || !tx.recipient) {
    throw new BadRequestError(
      `Payout row ${tx.transactionNumber} is missing recipient. Cannot process without valid payout destination user.`
    );
  }

  // Guard 3: Prevent double pay (must be PENDING db status)
  if (tx.status !== TransactionStatus.PENDING) {
    throw new BadRequestError(
      `Payout is already ${tx.status.toLowerCase()}. Cannot mark it paid again.`
    );
  }

  // Guard 4: Booking must be COMPLETED (event occurred). Never pay BEFORE event = CBN audit violation.
  if (tx.booking.status !== "COMPLETED") {
    throw new BadRequestError(
      `Booking ${tx.booking.bookingNumber} has status='${tx.booking.status}'. You cannot release payout before the event has been completed.`
    );
  }

  // Guard 5 (NON-NEGOTIABLE): No OPEN or UNDER_REVIEW disputes on booking.
  const hasActiveDispute = tx.booking.disputes.some(
    (d) => d.status === "OPEN" || d.status === "UNDER_REVIEW"
  );
  if (hasActiveDispute) {
    const openDp = tx.booking.disputes.find(
      (d) => d.status === "OPEN" || d.status === "UNDER_REVIEW"
    )!;
    throw new BadRequestError(
      `Dispute ${openDp.disputeNumber} is ${openDp.status.toLowerCase()} on this booking. No payouts can be released until the dispute is closed or settled.`
    );
  }

  // All 5 guards PASS → SINGLE ROW update.
  // (Dual 2-row payout plan still valid: admin simply clicks Mark As Paid on each dialog separately.)
  const paidAt = new Date();
  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: TransactionStatus.SUCCESSFUL,
      paidAt,
    },
  });
  const rowsPaid = 1;
  const recipient = tx.recipient;

  /* ========== NOTIFICATION (PAYOUT_SENT — ONLY TO THIS ROW'S RECIPIENT) ========== */
  try {
    if (recipient.id === tx.booking.listing.hostId) {
      await prisma.notification.create({
        data: {
          userId: recipient.id,
          type: "PAYOUT_SENT" as any,
          title: "Payout Sent",
          body: `Your payout of ${Number(tx.amount).toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 })} for booking ${tx.booking.bookingNumber} has been released. Check your bank account in 24 hours.`,
          bookingId: tx.bookingId,
        },
      });
    } else if (recipient.id === tx.booking.guestId) {
      await prisma.notification.create({
        data: {
          userId: recipient.id,
          type: "PAYOUT_SENT" as any,
          title: "Caution Fee Refund Sent",
          body: `Your caution fee refund of ${Number(tx.amount).toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 })} for booking ${tx.booking.bookingNumber} has been released to your bank account (1-2 business days).`,
          bookingId: tx.bookingId,
        },
      });
    }
  } catch (err) {
    console.error("[markAsPaid notification non-blocking fail]:", err);
  }

  /* ========== AUDIT LOG (non-blocking) ========== */
  try {
    await prisma.auditLog.create({
      data: {
        actorId: adminUserId,
        action: "VERIFIED_PAYMENT" as any,
        description: `Admin marked 1 payout row (${tx.transactionNumber}) as paid. Booking ${tx.booking.bookingNumber}. Recipient: ${(recipient.firstName ?? "") + " " + (recipient.lastName ?? "") || recipient.email}. PaidAt: ${paidAt.toISOString()}.`,
        targetUserId: recipient.id,
      },
    });
  } catch (err) {
    console.error("[markAsPaid audit log non-blocking fail]:", err);
  }

  return {
    bookingId: tx.bookingId,
    bookingNumber: tx.booking.bookingNumber,
    transactionNumber: tx.transactionNumber,
    rowsPaid,
    paidAt: paidAt.toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/*                         MARK REFUND AS REFUNDED (ADMIN ACTION)            */
/* -------------------------------------------------------------------------- */

export async function markAsRefunded(transactionId: string, adminUserId: string) {
  if (typeof transactionId !== "string" || transactionId.trim().length === 0) {
    throw new BadRequestError("Transaction id required.");
  }
  if (typeof adminUserId !== "string" || adminUserId.trim().length === 0) {
    throw new ForbiddenError("Admin identity missing.");
  }

  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      booking: {
        include: { disputes: true, guest: true },
      },
    },
  });
  if (!tx) throw new NotFoundError("Transaction not found.");

  // 1. Type guard: must be REFUND.
  if (tx.type !== TransactionType.REFUND) {
    throw new BadRequestError(
      `Only refund rows can be marked as refunded. Row type is '${tx.type}'.`
    );
  }
  // 2. Double-process guard.
  if (tx.status !== TransactionStatus.PENDING) {
    throw new BadRequestError(`Refund already ${tx.status.toLowerCase()}. Cannot process again.`);
  }
  // 3. Booking must be CANCELLED (refund only applies to cancelled bookings).
  if (tx.booking.status !== "CANCELLED") {
    throw new BadRequestError(
      `Booking ${tx.booking.bookingNumber} is status='${tx.booking.status}'. Refund can only be released on cancelled bookings.`
    );
  }
  // 4. No active disputes.
  const hasActiveDispute = tx.booking.disputes.some(
    (d) => d.status === "OPEN" || d.status === "UNDER_REVIEW"
  );
  if (hasActiveDispute) {
    const openDp = tx.booking.disputes.find(
      (d) => d.status === "OPEN" || d.status === "UNDER_REVIEW"
    )!;
    throw new BadRequestError(
      `Dispute ${openDp.disputeNumber} is still open. Refund cannot be released until disputes are settled.`
    );
  }

  const refundedAt = new Date();
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: TransactionStatus.SUCCESSFUL, paidAt: refundedAt },
  });

  /* ========== NOTIFY GUEST REFUND COMPLETE ========== */
  try {
    if (tx.booking.guestId) {
      await prisma.notification.create({
        data: {
          userId: tx.booking.guestId,
          type: "REFUND_PROCESSED",
          title: "Refund Complete",
          body: `Your ${Number(tx.amount).toLocaleString("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0,
          })} refund for booking ${tx.booking.bookingNumber} has been processed. It should appear in your bank account in 3-5 business days.`,
          bookingId: tx.bookingId,
        },
      });
    }
  } catch (err) {
    console.error("[markRefunded notification non-blocking fail]:", err);
  }

  /* ========== AUDIT LOG (non-blocking) ========== */
  try {
    await prisma.auditLog.create({
      data: {
        actorId: adminUserId,
        action: "VERIFIED_PAYMENT" as any,
        description: `Admin marked refund ${tx.transactionNumber} as refunded. Booking ${tx.booking.bookingNumber}. RefundedAt: ${refundedAt.toISOString()}.`,
        targetUserId: tx.booking.guestId,
      },
    });
  } catch (err) {
    console.error("[markRefunded audit log non-blocking fail]:", err);
  }

  return {
    bookingId: tx.bookingId,
    bookingNumber: tx.booking.bookingNumber,
    refundedAt: refundedAt.toISOString(),
  };
}




/*                                 HELPERS                                    */

function nullCoalesceDash(value: string | null | undefined): string {
  return value && value.length > 0 ? value : "—";
}

function lowerCaseType(type: TransactionType): AdminTransaction["type"] {
  // TransactionType = PAYMENT | REFUND | PAYOUT  [uppercase Prisma enum]
  // AdminTransaction.type = payment | refund  | payout  [lowercase frontend literal]
  switch (type) {
    case TransactionType.PAYMENT: return "payment";
    case TransactionType.PAYOUT:  return "payout";
    case TransactionType.REFUND:  return "refund";
  }
}

function parseTypeParam(raw?: string): TransactionType | undefined {
  if (!raw) return undefined;
  switch (raw.trim().toUpperCase()) {
    case "PAYMENT": return TransactionType.PAYMENT;
    case "PAYOUT":  return TransactionType.PAYOUT;
    case "REFUND":  return TransactionType.REFUND;
    default:
      throw new BadRequestError(
        `Invalid transaction type: '${raw}'. Expected 'payment' | 'payout' | 'refund'`
      );
  }
}

function parseStatusParam(raw?: string): TransactionStatus | undefined {
  if (!raw) return undefined;
  switch (raw.trim().toUpperCase()) {
    case "":           // empty string = all
    case "ALL":        // Frontend Status: All dropdown literal / URL query param
    case "*":          // common wildcard
      return undefined; // no WHERE filter = return all statuses
    case "PENDING":    return TransactionStatus.PENDING;
    case "SUCCESSFUL": return TransactionStatus.SUCCESSFUL;
    case "FAILED":     return TransactionStatus.FAILED;
    default:
      throw new BadRequestError(
        `Invalid transaction status: '${raw}'. Expected one of: ALL | PENDING | SUCCESSFUL | FAILED.`
      );
  }
}