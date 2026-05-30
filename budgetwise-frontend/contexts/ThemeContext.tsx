// contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Color Palettes ───────────────────────────────────────────────────────────

export const DARK_COLORS = {
  bg1: '#070508',
  bg2: '#0D090C',
  card: '#120810',
  accent: '#A0263A',
  warm: '#C4967A',
  deep: '#7A1A2E',
  muted: '#8C6A5A',
  border1: '#251018',
  border2: '#3D1020',
  text1: '#F5EEE8',
  text2: '#C8B8B0',
  text3: '#5C4A50',
  inputBg: '#0F0710',
  success: '#2A6B3C',
  successText: '#6FCFA0',
  warning: '#7A5A1A',
  warningText: '#F0C060',
  paused: '#3D2A10',
  pausedText: '#C4A060',
  inactive: '#3A1820',
  green: '#4CAF7D',
  red: '#E05C6B',
};

export const LIGHT_COLORS = {
  bg1: '#FFFFFF',
  bg2: '#F5F0F2',
  card: '#FDF8FA',
  accent: '#A0263A',
  warm: '#8B5E3C',
  deep: '#7A1A2E',
  muted: '#8C6A5A',
  border1: '#E8D8DC',
  border2: '#D4B8BE',
  text1: '#1A0810',
  text2: '#4A2830',
  text3: '#8C6A70',
  inputBg: '#F8F0F2',
  success: '#D4F0E0',
  successText: '#1A6B3C',
  warning: '#FFF0D0',
  warningText: '#8B5A00',
  paused: '#FFF5E0',
  pausedText: '#8B6A00',
  inactive: '#E8D8DC',
  green: '#2E8B57',
  red: '#C0392B',
};

export type ColorScheme = typeof DARK_COLORS;
export type ThemeMode = 'dark' | 'light';

// ─── Context ──────────────────────────────────────────────────────────────────

interface ThemeContextType {
  theme: ThemeMode;
  colors: ColorScheme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: DARK_COLORS,
  toggleTheme: () => {},
  isDark: true,
});

const STORAGE_KEY = 'bw_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  // Load saved theme on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
      }
    });
  }, []);

  const toggleTheme = async () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme() {
  return useContext(ThemeContext);
}