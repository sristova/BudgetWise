// app/(tabs)/statistics.tsx  (or app/statistics/index.tsx — adjust to your routing)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { reportsApi } from '@/lib/api';
import { StatCard } from '@/components/statistics/StatCard';
import { CategoryBar } from '@/components/statistics/CategoryBar';
import { TrendChart } from '@/components/statistics/TrendChart';
import { CategoryPieChart } from '@/components/statistics/CategoryPieChart';
import { StatisticsSkeleton } from '@/components/statistics/StatisticsSkeleton';
import type { StatisticsData, TrendsData } from '@/types/report';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg1: '#070508',
  bg2: '#0D090C',
  accent: '#A0263A',
  warm: '#C4967A',
  deep: '#7A1A2E',
  border1: '#251018',
  border2: '#3D1020',
  text1: '#F5EEE8',
  text2: '#C8B8B0',
  text3: '#5C4A50',
  green: '#4CAF7D',
  red: '#E05C6B',
} as const;

// ─── Month navigation helpers ─────────────────────────────────────────────────
const MONTH_LABELS = [
  '', 'Januar', 'Februar', 'Marec', 'April', 'Maj', 'Junij',
  'Julij', 'Avgust', 'September', 'Oktober', 'November', 'December',
];

type ChartMode = 'expenses' | 'income' | 'savings';
const CHART_MODES: { key: ChartMode; label: string }[] = [
  { key: 'expenses', label: 'Stroški' },
  { key: 'income', label: 'Prihodki' },
  { key: 'savings', label: 'Prihranki' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(amount: number, currency = '€'): string {
  if (Math.abs(amount) >= 10000)
    return `${currency}${(amount / 1000).toFixed(1)}k`;
  return `${currency}${Math.abs(amount).toFixed(2)}`;
}

function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View style={sectionStyles.container}>
      <View style={sectionStyles.header}>
        <Text style={sectionStyles.title}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    backgroundColor: C.bg1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: C.border1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text1,
    letterSpacing: 0.2,
  },
});

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>📊</Text>
      <Text style={emptyStyles.text}>{message}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  icon: { fontSize: 32 },
  text: { fontSize: 13, color: C.text3, textAlign: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StatisticsScreen() {
  const { isReady, isAuthenticated } = useAuth();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [chartMode, setChartMode] = useState<ChartMode>('expenses');

  const [statsData, setStatsData] = useState<StatisticsData | null>(null);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animate content in
  const contentOpacity = useSharedValue(0);
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(
    async (y: number, m: number, silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await reportsApi.getStatistics(y, m);
        setStatsData(data);
        contentOpacity.value = withTiming(1, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Napaka pri nalaganju podatkov');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchTrends = useCallback(async () => {
    setTrendsLoading(true);
    try {
      const data = await reportsApi.getTrends(6);
      setTrendsData(data);
    } catch {
      // non-critical — chart just shows empty state
    } finally {
      setTrendsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    contentOpacity.value = 0;
    fetchStats(year, month);
    fetchTrends();
  }, [isReady, isAuthenticated, year, month]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(year, month, true), fetchTrends()]);
    setRefreshing(false);
  }, [year, month, fetchStats, fetchTrends]);

  // ─── Month navigation ────────────────────────────────────────────────────────
  const goToPrevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  // ─── Render loading ──────────────────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.navBar}>
          <Text style={styles.navTitle}>Statistika</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <StatisticsSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Render error ────────────────────────────────────────────────────────────
  if (error && !statsData) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.navBar}>
          <Text style={styles.navTitle}>Statistika</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchStats(year, month)}
          >
            <Text style={styles.retryText}>Poskusi znova</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stats = statsData;
  const hasData =
    stats &&
    (stats.currentMonth.income > 0 || stats.currentMonth.expenses > 0);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ── NavBar ─────────────────────────────────────────────────── */}
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>Statistika</Text>
        {trendsData && (
          <View
            style={[
              styles.trendBadge,
              {
                backgroundColor:
                  trendsData.trend === 'improving'
                    ? '#0D2A1A'
                    : trendsData.trend === 'declining'
                    ? '#2A0D12'
                    : '#1A1014',
              },
            ]}
          >
            <Text
              style={[
                styles.trendText,
                {
                  color:
                    trendsData.trend === 'improving'
                      ? C.green
                      : trendsData.trend === 'declining'
                      ? C.red
                      : C.text3,
                },
              ]}
            >
              {trendsData.trend === 'improving'
                ? '↑ Trend raste'
                : trendsData.trend === 'declining'
                ? '↓ Trend pada'
                : '→ Stabilen'}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.accent}
            colors={[C.accent]}
          />
        }
      >
        {/* ── Month Selector ──────────────────────────────────────── */}
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.monthArrow}>
            <Text style={styles.monthArrowText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.monthCenter}>
            <Text style={styles.monthLabel}>
              {MONTH_LABELS[month]} {year}
            </Text>
            {stats?.currentMonth.transactionCount !== undefined && (
              <Text style={styles.monthSub}>
                {stats.currentMonth.transactionCount} transakcij
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={goToNextMonth}
            style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}
            disabled={isCurrentMonth}
          >
            <Text
              style={[
                styles.monthArrowText,
                isCurrentMonth && { color: C.text3 },
              ]}
            >
              ›
            </Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.content, contentStyle]}>

          {/* ── Summary Cards 2×2 ───────────────────────────────────── */}
          <View style={styles.grid}>
            <StatCard
              label="Prihodki"
              value={formatCurrency(stats?.currentMonth.income ?? 0)}
              valueColor={C.warm}
              icon="💚"
              change={stats?.changes.income}
              delay={0}
              style={styles.halfCard}
            />
            <StatCard
              label="Stroški"
              value={formatCurrency(stats?.currentMonth.expenses ?? 0)}
              valueColor={C.accent}
              icon="📤"
              change={stats?.changes.expenses}
              changeInverted
              delay={60}
              style={styles.halfCard}
            />
            <StatCard
              label="Prihranki"
              value={`${(stats?.currentMonth.savings ?? 0) < 0 ? '-' : ''}${formatCurrency(Math.abs(stats?.currentMonth.savings ?? 0))}`}
              valueColor={
                (stats?.currentMonth.savings ?? 0) >= 0 ? C.green : C.red
              }
              icon="🏦"
              change={stats?.changes.savings}
              delay={120}
              style={styles.halfCard}
            />
            <StatCard
              label="Stopnja varčevanja"
              value={`${(stats?.currentMonth.savingsRate ?? 0).toFixed(1)}%`}
              valueColor={C.text1}
              icon="📊"
              subtitle={`Povpr. dnevno: ${formatCurrency(stats?.dailyAvgSpend ?? 0)}`}
              delay={180}
              style={styles.halfCard}
            />
          </View>

          {/* ── Quick insights strip ────────────────────────────────── */}
          {stats && (stats.weeklyAvgSpend > 0 || stats.mostExpensiveDay) && (
            <View style={styles.insightStrip}>
              {stats.weeklyAvgSpend > 0 && (
                <View style={styles.insightItem}>
                  <Text style={styles.insightIcon}>📅</Text>
                  <View>
                    <Text style={styles.insightLabel}>Teden. povprečje</Text>
                    <Text style={styles.insightVal}>
                      {formatCurrency(stats.weeklyAvgSpend)}
                    </Text>
                  </View>
                </View>
              )}
              {stats.mostExpensiveDay && (
                <View style={[styles.insightItem, { borderLeftWidth: 0.5, borderLeftColor: C.border1, paddingLeft: 16 }]}>
                  <Text style={styles.insightIcon}>📆</Text>
                  <View>
                    <Text style={styles.insightLabel}>Najdražji dan</Text>
                    <Text style={styles.insightVal}>{stats.mostExpensiveDay}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── Biggest Expense ─────────────────────────────────────── */}
          {stats?.biggestExpense && (
            <Section title="Največji strošek">
              <View style={styles.bigExpense}>
                <View style={styles.bigExpenseLeft}>
                  <View style={styles.bigExpenseIcon}>
                    <Text style={{ fontSize: 22 }}>
                      {stats.biggestExpense.categoryIcon}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.bigExpenseDesc} numberOfLines={1}>
                      {stats.biggestExpense.description}
                    </Text>
                    <Text style={styles.bigExpenseMeta}>
                      {stats.biggestExpense.categoryName} ·{' '}
                      {stats.biggestExpense.date}
                    </Text>
                  </View>
                </View>
                <Text style={styles.bigExpenseAmount}>
                  −{formatCurrency(stats.biggestExpense.amount)}
                </Text>
              </View>
            </Section>
          )}

          {/* ── Trend Chart ─────────────────────────────────────────── */}
          <Section
            title="Trendi (6 mesecev)"
            action={
              <View style={styles.modeRow}>
                {CHART_MODES.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    onPress={() => setChartMode(m.key)}
                    style={[
                      styles.modeBtn,
                      chartMode === m.key && styles.modeBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeBtnText,
                        chartMode === m.key && styles.modeBtnTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          >
            <TrendChart
              points={trendsData?.points ?? []}
              mode={chartMode}
              loading={trendsLoading}
            />
            {trendsData && (
              <View style={styles.avgRow}>
                <Text style={styles.avgText}>
                  Povprečje:{' '}
                  <Text style={{ color: C.warm }}>
                    {chartMode === 'expenses'
                      ? formatCurrency(trendsData.averageExpenses)
                      : chartMode === 'income'
                      ? formatCurrency(trendsData.averageIncome)
                      : formatCurrency(trendsData.averageSavings)}
                  </Text>
                  /mesec
                </Text>
              </View>
            )}
          </Section>

          {/* ── Category Breakdown ──────────────────────────────────── */}
          {!hasData ? (
            <Section title="Poraba po kategorijah">
              <EmptyState message="Ni transakcij za ta mesec.&#10;Dodaj novo transakcijo!" />
            </Section>
          ) : (
            <>
              {/* Pie chart */}
              {stats!.topCategories.length > 0 && (
                <Section title="Razporeditev stroškov">
                  <CategoryPieChart
                    categories={stats!.topCategories}
                    currency="€"
                  />
                </Section>
              )}

              {/* Detailed bars */}
              <Section title="Poraba po kategorijah">
                {stats!.topCategories.length === 0 ? (
                  <EmptyState message="Ni kategorij za ta mesec." />
                ) : (
                  stats!.topCategories.map((cat, idx) => (
                    <CategoryBar
                      key={cat.categoryId ?? idx}
                      category={cat}
                      index={idx}
                      currency="€"
                    />
                  ))
                )}
              </Section>
            </>
          )}

          {/* ── Previous month comparison ────────────────────────────── */}
          {stats && (
            <Section title="Primerjava z lanskim mesecem">
              <View style={styles.compareRow}>
                <View style={styles.compareCol}>
                  <Text style={styles.compareLabel}>Ta mesec</Text>
                  <Text style={[styles.compareVal, { color: C.red }]}>
                    {formatCurrency(stats.currentMonth.expenses)}
                  </Text>
                  <Text style={styles.compareSubVal}>
                    prihranki: {formatCurrency(stats.currentMonth.savings)}
                  </Text>
                </View>
                <View style={styles.compareDivider} />
                <View style={styles.compareCol}>
                  <Text style={styles.compareLabel}>Prejšnji mesec</Text>
                  <Text style={[styles.compareVal, { color: C.text2 }]}>
                    {formatCurrency(stats.previousMonth.expenses)}
                  </Text>
                  <Text style={styles.compareSubVal}>
                    prihranki: {formatCurrency(stats.previousMonth.savings)}
                  </Text>
                </View>
                <View style={styles.compareRight}>
                  <Text
                    style={[
                      styles.compareChange,
                      {
                        color:
                          stats.changes.expenses < 0 ? C.green : C.red,
                      },
                    ]}
                  >
                    {formatChange(stats.changes.expenses)}
                  </Text>
                  <Text style={styles.compareChangeLabel}>stroški</Text>
                </View>
              </View>
            </Section>
          )}

        </Animated.View>

        {/* Bottom spacing */}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg2,
  },

  // NavBar
  navBar: {
    backgroundColor: C.bg1,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.text1,
    letterSpacing: -0.3,
  },
  trendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Scroll
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  content: {},

  // Month selector
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: C.bg1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 0.5,
    borderColor: C.border1,
  },
  monthArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.border1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthArrowDisabled: {
    opacity: 0.3,
  },
  monthArrowText: {
    fontSize: 20,
    color: C.text1,
    fontWeight: '300',
    lineHeight: 24,
  },
  monthCenter: {
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text1,
    letterSpacing: -0.3,
  },
  monthSub: {
    fontSize: 11,
    color: C.text3,
    marginTop: 2,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  halfCard: {
    width: '48%',
    flexGrow: 1,
  },

  // Insight strip
  insightStrip: {
    backgroundColor: C.bg1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 0.5,
    borderColor: C.border1,
    gap: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  insightIcon: {
    fontSize: 20,
  },
  insightLabel: {
    fontSize: 10,
    color: C.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightVal: {
    fontSize: 14,
    color: C.text1,
    fontWeight: '600',
    marginTop: 1,
  },

  // Biggest expense
  bigExpense: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  bigExpenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  bigExpenseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.border2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigExpenseDesc: {
    fontSize: 14,
    color: C.text1,
    fontWeight: '500',
  },
  bigExpenseMeta: {
    fontSize: 11,
    color: C.text3,
    marginTop: 2,
  },
  bigExpenseAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: C.red,
    letterSpacing: -0.3,
  },

  // Chart mode buttons
  modeRow: {
    flexDirection: 'row',
    gap: 4,
  },
  modeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.border1,
  },
  modeBtnActive: {
    backgroundColor: C.deep,
  },
  modeBtnText: {
    fontSize: 10,
    color: C.text3,
    fontWeight: '500',
  },
  modeBtnTextActive: {
    color: C.text1,
  },

  // Avg row
  avgRow: {
    marginTop: 10,
    alignItems: 'center',
  },
  avgText: {
    fontSize: 11,
    color: C.text3,
  },

  // Comparison
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compareCol: {
    flex: 1,
  },
  compareLabel: {
    fontSize: 10,
    color: C.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  compareVal: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  compareSubVal: {
    fontSize: 10,
    color: C.text3,
    marginTop: 3,
  },
  compareDivider: {
    width: 0.5,
    height: 50,
    backgroundColor: C.border1,
    marginHorizontal: 16,
  },
  compareRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  compareChange: {
    fontSize: 18,
    fontWeight: '700',
  },
  compareChangeLabel: {
    fontSize: 10,
    color: C.text3,
    marginTop: 2,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  errorIcon: { fontSize: 40 },
  errorText: {
    fontSize: 14,
    color: C.text2,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: C.accent,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 14,
    color: C.text1,
    fontWeight: '600',
  },
});