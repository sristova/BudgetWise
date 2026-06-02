// components/statistics/StatCard.tsx
import React, { useEffect } from 'react';
import { View, Text, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';

interface StatCardProps {
  label: string;
  value: string;
  valueColor?: string;
  subtitle?: string;
  change?: number;
  changeInverted?: boolean;
  icon?: string;
  style?: ViewStyle;
  delay?: number;
}

export function StatCard({
  label, value, valueColor, subtitle, change, changeInverted = false, icon, style, delay = 0,
}: StatCardProps) {
  const { colors: C } = useTheme();
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
    <Animated.View style={[{
      backgroundColor: C.bg1, borderRadius: 14, padding: 16,
      borderWidth: 0.5, borderColor: C.border1,
    }, style, animStyle]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 11, color: C.text3, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '500' }}>
          {label}
        </Text>
        {icon && <Text style={{ fontSize: 16 }}>{icon}</Text>}
      </View>
      <Text style={{ fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 4, color: valueColor ?? C.text1 }}>
        {value}
      </Text>
      {(subtitle || change !== undefined) && (
        <View style={{ marginTop: 4 }}>
          {subtitle && <Text style={{ fontSize: 11, color: C.text3 }}>{subtitle}</Text>}
          {change !== undefined && (
            <Text style={{ fontSize: 11, fontWeight: '500', marginTop: 2, color: getChangeColor() }}>
              {getChangeLabel()} vs prošli mesec
            </Text>
          )}
        </View>
      )}
    </Animated.View>
  );
}