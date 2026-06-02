// components/statistics/StatisticsSkeleton.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';

function SkeletonBlock({
  width = '100%' as any,
  height = 16,
  borderRadius = 6,
  style = {},
  shimmerColor,
}: {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
  shimmerColor: string;
}) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: shimmerColor,
        },
        style,
        animStyle,
      ]}
    />
  );
}

export function StatisticsSkeleton() {
  const { colors: C } = useTheme();

  const block = (props: Omit<Parameters<typeof SkeletonBlock>[0], 'shimmerColor'>) =>
    <SkeletonBlock {...props} shimmerColor={C.border1} />;

  return (
    <View style={[styles.container]}>
      {/* Header */}
      <View style={styles.header}>
        {block({ width: 140, height: 20, borderRadius: 8 })}
        {block({ width: 80, height: 16, borderRadius: 6 })}
      </View>

      {/* Month selector */}
      <View style={styles.monthRow}>
        {block({ width: 28, height: 28, borderRadius: 14 })}
        {block({ width: 120, height: 18, borderRadius: 6 })}
        {block({ width: 28, height: 28, borderRadius: 14 })}
      </View>

      {/* 2×2 Stat grid */}
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.card, { backgroundColor: C.bg1, borderColor: C.border1 }]}>
            {block({ width: 60, height: 10, borderRadius: 4, style: { marginBottom: 10 } })}
            {block({ width: 90, height: 22, borderRadius: 6, style: { marginBottom: 6 } })}
            {block({ width: 70, height: 10, borderRadius: 4 })}
          </View>
        ))}
      </View>

      {/* Chart section */}
      <View style={[styles.section, { backgroundColor: C.bg1, borderColor: C.border1 }]}>
        {block({ width: 120, height: 16, borderRadius: 6, style: { marginBottom: 14 } })}
        {block({ width: '100%', height: 180, borderRadius: 12 })}
      </View>

      {/* Categories section */}
      <View style={[styles.section, { backgroundColor: C.bg1, borderColor: C.border1 }]}>
        {block({ width: 150, height: 16, borderRadius: 6, style: { marginBottom: 14 } })}
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.categoryRow}>
            {block({ width: 32, height: 32, borderRadius: 16 })}
            <View style={{ flex: 1, gap: 6 }}>
              {block({ width: '60%', height: 12, borderRadius: 4 })}
              {block({ width: '40%', height: 10, borderRadius: 4 })}
            </View>
            {block({ width: 70, height: 12, borderRadius: 4 })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  card: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
  },
  section: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
});