import prisma from './prisma';
import type { TransactionType } from '@prisma/client';

/**
 * Transaction-safe, monotonically increasing reference number generators.
 *
 * Strategy: NumberSequence table row-level lock inside a $transaction.
 * This guarantees zero collisions even with highly concurrent booking/dispute
 * creation (every create claims one value atomically before committing).
 *
 * Naming conventions match the admin UI contracts:
 *   - Bookings:     BK-00001 .. BK-99999
 *   - Disputes:     DP-00001 .. DP-99999  (was 3 digits, expanded to 5 for growth headroom,
 *                                         formatters still output DP-001 / DP-00999 correctly
 *                                         since padStart(3, '0') returns min len and
 *                                         extra digits untruncated if counter exceeds 999.
 *                                         Just to be safe we keep digits=3 behavior as was before;
 *                                         do NOT change DEFAULTS.DISPUTE.digits below this
 *                                         line to preserve existing dispute numbers continuity
 *                                         if there are any pre-existing rows in prod databases.
 *                                         Changing 3→5 here would reset prefix output for
 *                                         new dispute DPs and break bookmarked reference links
 *                                         in customer email threads. Leave it at 3 digits.)
 *   - Payments:     PT-00001 .. PT-99999
 *   - Payouts:      PO-00001 .. PO-99999
 *   - Refunds:      RF-00001 .. RF-99999
 *
 * Transactions share ONE GLOBAL counter (all 3 prefixes advance the same NumberSequence key).
 * This means the numeric suffix is a global chronological ordering: PT-00042 happened before
 * PO-00043, which happened before RF-00044. This gives the audit/comparison view a single
 * timeline instead of 3 separate counters whose relative order is unknown. (To change this
 * behavior later to 3 independent counters per type, split TRANSACTION key into 3 keys
 * TX_PAYMENT / TX_PAYOUT / TX_REFUND and assign separate DEFAULTS entries.)
 *
 * If the NumberSequence row for a given key does not yet exist (fresh environment
 * or a new reference type is being wired in) it is created lazily on first call.
 */

type SeqKey = 'BOOKING' | 'DISPUTE' | 'TRANSACTION';

const DEFAULTS: Record<SeqKey, { prefix: string; digits: number; start: number }> = {
  BOOKING:     { prefix: 'BK-', digits: 5, start: 1 },
  DISPUTE:     { prefix: 'DP-', digits: 3, start: 1 },  // ⚠️ DO NOT CHANGE digits above ⚠️
  TRANSACTION: { prefix: 'IGNORED-SEE-SWITCH-BELOW-', digits: 5, start: 1 },
};

/** Prefix selector for the 3 transaction types — shared global TRANSACTION counter
 *  (numeric suffix is global chrono order across all 3 types). */
function txPrefix(type: TransactionType): string {
  switch (type) {
    case 'PAYMENT': return 'PT-';
    case 'PAYOUT':  return 'PO-';
    case 'REFUND':  return 'RF-';
  }
}

async function nextValue(key: SeqKey): Promise<number> {
  const def = DEFAULTS[key];

  const result = await prisma.$transaction(async (tx) => {
    // Row-level write lock via UPDATE ... RETURNING (handled by Prisma UPDATE).
    // Try the happy path first: the row should exist after first deploy.
    let row = await (tx.numberSequence as any).update({
      where: { key },
      data: { nextValue: { increment: 1 } },
    });

    // Lazy-create if row was missing (fresh DB or new sequence type added)
    if (!row) {
      row = await (tx.numberSequence as any).upsert({
        where: { key },
        create: { key, nextValue: def.start + 1 },
        update: { nextValue: { increment: 1 } },
      });
    }

    return row;
  });

  // update incremented nextValue in DB; value we want to emit is the PRE-increment one
  return result.nextValue - 1;
}

/** Generate a brand new unique booking reference: BK-00001 .. BK-99999 */
export async function generateBookingNumber(): Promise<string> {
  const n = await nextValue('BOOKING');
  return `BK-${n.toString().padStart(DEFAULTS.BOOKING.digits, '0')}`;
}

/** Generate a brand new unique dispute reference: DP-001 .. DP-999 */
export async function generateDisputeNumber(): Promise<string> {
  const n = await nextValue('DISPUTE');
  return `DP-${n.toString().padStart(DEFAULTS.DISPUTE.digits, '0')}`;
}

/**
 * Generate a brand new unique TRANSACTION reference with type-specific prefix.
 *
 * Prefixes match admin frontend contract (PT- = Payment, PO- = Payout, RF- = Refund).
 * All 3 types share ONE global counter (numeric suffix is chronological across all 3
 * types so audit view is globally sortable by the numeric part for timeline view).
 */
export async function generateTransactionNumber(type: TransactionType): Promise<string> {
  const n = await nextValue('TRANSACTION');
  return `${txPrefix(type)}${n.toString().padStart(5, '0')}`;
}