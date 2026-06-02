// components/statistics/TrendChart.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '@/contexts/ThemeContext';
import type { TrendPoint } from '../../types/report';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ChartMode = 'expenses' | 'income' | 'savings';

interface TrendChartProps {
  points: TrendPoint[];
  mode?: ChartMode;
  loading?: boolean;
}

export function TrendChart({ points, mode = 'expenses', loading = false }: TrendChartProps) {
  const { colors: C } = useTheme();

  const MODE_CONFIG: Record<ChartMode, { label: string; color: string }> = {
    expenses: { label: 'Stroški', color: C.accent },
    income: { label: 'Prihodki', color: C.warm },
    savings: { label: 'Prihranki', color: C.green },
  };

  const config = MODE_CONFIG[mode];
  const chartWidth = SCREEN_WIDTH - 32;

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: C.bg1 }]}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  if (!points || points.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, { backgroundColor: C.bg1, borderColor: C.border1 }]}>
        <Text style={[styles.emptyText, { color: C.text3 }]}>Ni dovolj podatkov za grafikon</Text>
      </View>
    );
  }

  const values = points.map((p) => {
    switch (mode) {
      case 'income': return Math.max(p.income, 0);
      case 'savings': return p.savings;
      default: return Math.max(p.expenses, 0);
    }
  });

  const labels = points.map((p) => p.label);

  const chartData = {
    labels,
    datasets: [
      {
        data: values.length > 0 ? values : [0],
        color: (opacity = 1) => `${config.color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
        strokeWidth: 2.5,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: C.bg1,
    backgroundGradientFrom: C.bg1,
    backgroundGradientTo: C.bg1,
    decimalPlaces: 0,
    color: (opacity = 1) => `${C.border2}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    labelColor: () => C.text3,
    style: { borderRadius: 14 },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: config.color,
      fill: C.bg1,
    },
    propsForBackgroundLines: {
      stroke: C.border1,
      strokeWidth: 0.5,
    },
    fillShadowGradientFrom: config.color,
    fillShadowGradientTo: C.bg1,
    fillShadowGradientOpacity: 0.15,
    useShadowColorFromDataset: false,
  };

  return (
    <View style={styles.container}>
      <LineChart
        data={chartData}
        width={chartWidth}
        height={180}
        chartConfig={chartConfig}
        bezier
        withInnerLines
        withOuterLines={false}
        withVerticalLines={false}
        withHorizontalLines
        withDots
        style={styles.chart}
        formatYLabel={(val) => {
          const n = parseFloat(val);
          if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
          return `${n.toFixed(0)}`;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  chart: {
    borderRadius: 12,
    marginHorizontal: -8,
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
  },
  emptyText: {
    fontSize: 13,
  },
});