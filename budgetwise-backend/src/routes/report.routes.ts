// src/routes/report.routes.ts
import { Router } from 'express';
import { getMonthlyReport, getYearlyReport, getCategoryBreakdown } from '../controllers/report.controller';
const router = Router();
router.get('/monthly', getMonthlyReport);
router.get('/yearly', getYearlyReport);
router.get('/categories', getCategoryBreakdown);
export default router;
