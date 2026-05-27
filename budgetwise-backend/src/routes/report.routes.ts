// src/routes/report.routes.ts
import { Router } from 'express';
import {
  getMonthlyReport,
  getYearlyReport,
  getCategoryBreakdown,
  getTrends,
  getStatistics,
} from '../controllers/report.controller';
const router = Router();

/**
 * GET /api/v1/reports/monthly?year=2025&month=6
 * Full monthly report: summary, categories, comparison, biggest expense
 */
router.get('/monthly', getMonthlyReport);

/**
 * GET /api/v1/reports/yearly?year=2025
 * Full yearly breakdown with monthly chart data
 */
router.get('/yearly', getYearlyReport);

/**
 * GET /api/v1/reports/categories?year=2025&month=6&type=EXPENSE
 * Category breakdown for pie chart
 */
router.get('/categories', getCategoryBreakdown);

/**
 * GET /api/v1/reports/trends?months=6
 * Multi-month trend data for line/bar charts
 */
router.get('/trends', getTrends);

/**
 * GET /api/v1/reports/statistics?year=2025&month=6
 * Full statistics overview (main statistics screen)
 */
router.get('/statistics', getStatistics);

export default router;