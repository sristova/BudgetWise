// components/statistics/CategoryBar.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { CategoryStat } from '../../types/report';

const C = {
  bg1: '#070508',
  border1: '#251018',
  text1: '#F5EEE8',
  text2: '#C8B8B0',
  text3: '#5C4A50',
} as const;

interface CategoryBarProps {
  category: CategoryStat;
  index: number;
  currency?: string;
}

export function CategoryBar({ category, index, currency = '€' }: CategoryBarProps) {
  const width = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * 80;
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    width.value = withDelay(
      delay + 100,
      withTiming(category.percentage, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [category.percentage, index]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%` as any,
  }));

  const rowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: category.categoryColor }]} />
        <Text style={styles.icon}>{category.categoryIcon}</Text>
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>{category.categoryName}</Text>
          <Text style={styles.count}>{category.count} transakcij</Text>
        </View>
      </View>
      <View style={styles.right}>
        <View style={styles.barTrack}>
          <Animated.View
            style={[styles.barFill, { backgroundColor: category.categoryColor }, barStyle]}
          />
        </View>
        <Text style={styles.amount}>
          {currency}{category.total.toFixed(2)}
        </Text>
        <Text style={styles.pct}>{category.percentage.toFixed(0)}%</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  icon: {
    fontSize: 16,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 13,
    color: C.text1,
    fontWeight: '500',
  },
  count: {
    fontSize: 11,
    color: C.text3,
    marginTop: 1,
  },
  right: {
    alignItems: 'flex-end',
    gap: 3,
    minWidth: 100,
  },
  barTrack: {
    width: 80,
    height: 4,
    backgroundColor: C.border1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  amount: {
    fontSize: 13,
    color: C.text1,
    fontWeight: '600',
  },
  pct: {
    fontSize: 10,
    color: C.text3,
  },
});