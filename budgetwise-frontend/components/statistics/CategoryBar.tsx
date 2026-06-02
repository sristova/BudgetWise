// components/statistics/CategoryBar.tsx
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withTiming, Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import type { CategoryStat } from '../../types/report';

interface CategoryBarProps {
  category: CategoryStat;
  index: number;
  currency?: string;
}

export function CategoryBar({ category, index, currency = '€' }: CategoryBarProps) {
  const { colors: C } = useTheme();
  const width = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * 80;
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    width.value = withDelay(delay + 100, withTiming(category.percentage, {
      duration: 600, easing: Easing.out(Easing.cubic),
    }));
  }, [category.percentage, index]);

  const barStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));
  const rowStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 }, rowStyle]}>
      {/* Left */}
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8, minWidth: 0 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: category.categoryColor }} />
        <Text style={{ fontSize: 16 }}>{category.categoryIcon}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, color: C.text1, fontWeight: '500' }} numberOfLines={1}>
            {category.categoryName}
          </Text>
          <Text style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>
            {category.count} transakcij
          </Text>
        </View>
      </View>
      {/* Right */}
      <View style={{ alignItems: 'flex-end', gap: 3, minWidth: 100 }}>
        <View style={{ width: 80, height: 4, backgroundColor: C.border1, borderRadius: 4, overflow: 'hidden' }}>
          <Animated.View style={[{ height: '100%', borderRadius: 4, backgroundColor: category.categoryColor }, barStyle]} />
        </View>
        <Text style={{ fontSize: 13, color: C.text1, fontWeight: '600' }}>
          {currency}{category.total.toFixed(2)}
        </Text>
        <Text style={{ fontSize: 10, color: C.text3 }}>{category.percentage.toFixed(0)}%</Text>
      </View>
    </Animated.View>
  );
}