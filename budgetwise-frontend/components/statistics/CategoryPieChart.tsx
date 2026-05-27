// components/statistics/CategoryPieChart.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import type { CategoryStat } from '../../types/report';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const C = {
  bg1: '#070508',
  border1: '#251018',
  text1: '#F5EEE8',
  text2: '#C8B8B0',
  text3: '#5C4A50',
  accent: '#A0263A',
} as const;

// Fallback colors for categories without color
const PALETTE = [
  '#A0263A', '#C4967A', '#7A1A2E', '#8C6A5A',
  '#D4845A', '#6B3A4A', '#E8A87C', '#4A2030',
];

interface CategoryPieChartProps {
  categories: CategoryStat[];
  currency?: string;
}

export function CategoryPieChart({ categories, currency = '€' }: CategoryPieChartProps) {
  if (!categories || categories.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Ni podatkov za ta mesec</Text>
      </View>
    );
  }

  const top5 = categories.slice(0, 5);
  const otherTotal = categories
    .slice(5)
    .reduce((sum, c) => sum + c.total, 0);

  const pieData = [
    ...top5.map((c, i) => ({
      name: c.categoryName,
      population: c.total,
      color: c.categoryColor || PALETTE[i % PALETTE.length],
      legendFontColor: C.text2,
      legendFontSize: 12,
    })),
    ...(otherTotal > 0
      ? [{
          name: 'Ostalo',
          population: otherTotal,
          color: '#3D2030',
          legendFontColor: C.text2,
          legendFontSize: 12,
        }]
      : []),
  ];

  const chartConfig = {
    color: (opacity = 1) => `rgba(245, 238, 232, ${opacity})`,
    backgroundColor: C.bg1,
    backgroundGradientFrom: C.bg1,
    backgroundGradientTo: C.bg1,
  };

  return (
    <View style={styles.container}>
      <PieChart
        data={pieData}
        width={SCREEN_WIDTH - 32}
        height={200}
        chartConfig={chartConfig}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="0"
        center={[10, 0]}
        absolute={false}
        hasLegend={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  empty: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.border1,
    borderRadius: 12,
  },
  emptyText: {
    color: C.text3,
    fontSize: 13,
  },
});