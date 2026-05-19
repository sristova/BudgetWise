// src/controllers/budget.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { success, created, noContent } from '../lib/response';
import { NotFoundError, ForbiddenError } from '../lib/errors';

const budgetSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF', 'HRK', 'RSD', 'BAM']).optional(),
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  alertAt: z.number().min(1).max(100).optional(),
});

export async function getBudgets(req: Request, res: Response) {
  const userId = req.user!.id;
  const now = new Date();

  const budgets = await prisma.budget.findMany({
    where: { userId, isActive: true },
    include: { category: { select: { name: true, icon: true, color: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // Attach current spending to each budget
  const budgetsWithSpending = await Promise.all(
    budgets.map(async (b) => {
      const periodStart = b.period === 'MONTHLY'
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(b.startDate);

      const spending = await prisma.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          ...(b.categoryId && { categoryId: b.categoryId }),
          date: { gte: periodStart },
        },
        _sum: { amount: true },
      });

      const spent = Number(spending._sum.amount ?? 0);
      const percentage = (spent / Number(b.amount)) * 100;

      return { ...b, spent, percentage: Math.min(percentage, 100) };
    }),
  );

  return success(res, budgetsWithSpending);
}

export async function createBudget(req: Request, res: Response) {
  const data = budgetSchema.parse(req.body);
  const budget = await prisma.budget.create({
    data: {
      ...data,
      userId: req.user!.id,
      startDate: new Date(data.startDate),
      ...(data.endDate && { endDate: new Date(data.endDate) }),
    },
    include: { category: { select: { name: true, icon: true, color: true } } },
  });
  return created(res, budget);
}

export async function updateBudget(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.budget.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Budget');
  if (existing.userId !== req.user!.id) throw new ForbiddenError();

  const data = budgetSchema.partial().parse(req.body);
  const budget = await prisma.budget.update({
    where: { id },
    data: {
      ...data,
      ...(data.startDate && { startDate: new Date(data.startDate) }),
      ...(data.endDate && { endDate: new Date(data.endDate) }),
    },
  });
  return success(res, budget);
}

export async function deleteBudget(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.budget.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Budget');
  if (existing.userId !== req.user!.id) throw new ForbiddenError();
  await prisma.budget.delete({ where: { id } });
  return noContent(res);
}
