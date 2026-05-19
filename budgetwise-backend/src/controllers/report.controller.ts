// src/controllers/report.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { success } from '../lib/response';

export async function getMonthlyReport(req: Request, res: Response) {
  const { year, month } = z.object({
    year: z.coerce.number().int().min(2020).max(2100),
    month: z.coerce.number().int().min(1).max(12),
  }).parse(req.query);

  const userId = req.user!.id;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const [byType, byCategory, dailySpending] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where: { userId, date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    }),
    // Daily breakdown using raw SQL for efficiency
    prisma.$queryRaw<{ day: string; income: number; expense: number }[]>`
      SELECT
        DATE(date)::text as day,
        SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE user_id = ${userId}
        AND date >= ${startDate}
        AND date <= ${endDate}
      GROUP BY DATE(date)
      ORDER BY DATE(date)
    `,
  ]);

  return success(res, {
    period: { year, month, startDate, endDate },
    summary: {
      totalIncome: Number(byType.find(t => t.type === 'INCOME')?._sum.amount ?? 0),
      totalExpenses: Number(byType.find(t => t.type === 'EXPENSE')?._sum.amount ?? 0),
      transactionCount: byType.reduce((acc, t) => acc + t._count, 0),
    },
    byCategory,
    dailySpending,
  });
}

export async function getYearlyReport(req: Request, res: Response) {
  const { year } = z.object({ year: z.coerce.number().int().min(2020).max(2100) }).parse(req.query);
  const userId = req.user!.id;

  const monthlyData = await prisma.$queryRaw<{ month: number; income: number; expense: number }[]>`
    SELECT
      EXTRACT(MONTH FROM date)::int as month,
      SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense
    FROM transactions
    WHERE user_id = ${userId}
      AND EXTRACT(YEAR FROM date) = ${year}
    GROUP BY EXTRACT(MONTH FROM date)
    ORDER BY month
  `;

  return success(res, { year, monthly: monthlyData });
}

export async function getCategoryBreakdown(req: Request, res: Response) {
  const { startDate, endDate } = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).parse(req.query);

  const userId = req.user!.id;

  const breakdown = await prisma.transaction.groupBy({
    by: ['categoryId', 'type'],
    where: {
      userId,
      date: { gte: new Date(startDate), lte: new Date(endDate) },
    },
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
  });

  return success(res, breakdown);
}
