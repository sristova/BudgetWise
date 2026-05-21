/**
 * app/_layout.tsx
 * ─────────────────────────────────────────────────────────────
 * Root layout — wraps the entire app in AuthProvider and drives
 * navigation based on authentication state.
 *
 * Route structure:
 *   /                → (tabs)  — authenticated dashboard
 *   /welcome         → landing / onboarding screen
 *   /login           → login screen
 *   /register        → sign-up screen
 *   /modal           → generic modal slot
 *
 * Auth gating:
 *   • While session is restoring → show nothing (splash stays up)
 *   • Unauthenticated → redirect to /welcome
 *   • Authenticated   → redirect to (tabs)
 */

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

// ─── Inner navigator (needs AuthProvider above it) ────────────

function RootLayoutNav() {
  const { isReady, isAuthenticated } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Hide splash only once the auth check is done
  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  // Guard navigation after the session check resolves
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && inAuthGroup) {
      // User lost their session — send to welcome
      router.replace('/welcome' as any);
    } else if (isAuthenticated && !inAuthGroup) {
      // User just logged in — send to dashboard
      router.replace('/(tabs)');
    }
  }, [isReady, isAuthenticated, segments]);

  if (!isReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Public screens */}
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />

      {/* Protected app */}
      <Stack.Screen name="(tabs)" />

      {/* Misc */}
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

// ─── Root layout (loads fonts, provides auth) ─────────────────

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}