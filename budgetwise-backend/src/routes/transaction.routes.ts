// src/routes/transaction.routes.ts
import { Router } from 'express';
import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getDashboardSummary,
} from '../controllers/transaction.controller';

const router = Router();

router.get('/dashboard', getDashboardSummary);
router.get('/', getTransactions);
router.get('/:id', getTransaction);
router.post('/', createTransaction);
router.patch('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
