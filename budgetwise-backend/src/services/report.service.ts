// src/services/report.service.ts
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type {
  MonthlyReportData,
  YearlyReportData,
  TrendsData,
  StatisticsData,
  CategoryStat,
  MonthlyBreakdown,
  TrendPoint,
} from '../types/report.types';


// Prevodni slovar: DB ime → slovensko ime za prikaz
const CATEGORY_DISPLAY: Record<string, string> = {
  'Food & Dining':  'Hrana in pijača',
  'Transport':      'Prevoz',
  'Entertainment':  'Zabava',
  'Health':         'Zdravje',
  'Shopping':       'Nakupovanje',
  'Housing':        'Stanovanje',
  'Education':      'Izobraževanje',
  'Salary':         'Plača',
  'Investment':     'Investicije',
  'Freelance':      'Freelance',
  'Other':          'Ostalo',
  // Slovenske že pravilne — pustimo kot so
};

function getCategoryLabel(name: string | undefined | null): string {
  if (!name) return 'Nekategorizirano';
  return CATEGORY_DISPLAY[name] ?? name;
}

// ─── Helpers 

const MONTH_LABELS_SL = [
  '', 'Januar', 'Februar', 'Marec', 'April', 'Maj', 'Junij',
  'Julij', 'Avgust', 'September', 'Oktober', 'November', 'December',
];

const MONTH_SHORT_SL = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
  'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec',
];

function toNumber(val: Prisma.Decimal | null | undefined): number {
  if (!val) return 0;
  return parseFloat(val.toString());
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return parseFloat((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

function getDateRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999); // last day of month
  return { start, end };
}

// ─── Core aggregation helpers ─────────────────────────────────────────────────

async function getMonthTotals(userId: string, year: number, month: number) {
  const { start, end } = getDateRange(year, month);

  // 1. Vzporedno pridobimo prihodke, stroške in DEJANSKE PRIHRANKE (Cilje)
  const [income, expenses, goalsSum] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId,
        type: 'INCOME',
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: true,
    }),
    // TUKAJ POTEGNEMO DEJANSKE PRIHRANKE: Seštejemo trenutne zneske na tvojih ciljih
    prisma.goal.aggregate({
      where: {
        userId,
        createdAt: { gte: start, lte: end }, // Prihranki ustvarjeni v tem mesecu
      },
      _sum: { currentAmount: true },
    }),
  ]);

  const totalIncome = toNumber(income._sum.amount);
  const totalExpenses = toNumber(expenses._sum.amount);
  
  // POPRAVEK: Neto prihranki so zdaj DEJANSKA vsota na tvojih ciljih, ne pa izračun z minusom!
  const netSavings = toNumber(goalsSum._sum.currentAmount);

  // Stopnja varčevanja glede na to, koliko prihodkov si dala dejansko na stran
  const savingsRate = totalIncome > 0
    ? parseFloat(((netSavings / totalIncome) * 100).toFixed(1))
    : 0;
    
  const transactionCount = income._count + expenses._count;

  return { totalIncome, totalExpenses, netSavings, savingsRate, transactionCount };
}

async function getCategoryStats(
  userId: string,
  year: number,
  month: number,
  type: 'INCOME' | 'EXPENSE' = 'EXPENSE',
): Promise<CategoryStat[]> {
  const { start, end } = getDateRange(year, month);

  // Raw grouped query for category totals
  const rows = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      type,
      date: { gte: start, lte: end },
    },
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
  });

  if (rows.length === 0) return [];

  // Fetch category details in one query
  const categoryIds = rows
    .map(r => r.categoryId)
    .filter((id): id is string => id !== null);

  const categories = categoryIds.length > 0
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, icon: true, color: true },
      })
    : [];

  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // Calculate total for percentage
  const grandTotal = rows.reduce((sum, r) => sum + toNumber(r._sum.amount), 0);

  return rows.map(row => {
    const cat = row.categoryId ? categoryMap.get(row.categoryId) : undefined;
    const total = toNumber(row._sum.amount);
    const count = row._count;

    return {
      categoryId: row.categoryId,
      categoryName: getCategoryLabel(cat?.name),
      categoryIcon: cat?.icon ?? '💰',
      categoryColor: cat?.color ?? '#A0263A',
      total,
      count,
      percentage: grandTotal > 0
        ? parseFloat(((total / grandTotal) * 100).toFixed(1))
        : 0,
      avgTransaction: count > 0
        ? parseFloat((total / count).toFixed(2))
        : 0,
    };
  });
}

// ─── Monthly Report ───────────────────────────────────────────────────────────

export async function getMonthlyReportService(
  userId: string,
  year: number,
  month: number,
): Promise<MonthlyReportData> {
  const { start, end } = getDateRange(year, month);

  // Previous month
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const [current, previous, categories, biggestExpense, dailyExpenses] =
    await Promise.all([
      getMonthTotals(userId, year, month),
      getMonthTotals(userId, prevYear, prevMonth),
      getCategoryStats(userId, year, month, 'EXPENSE'),

      // Biggest single expense
      prisma.transaction.findFirst({
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: start, lte: end },
        },
        orderBy: { amount: 'desc' },
        include: {
          category: { select: { name: true, icon: true } },
        },
      }),

      // For average daily spend calculation
      prisma.transaction.groupBy({
        by: ['date'],
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
    ]);

  // Average daily spend
  const daysInMonth = new Date(year, month, 0).getDate();
  const averageDailySpend = parseFloat(
    (current.totalExpenses / daysInMonth).toFixed(2),
  );

  return {
    period: {
      year,
      month,
      label: `${MONTH_LABELS_SL[month]} ${year}`,
    },
    summary: {
      totalIncome: current.totalIncome,
      totalExpenses: current.totalExpenses,
      netSavings: current.netSavings,
      savingsRate: current.savingsRate,
      transactionCount: current.transactionCount,
    },
    comparison: {
      incomeChange: percentChange(current.totalIncome, previous.totalIncome),
      expensesChange: percentChange(current.totalExpenses, previous.totalExpenses),
      savingsChange: percentChange(current.netSavings, previous.netSavings),
    },
    biggestExpense: biggestExpense
      ? {
          description: biggestExpense.description,
          amount: toNumber(biggestExpense.amount),
          categoryName: getCategoryLabel(biggestExpense.category?.name),
          categoryIcon: biggestExpense.category?.icon ?? '💰',
          date: biggestExpense.date.toISOString().split('T')[0],
        }
      : null,
    averageDailySpend,
    categories,
  };
}

// ─── Yearly Report ────────────────────────────────────────────────────────────

export async function getYearlyReportService(
  userId: string,
  year: number,
): Promise<YearlyReportData> {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59);

  // All transactions for the year grouped by month + type
  const monthlyRows = await prisma.$queryRaw<
    Array<{ month: number; type: string; total: string; count: bigint }>
  >`
    SELECT
      EXTRACT(MONTH FROM date)::int AS month,
      type,
      SUM(amount)::text             AS total,
      COUNT(*)                      AS count
    FROM transactions
    WHERE user_id = ${userId}
      AND date >= ${start}
      AND date <= ${end}
    GROUP BY month, type
    ORDER BY month
  `;

  // Build monthly breakdown
  const monthlyMap = new Map<number, { income: number; expenses: number }>();
  for (let m = 1; m <= 12; m++) {
    monthlyMap.set(m, { income: 0, expenses: 0 });
  }
  for (const row of monthlyRows) {
    const entry = monthlyMap.get(row.month)!;
    const amount = parseFloat(row.total);
    if (row.type === 'INCOME') entry.income += amount;
    else entry.expenses += amount;
  }

  const monthlyBreakdown: MonthlyBreakdown[] = [];
  let totalIncome = 0;
  let totalExpenses = 0;

  for (let m = 1; m <= 12; m++) {
    const entry = monthlyMap.get(m)!;
    const savings = entry.income - entry.expenses;
    totalIncome += entry.income;
    totalExpenses += entry.expenses;
    monthlyBreakdown.push({
      month: m,
      label: MONTH_SHORT_SL[m],
      income: parseFloat(entry.income.toFixed(2)),
      expenses: parseFloat(entry.expenses.toFixed(2)),
      savings: parseFloat(savings.toFixed(2)),
    });
  }

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0
    ? parseFloat(((netSavings / totalIncome) * 100).toFixed(1))
    : 0;

  // Best/worst month by savings
  const monthsWithData = monthlyBreakdown.filter(
    m => m.income > 0 || m.expenses > 0,
  );
  const bestMonth = monthsWithData.length > 0
    ? monthsWithData.reduce((a, b) => (a.savings >= b.savings ? a : b))
    : null;
  const worstMonth = monthsWithData.length > 0
    ? monthsWithData.reduce((a, b) => (a.savings <= b.savings ? a : b))
    : null;

  // Top categories for the whole year
  const catRows = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { userId, type: 'EXPENSE', date: { gte: start, lte: end } },
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
    take: 5,
  });

  const categoryIds = catRows
    .map(r => r.categoryId)
    .filter((id): id is string => id !== null);

  const categories = categoryIds.length > 0
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, icon: true, color: true },
      })
    : [];
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  const grandTotal = catRows.reduce((s, r) => s + toNumber(r._sum.amount), 0);

  const topCategories: CategoryStat[] = catRows.map(row => {
    const cat = row.categoryId ? categoryMap.get(row.categoryId) : undefined;
    const total = toNumber(row._sum.amount);
    return {
      categoryId: row.categoryId,
      categoryName: getCategoryLabel(cat?.name),
      categoryIcon: cat?.icon ?? '💰',
      categoryColor: cat?.color ?? '#A0263A',
      total,
      count: row._count,
      percentage: grandTotal > 0
        ? parseFloat(((total / grandTotal) * 100).toFixed(1))
        : 0,
      avgTransaction: row._count > 0
        ? parseFloat((total / row._count).toFixed(2))
        : 0,
    };
  });

  const activeMonths = monthsWithData.length || 1;

  return {
    year,
    summary: {
      totalIncome: parseFloat(totalIncome.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      netSavings: parseFloat(netSavings.toFixed(2)),
      savingsRate,
      avgMonthlyExpenses: parseFloat((totalExpenses / activeMonths).toFixed(2)),
      avgMonthlyIncome: parseFloat((totalIncome / activeMonths).toFixed(2)),
    },
    monthlyBreakdown,
    topCategories,
    bestMonth: bestMonth
      ? { month: bestMonth.month, label: MONTH_LABELS_SL[bestMonth.month], savings: bestMonth.savings }
      : null,
    worstMonth: worstMonth
      ? { month: worstMonth.month, label: MONTH_LABELS_SL[worstMonth.month], savings: worstMonth.savings }
      : null,
  };
}

// ─── Trends ───────────────────────────────────────────────────────────────────

export async function getTrendsService(
  userId: string,
  months: number = 6,
): Promise<TrendsData> {
  const now = new Date();
  const points: TrendPoint[] = [];

  // Fetch all months in parallel
  const monthPromises: Promise<Awaited<ReturnType<typeof getMonthTotals>>>[] = [];
  const monthMeta: Array<{ month: number; year: number; label: string }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    monthMeta.push({ month: m, year: y, label: MONTH_SHORT_SL[m] });
    monthPromises.push(getMonthTotals(userId, y, m));
  }

  const results = await Promise.all(monthPromises);

  for (let i = 0; i < monthMeta.length; i++) {
    const meta = monthMeta[i];
    const res = results[i];
    points.push({
      month: meta.month,
      year: meta.year,
      label: meta.label,
      income: res.totalIncome,
      expenses: res.totalExpenses,
      savings: res.netSavings,
    });
  }

  const avgIncome = points.reduce((s, p) => s + p.income, 0) / points.length;
  const avgExpenses = points.reduce((s, p) => s + p.expenses, 0) / points.length;
  const avgSavings = points.reduce((s, p) => s + p.savings, 0) / points.length;

  // Determine trend: compare last 2 vs first 2 savings
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (points.length >= 4) {
    const firstHalf = points.slice(0, 2).reduce((s, p) => s + p.savings, 0) / 2;
    const lastHalf = points.slice(-2).reduce((s, p) => s + p.savings, 0) / 2;
    const diff = lastHalf - firstHalf;
    if (diff > firstHalf * 0.05) trend = 'improving';
    else if (diff < -firstHalf * 0.05) trend = 'declining';
  }

  return {
    points,
    averageIncome: parseFloat(avgIncome.toFixed(2)),
    averageExpenses: parseFloat(avgExpenses.toFixed(2)),
    averageSavings: parseFloat(avgSavings.toFixed(2)),
    trend,
  };
}

// ─── Statistics Overview ──────────────────────────────────────────────────────

export async function getStatisticsService(
  userId: string,
  year: number,
  month: number,
): Promise<StatisticsData> {
  const { start, end } = getDateRange(year, month);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const [current, previous, topCategories, biggestExpense, weeklyData] =
    await Promise.all([
      getMonthTotals(userId, year, month),
      getMonthTotals(userId, prevYear, prevMonth),
      getCategoryStats(userId, year, month, 'EXPENSE'),

      prisma.transaction.findFirst({
        where: { userId, type: 'EXPENSE', date: { gte: start, lte: end } },
        orderBy: { amount: 'desc' },
        include: { category: { select: { name: true, icon: true } } },
      }),

      // Weekly breakdown for avg weekly spend
      prisma.$queryRaw<Array<{ week: number; total: string }>>`
        SELECT
          EXTRACT(WEEK FROM date)::int AS week,
          SUM(amount)::text AS total
        FROM transactions
        WHERE user_id = ${userId}
          AND type = 'EXPENSE'
          AND date >= ${start}
          AND date <= ${end}
        GROUP BY week
      `,
    ]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyAvgSpend = parseFloat(
    (current.totalExpenses / daysInMonth).toFixed(2),
  );
  const weeklyAvgSpend = parseFloat(
    (current.totalExpenses / (daysInMonth / 7)).toFixed(2),
  );

  // Most expensive day of week (0=Sun..6=Sat)
  const dayRows = await prisma.$queryRaw<Array<{ dow: number; total: string }>>`
    SELECT
      EXTRACT(DOW FROM date)::int AS dow,
      SUM(amount)::text AS total
    FROM transactions
    WHERE user_id = ${userId}
      AND type = 'EXPENSE'
      AND date >= ${start}
      AND date <= ${end}
    GROUP BY dow
    ORDER BY SUM(amount) DESC
    LIMIT 1
  `;

  const DAY_NAMES = ['Nedelja', 'Ponedeljek', 'Torek', 'Sreda', 'Četrtek', 'Petek', 'Sobota'];
  const mostExpensiveDay = dayRows.length > 0
    ? DAY_NAMES[dayRows[0].dow]
    : null;

  return {
    currentMonth: {
      income: current.totalIncome,
      expenses: current.totalExpenses,
      savings: current.netSavings,
      savingsRate: current.savingsRate,
      transactionCount: current.transactionCount,
    },
    previousMonth: {
      income: previous.totalIncome,
      expenses: previous.totalExpenses,
      savings: previous.netSavings,
    },
    changes: {
      income: percentChange(current.totalIncome, previous.totalIncome),
      expenses: percentChange(current.totalExpenses, previous.totalExpenses),
      savings: percentChange(current.netSavings, previous.netSavings),
    },
    topCategories: topCategories.slice(0, 5),
    biggestExpense: biggestExpense
      ? {
          description: biggestExpense.description,
          amount: toNumber(biggestExpense.amount),
          categoryName: getCategoryLabel(biggestExpense.category?.name),
          categoryIcon: biggestExpense.category?.icon ?? '💰',
          date: biggestExpense.date.toISOString().split('T')[0],
        }
      : null,
    weeklyAvgSpend,
    dailyAvgSpend,
    mostExpensiveDay,
  };
}