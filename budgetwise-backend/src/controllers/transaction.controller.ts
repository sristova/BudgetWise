// src/controllers/transaction.controller.ts
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { success, created, noContent, paginated, buildPaginationMeta } from '../lib/response';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import { generateTransactionsPdf } from '../lib/pdf';
import { budgetAlertEmail, sendMail } from '../lib/mail';
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

  // Preveri budget alert samo za stroške
  if (transaction.type === 'EXPENSE') {
    await checkBudgetAlert(userId, transaction.categoryId ?? undefined);
  }

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

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);

  const [
    currentMonthStats,
    lastMonthStats,
    recentTransactions,
    topCategories,
    goals,
    categories,
    weeklyTransactions,
  ] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, date: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 5,
      include: { category: { select: { name: true, icon: true, color: true } } },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type: 'EXPENSE', date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    }),
    prisma.goal.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { deadline: 'asc' },
      take: 3,
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    }),
    prisma.transaction.findMany({
      where: { userId, type: 'EXPENSE', date: { gte: startOfWeek } },
      select: { amount: true, date: true },
    }),
  ]);

  const income = currentMonthStats.find(s => s.type === 'INCOME')?._sum.amount ?? 0;
  const expenses = currentMonthStats.find(s => s.type === 'EXPENSE')?._sum.amount ?? 0;
  const lastIncome = lastMonthStats.find(s => s.type === 'INCOME')?._sum.amount ?? 0;
  const lastExpenses = lastMonthStats.find(s => s.type === 'EXPENSE')?._sum.amount ?? 0;

  const weeklySpending = [0, 0, 0, 0, 0, 0, 0];
  for (const tx of weeklyTransactions) {
    const txDate = new Date(tx.date);
    const dayIndex = (txDate.getDay() + 6) % 7;
    weeklySpending[dayIndex] += Number(tx.amount);
  }

  return success(res, {
    currentMonth: {
      income: Number(income),
      expenses: Number(expenses),
      balance: Number(income) - Number(expenses),
      incomeChange: lastIncome ? ((Number(income) - Number(lastIncome)) / Number(lastIncome)) * 100 : 0,
      expensesChange: lastExpenses ? ((Number(expenses) - Number(lastExpenses)) / Number(lastExpenses)) * 100 : 0,
    },
    weeklySpending,
    recentTransactions,
    topCategories,
    goals,
    categories,
  });
}

export async function exportTransactionsPdf(req: Request, res: Response) {
  const userId = req.user!.id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [transactions, user] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
      orderBy: { date: 'desc' },
      include: { category: { select: { name: true, icon: true } } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, currency: true },
    }),
  ]);

  if (!user) throw new NotFoundError('User');

  const month = now.toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });

  generateTransactionsPdf(
    res,
    transactions.map(t => ({
      ...t,
      amount: Number(t.amount),
      currency: t.currency.toString(),
    })),
    { ...user, currency: user.currency.toString() },
    month
  );
}

// ─── Budget alert helper ──────────────────────────────────────────────────────

async function checkBudgetAlert(userId: string, categoryId?: string) {
  // Preveri preference — če notifyBudget ni vklopljen, končaj
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      currency: true,
      notifyBudget: true,
    },
  });
  if (!user?.notifyBudget) return;

  const now = new Date();

  // Poišči aktivne proračune za to kategorijo (ali vse)
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      isActive: true,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
      ...(categoryId ? { categoryId } : {}),
    },
    include: { category: { select: { name: true, icon: true } } },
  });

  for (const budget of budgets) {
    const periodStart = getPeriodStart(budget.period, now);

    const spent = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'EXPENSE',
        categoryId: budget.categoryId ?? undefined,
        date: { gte: periodStart, lte: now },
      },
      _sum: { amount: true },
    });

    const spentAmount = parseFloat(spent._sum.amount?.toString() ?? '0');
    const budgetAmount = parseFloat(budget.amount.toString());
    const alertThreshold = parseFloat(budget.alertAt.toString()) / 100;
    const usageRatio = spentAmount / budgetAmount;

    if (usageRatio < alertThreshold) continue;

    // Prepreči duplikat — ne pošlji če smo danes že poslali za ta proračun
    const alreadySent = await prisma.notification.findFirst({
      where: {
        userId,
        type: 'BUDGET_ALERT',
        data: { path: ['budgetId'], equals: budget.id },
        createdAt: { gte: startOfDay(now) },
      },
    });
    if (alreadySent) continue;

    const pct = Math.round(usageRatio * 100);
    const isOver = usageRatio >= 1;
    const categoryName = budget.category?.name ?? budget.name;
    const categoryIcon = budget.category?.icon ?? '💰';

    // Shrani in-app notifikacijo
    await prisma.notification.create({
      data: {
        userId,
        type: 'BUDGET_ALERT',
        title: isOver ? `Proračun prekoračen: ${categoryIcon} ${categoryName}` : `Opozorilo proračuna: ${categoryIcon} ${categoryName}`,
        body: `Porabili ste ${pct}% proračuna za ${categoryName}.`,
        data: { budgetId: budget.id, usagePercent: pct },
        sentAt: new Date(),
      },
    });

    // Pošlji email (notifyBudget je že preverjen zgoraj)
    const { subject, html } = budgetAlertEmail({
      firstName: user.firstName,
      budgetName: budget.name,
      categoryName,
      categoryIcon,
      spent: spentAmount,
      limit: budgetAmount,
      percentage: pct,
      currency: user.currency,
    });
    await sendMail({ to: user.email, subject, html });
  }
}

function getPeriodStart(period: string, now: Date): Date {
  const d = new Date(now);
  switch (period) {
    case 'DAILY':
      d.setHours(0, 0, 0, 0);
      return d;
    case 'WEEKLY':
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      d.setHours(0, 0, 0, 0);
      return d;
    case 'YEARLY':
      return new Date(d.getFullYear(), 0, 1);
    case 'MONTHLY':
    default:
      return new Date(d.getFullYear(), d.getMonth(), 1);
  }
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
