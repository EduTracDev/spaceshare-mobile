import { Prisma, TransactionStatus, TransactionType } from "@prisma/client";

export type TransactionQuerySortBy =
  | "bookingNumber"
  | "transactionNumber"
  | "recipientName"
  | "spaceName"
  | "eventDate"
  | "transactionDate"
  | "dateCancelled"
  | "amount"
  | "commission"
  | "netPayout"
  | "status";

  export interface ListTransactionsParams {
  /** Lowercase 3-literal from frontend. Backend normalizes to Prisma enum UPPERCASE. */
  type?: "payment" | "payout" | "refund";
  /** Raw Prisma DB status (UPPERCASE) — frontend sends FILTER_TO_DB mapped. */
  status?: "PENDING" | "SUCCESSFUL" | "FAILED";
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: TransactionQuerySortBy;
  sortOrder?: "asc" | "desc";
}

/* Payload shape returned 1:1 matches frontend simplified Transaction interface
   (after step A1 types refactor accepted earlier). */
export interface AdminTransaction {
  id: string;
  type: "payment" | "payout" | "refund";
  bookingNumber: string;
  transactionNumber: string;
  spaceName: string;
  bookingStatus:
    | "PENDING"
    | "APPROVED"
    | "DECLINED"
    | "PAID"
    | "COMPLETED"
    | "CANCELLED";
  eventDate: string;
  transactionDate: string;
  amount: number;
  commission: number;
  netPayout: number;
  purpose: string;
  /** RAW DB enum 3 statuses — frontend maps badge 1:1, no derivation. */
  dbStatus: "PENDING" | "SUCCESSFUL" | "FAILED";
  /**
   * Recipient = the USER on the receiving END of the cash movement.
   *
   *   PAYMENT  → NULL (money goes INTO SpaceShare corporate holding account.
   *             No user recipient. Dialog payment details: NO bank card (Figma 1&2).
   *   PAYOUT   → HOST or GUEST (money out). Dialog has recipient bank card (Figma 3).
   *   REFUND   → GUEST (cancelled booking cash back). Dialog has bank card (Figma 4).
   */
  recipientRole: "HOST" | "GUEST" | null;
  recipientName: string | null;
  recipientEmail: string | null;
  /**
   * Counter-party identity = other side of transaction (Payments Tab "Name" column
   * displays the Guest who paid us, since recipient is NULL platform account).
   * Always populated regardless of type.
   */
  counterpartyRole: "HOST" | "GUEST";
  counterpartyName: string;
  counterpartyEmail: string;
  host: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  guest?: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  breakdown: {
    grossBookingAmount: number;
    platformCommission: number;
    refundableCautionFee: number;
    netPayoutHost: number;
    refundAmountToGuest?: number;
    amountWithheldByPlatform?: number;
  };
  cancellation?: {
    byId: string;
    byName: string;
    byEmail: string;
    byRole: "HOST" | "GUEST" | "ADMIN";
    timestamp: string;
    reason: string;
  };
  refund?: {
    hostPayoutAmount: number;
    refundAmount: number;
    refundedAt?: string;
  };
}

/* Deep join graph used everywhere (list + details). Same include statement avoids N+1. */
export const txInclude = Prisma.validator<Prisma.TransactionInclude>()({
  booking: {
    include: {
      listing: {
        include: {
          host: {
            include: {
              bankAccount: true,
            },
          },
        },
      },
      guest: {
        include: {
          bankAccount: true,
        },
      },
      cancelledBy: true,
    },
  },
  recipient: true,
});

export type TxRow = Prisma.TransactionGetPayload<{ include: typeof txInclude }>;

/* Priority used only for sortBy='status' to make PENDING rows top of page
   (financial triage order). 3 values ONLY — no more 8-priority 7-status matrix. */
export const STATUS_PRIORITY: Record<TransactionStatus, number> = {
  [TransactionStatus.PENDING]: 1,
  [TransactionStatus.FAILED]: 2,
  [TransactionStatus.SUCCESSFUL]: 3,
};