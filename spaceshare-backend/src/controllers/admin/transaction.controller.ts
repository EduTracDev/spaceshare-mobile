import { NextFunction, Request, Response } from 'express';
import {
  listTransactions,
  getTransactionById,
  markPayoutsAsPaid,
  markAsRefunded,
} from '../../services/admin/transaction.service';
import { BadRequestError } from '../../errors';
import { AuthRequest } from '../../middleware/auth.middleware';

/**
 * GET /api/admin/transactions
 * Paginated list with type (3 values: PAYMENT/PAYOUT/REFUND), raw DB status
 * (PENDING/SUCCESSFUL/FAILED), search (across booking number/transaction number/
 * recipient names/email), and sort by 12 sortable columns. No more 7-status decoder.
 */
export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 10)));

  // If frontend URL sync or Status: All dropdown sends literal 'all' → treat as NO filter (undefined).
  // Otherwise pass the raw value through to service parser for strict enum validation.
  const rawType = typeof req.query.type === "string" ? req.query.type.trim() : "";
  const type =
    (rawType === "" || rawType.toLowerCase() === "all"
      ? undefined
      : rawType) as "payment" | "payout" | "refund" | undefined;

  const rawStatus = typeof req.query.status === "string" ? req.query.status.trim() : "";
  const status = (
    rawStatus === "" || rawStatus.toLowerCase() === "all"
      ? undefined
      : rawStatus
  ) as "PENDING" | "SUCCESSFUL" | "FAILED" | undefined;

  const search = req.query.search ? String(req.query.search) : undefined;
  const sortBy = (req.query.sortBy as any) ?? 'transactionDate';
  const sortOrder = (req.query.sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  try {
    const result = await listTransactions({
      page,
      pageSize,
      type,
      status,
      search,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      message: 'Transactions fetched successfully',
      data: {
        items: result.items,
        total: result.total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.log("error:", error);
    next(error);
  }
};

/**
 * GET /api/admin/transactions/:id
 * Single transaction detail (shaped into frontend Transaction DTO dialog payload).
 */
export const getTransactionDetail = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || typeof(id) !== 'string' || id.length === 0) throw new BadRequestError('Transaction id is required');
  const data = await getTransactionById(id);
  return res.status(200).json({ success: true, message: 'Transaction fetched', data });
};

/**
 * POST /api/admin/transactions/:id/mark-as-paid
 * Admin action — batch settles ALL pending payout rows for the booking associated
 * with this transaction id (hybrid 2-row plan: host net + caution refund to guest).
 * 5 ironclad guards enforced in service layer.
 */
export const markTransactionPaid = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!id || typeof(id) !== 'string' || id.length === 0) throw new BadRequestError('Transaction id is required');
  const adminUserId = req.userId;
  if (!adminUserId) throw new BadRequestError('Authenticated admin userId missing');
  const result = await markPayoutsAsPaid(id, adminUserId);
  return res.status(200).json({
    success: true,
    message: `Payouts settled: ${result.rowsPaid} row(s) paid for booking ${result.bookingNumber}.`,
    data: result,
  });
};

/**
 * POST /api/admin/transactions/:id/mark-as-refunded
 * Admin action — mark a single REFUND row as SUCCESSFUL (offline bank transfer done).
 */
export const markTransactionRefunded = async (req:AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!id || typeof(id) !== 'string' || id.length === 0) throw new BadRequestError('Transaction id is required');
  const adminUserId = req.userId;
  if (!adminUserId) throw new BadRequestError('Authenticated admin userId missing');
  const result = await markAsRefunded(id, adminUserId);
  return res.status(200).json({
    success: true,
    message: `Refund for booking ${result.bookingNumber} processed successfully. RefundedAt: ${result.refundedAt}.`,
    data: result,
  });
};