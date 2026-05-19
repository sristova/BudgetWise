// src/controllers/transaction.controller.ts
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { success, created, noContent, paginated, buildPaginationMeta } from '../lib/response';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
} from '../validators/transaction.validator';

export async function getTransactions(req: Request, res: Response) {
  const userId = req.user!.id;
  const query = transactionQuerySchema.parse(req.query);

  const { page, limit, type, categoryId, startDate, endDate, search, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  // Build dynamic where clause
  const where: Prisma.TransactionWhereInput = {
    userId,
    ...(type && { type }),
    ...(categoryId && { categoryId }),
    ...(startDate || endDate
      ? {
          date: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) }),
          },
        }
      : {}),
    ...(search && {
      description: { contains: search, mode: 'insensitive' },
    }),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return paginated(res, transactions, buildPaginationMeta(page, limit, total));
}

export async function getTransaction(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user!.id;

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!transaction) throw new NotFoundError('Transaction');
  if (transaction.userId !== userId) throw new ForbiddenError();

  return success(res, transaction);
}

export async function createTransaction(req: Request, res: Response) {
  const userId = req.user!.id;
  const data = createTransactionSchema.parse(req.body);

  const transaction = await prisma.transaction.create({
    data: {
      ...data,
      userId,
      amount: data.amount,
      date: new Date(data.date),
    },
    include: { category: { select: { id: true, name: true, icon: true, color: true } } },
  });

  return created(res, transaction);
}

export async function updateTransaction(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user!.id;

  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Transaction');
  if (existing.userId !== userId) throw new ForbiddenError();

  const data = updateTransactionSchema.parse(req.body);

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...data,
      ...(data.date && { date: new Date(data.date) }),
    },
    include: { category: { select: { id: true, name: true, icon: true, color: true } } },
  });

  return success(res, updated);
}

export async function deleteTransaction(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user!.id;

  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Transaction');
  if (existing.userId !== userId) throw new ForbiddenError();

  await prisma.transaction.delete({ where: { id } });
  return noContent(res);
}

export async function getDashboardSummary(req: Request, res: Response) {
  const userId = req.user!.id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    currentMonthStats,
    lastMonthStats,
    recentTransactions,
    topCategories,
    goals,
  ] = await Promise.all([
    // Current month totals
    prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
      _count: true,
    }),
    // Last month totals
    prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, date: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _sum: { amount: true },
    }),
    // Recent 5 transactions
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 5,
      include: { category: { select: { name: true, icon: true, color: true } } },
    }),
    // Top spending categories this month
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type: 'EXPENSE', date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    }),
    // Active goals
    prisma.goal.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { deadline: 'asc' },
      take: 3,
    }),
  ]);

  const income = currentMonthStats.find(s => s.type === 'INCOME')?._sum.amount ?? 0;
  const expenses = currentMonthStats.find(s => s.type === 'EXPENSE')?._sum.amount ?? 0;
  const lastIncome = lastMonthStats.find(s => s.type === 'INCOME')?._sum.amount ?? 0;
  const lastExpenses = lastMonthStats.find(s => s.type === 'EXPENSE')?._sum.amount ?? 0;

  return success(res, {
    currentMonth: {
      income: Number(income),
      expenses: Number(expenses),
      balance: Number(income) - Number(expenses),
      incomeChange: lastIncome ? ((Number(income) - Number(lastIncome)) / Number(lastIncome)) * 100 : 0,
      expensesChange: lastExpenses ? ((Number(expenses) - Number(lastExpenses)) / Number(lastExpenses)) * 100 : 0,
    },
    recentTransactions,
    topCategories,
    goals,
  });
}
