// ─── Query Params ────────────────────────────────────────────────────────────

export interface MonthlyReportParams {
  year: number;
  month: number; // 1–12
}

export interface YearlyReportParams {
  year: number;
}

export interface CategoryBreakdownParams {
  year: number;
  month: number;
  type?: 'INCOME' | 'EXPENSE';
}

export interface TrendsParams {
  months?: number; // default 6
}

export interface StatisticsParams {
  year: number;
  month: number;
}

// ─── Category ────────────────────────────────────────────────────────────────

export interface CategoryStat {
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  total: number;
  count: number;
  percentage: number;
  avgTransaction: number;
}

// ─── Monthly Report ──────────────────────────────────────────────────────────

export interface MonthlyReportData {
  period: {
    year: number;
    month: number;
    label: string; // e.g. "Januar 2025"
  };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    savingsRate: number;
    transactionCount: number;
  };
  comparison: {
    incomeChange: number;       // % vs previous month
    expensesChange: number;     // % vs previous month
    savingsChange: number;      // % vs previous month
  };
  biggestExpense: {
    description: string;
    amount: number;
    categoryName: string;
    categoryIcon: string;
    date: string;
  } | null;
  averageDailySpend: number;
  categories: CategoryStat[];
}

// ─── Yearly Report ───────────────────────────────────────────────────────────

export interface MonthlyBreakdown {
  month: number;
  label: string;
  income: number;
  expenses: number;
  savings: number;
}

export interface YearlyReportData {
  year: number;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    savingsRate: number;
    avgMonthlyExpenses: number;
    avgMonthlyIncome: number;
  };
  monthlyBreakdown: MonthlyBreakdown[];
  topCategories: CategoryStat[];
  bestMonth: { month: number; label: string; savings: number } | null;
  worstMonth: { month: number; label: string; savings: number } | null;
}

// ─── Trends ──────────────────────────────────────────────────────────────────

export interface TrendPoint {
  month: number;
  year: number;
  label: string;   // "Jan", "Feb", ...
  income: number;
  expenses: number;
  savings: number;
}

export interface TrendsData {
  points: TrendPoint[];
  averageIncome: number;
  averageExpenses: number;
  averageSavings: number;
  trend: 'improving' | 'declining' | 'stable';
}

// ─── Statistics Overview ─────────────────────────────────────────────────────

export interface StatisticsData {
  currentMonth: {
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number;
    transactionCount: number;
  };
  previousMonth: {
    income: number;
    expenses: number;
    savings: number;
  };
  changes: {
    income: number;       // %
    expenses: number;     // %
    savings: number;      // %
  };
  topCategories: CategoryStat[];
  biggestExpense: {
    description: string;
    amount: number;
    categoryName: string;
    categoryIcon: string;
    date: string;
  } | null;
  weeklyAvgSpend: number;
  dailyAvgSpend: number;
  mostExpensiveDay: string | null;
}

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;