// components/statistics/StatCard.tsx
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

// ─── Design tokens (matching existing app palette) ────────────────────────────
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

interface StatCardProps {
  label: string;
  value: string;
  valueColor?: string;
  subtitle?: string;
  change?: number; // percentage change (positive = good, negative = bad)
  changeInverted?: boolean; // for expenses: negative change is good
  icon?: string;
  style?: ViewStyle;
  delay?: number;
}

export function StatCard({
  label,
  value,
  valueColor = C.text1,
  subtitle,
  change,
  changeInverted = false,
  icon,
  style,
  delay = 0,
}: StatCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
  }, [delay]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const getChangeColor = () => {
    if (change === undefined) return C.text3;
    if (changeInverted) return change < 0 ? C.green : C.red;
    return change >= 0 ? C.green : C.red;
  };

  const getChangeLabel = () => {
    if (change === undefined) return null;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  return (
    <Animated.View style={[styles.card, style, animStyle]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {icon && <Text style={styles.icon}>{icon}</Text>}
      </View>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      {(subtitle || change !== undefined) && (
        <View style={styles.footer}>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {change !== undefined && (
            <View style={styles.changePill}>
              <Text style={[styles.changeText, { color: getChangeColor() }]}>
                {getChangeLabel()} vs prošli mesec
              </Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.bg1,
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    borderColor: C.border1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    color: C.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '500',
  },
  icon: {
    fontSize: 16,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  footer: {
    marginTop: 4,
  },
  subtitle: {
    fontSize: 11,
    color: C.text3,
  },
  changePill: {
    marginTop: 2,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});