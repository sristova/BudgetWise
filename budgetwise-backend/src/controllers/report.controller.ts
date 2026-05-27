// src/controllers/report.controller.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  getMonthlyReportService,
  getYearlyReportService,
  getTrendsService,
  getStatisticsService,
} from '../services/report.service';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const monthlySchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/, 'Leto mora biti 4-mestno število')
    .transform(Number)
    .refine((y) => y >= 2000 && y <= 2100, 'Neveljavno leto'),
  month: z
    .string()
    .regex(/^(1[0-2]|[1-9])$/, 'Mesec mora biti med 1 in 12')
    .transform(Number),
});

const yearlySchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/, 'Leto mora biti 4-mestno število')
    .transform(Number)
    .refine((y) => y >= 2000 && y <= 2100, 'Neveljavno leto'),
});

const categorySchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/)
    .transform(Number)
    .refine((y) => y >= 2000 && y <= 2100),
  month: z
    .string()
    .regex(/^(1[0-2]|[1-9])$/)
    .transform(Number),
  type: z.enum(['INCOME', 'EXPENSE']).optional().default('EXPENSE'),
});

const trendsSchema = z.object({
  months: z
    .string()
    .optional()
    .default('6')
    .transform(Number)
    .refine((m) => m >= 2 && m <= 24, 'Meseci mora biti med 2 in 24'),
});

const statisticsSchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/)
    .transform(Number)
    .refine((y) => y >= 2000 && y <= 2100),
  month: z
    .string()
    .regex(/^(1[0-2]|[1-9])$/)
    .transform(Number),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function getUserId(req: Request): string {
  // AuthContext attaches user from JWT middleware
  const userId = (req as Request & { user?: { id: string } }).user?.id;
  if (!userId) throw new Error('Unauthenticated');
  return userId;
}

function success<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

function validationError(res: Response, error: z.ZodError) {
  return res.status(400).json({
    success: false,
    message: 'Neveljavni parametri',
    errors: error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  });
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/reports/monthly?year=2025&month=6
 * Returns full monthly report with categories, comparisons, biggest expense
 */
export async function getMonthlyReport(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = monthlySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);

  const userId = getUserId(req);
  const { year, month } = parsed.data;

  const data = await getMonthlyReportService(userId, year, month);
  return success(res, data);
}

/**
 * GET /api/v1/reports/yearly?year=2025
 * Returns full yearly breakdown month by month
 */
export async function getYearlyReport(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = yearlySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);

  const userId = getUserId(req);
  const { year } = parsed.data;

  const data = await getYearlyReportService(userId, year);
  return success(res, data);
}

/**
 * GET /api/v1/reports/categories?year=2025&month=6&type=EXPENSE
 * Returns category breakdown for a specific month
 */
export async function getCategoryBreakdown(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = categorySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);

  const userId = getUserId(req);
  const { year, month, type } = parsed.data;

  // Re-use monthly report service but return only categories
  const report = await getMonthlyReportService(userId, year, month);
  return success(res, {
    period: report.period,
    categories: report.categories,
    type,
  });
}

/**
 * GET /api/v1/reports/trends?months=6
 * Returns multi-month trends for charts
 */
export async function getTrends(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = trendsSchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);

  const userId = getUserId(req);
  const { months } = parsed.data;

  const data = await getTrendsService(userId, months);
  return success(res, data);
}

/**
 * GET /api/v1/reports/statistics?year=2025&month=6
 * Returns comprehensive statistics overview for the statistics screen
 */
export async function getStatistics(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = statisticsSchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);

  const userId = getUserId(req);
  const { year, month } = parsed.data;

  const data = await getStatisticsService(userId, year, month);
  return success(res, data);
}