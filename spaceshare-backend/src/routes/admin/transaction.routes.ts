import { Router } from 'express';
import {
  getTransactions,
  getTransactionDetail,
  markTransactionPaid,
  markTransactionRefunded,
} from '../../controllers/admin/transaction.controller';

const adminTransactionRoutes = Router();

/*  List + paginate + filter + search + sort  */
adminTransactionRoutes.get('/', getTransactions);

/*  Detail dialog payload  */
adminTransactionRoutes.get('/:id', getTransactionDetail);

/*  Admin actions  (requireAdmin already applied at router root) */
adminTransactionRoutes.post('/:id/mark-as-paid', markTransactionPaid);
adminTransactionRoutes.post('/:id/mark-as-refunded', markTransactionRefunded);

export default adminTransactionRoutes;