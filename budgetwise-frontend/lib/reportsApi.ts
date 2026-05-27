// lib/reportsApi.ts
// Drop-in addition to existing api.ts — extends reportsApi with all new endpoints

import { api } from './api';
import type {
  MonthlyReportData,
  YearlyReportData,
  TrendsData,
  StatisticsData,
  CategoryStat,
} from '../types/report.ts';

// ─── Reports API ──────────────────────────────────────────────────────────────

export const reportsApi = {
  /**
   * Full monthly report — summary, categories, biggest expense, comparison
   */
  async getMonthly(year: number, month: number): Promise<MonthlyReportData> {
    const res = await api.get('/reports/monthly', { params: { year, month } });
    return res.data.data;
  },

  /**
   * Full yearly report — monthly breakdown, top categories, best/worst month
   */
  async getYearly(year: number): Promise<YearlyReportData> {
    const res = await api.get('/reports/yearly', { params: { year } });
    return res.data.data;
  },

  /**
   * Category breakdown for a specific month (pie chart data)
   */
  async getCategories(
    year: number,
    month: number,
    type: 'INCOME' | 'EXPENSE' = 'EXPENSE',
  ): Promise<{ period: { year: number; month: number; label: string }; categories: CategoryStat[]; type: string }> {
    const res = await api.get('/reports/categories', { params: { year, month, type } });
    return res.data.data;
  },

  /**
   * Multi-month trends for line/bar charts
   */
  async getTrends(months: number = 6): Promise<TrendsData> {
    const res = await api.get('/reports/trends', { params: { months } });
    return res.data.data;
  },

  /**
   * Full statistics overview for the statistics screen
   */
  async getStatistics(year: number, month: number): Promise<StatisticsData> {
    const res = await api.get('/reports/statistics', { params: { year, month } });
    return res.data.data;
  },
};