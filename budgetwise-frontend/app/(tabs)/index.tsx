import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { transactionsApi } from '@/lib/api';

const { width } = Dimensions.get('window');

const C = {
  bg1: '#070508', bg2: '#0D090C', card: '#120810',
  accent: '#A0263A', warm: '#C4967A', deep: '#7A1A2E', muted: '#8C6A5A',
  border1: '#251018', border2: '#3D1020',
  text1: '#F5EEE8', text2: '#C8B8B0', text3: '#5C4A50',
};

const DAYS = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned'];

interface DashboardData {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  weeklySpending: number[];
  recentTransactions: Array<{
    id: string;
    description: string;
    category?: { name: string; icon: string };
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    date: string;
  }>;
}

function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('sl-SI', { style: 'currency', currency }).format(amount);
}

export default function HomeScreen() {
  const { user, logout, isReady, isAuthenticated } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const dashboard = await transactionsApi.getDashboard();
      setData(dashboard);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
  if (!isReady || !isAuthenticated) return; // ← počakaj da AuthContext konča
  load();
}, [isReady, isAuthenticated, load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const bars: number[] = data?.weeklySpending ?? [0, 0, 0, 0, 0, 0, 0];
  const barMax = Math.max(...bars, 1);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg2 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.bg1, paddingHorizontal: 20, paddingVertical: 14 }}>
          <View>
            <Text style={{ fontSize: 12, color: C.text3 }}>Dober dan,</Text>
            <Text style={{ fontSize: 17, fontWeight: '500', color: C.text1 }}>
              {user?.firstName ?? 'there'} 👋
            </Text>
          </View>
          <TouchableOpacity
            onPress={logout}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, borderWidth: 0.5, borderColor: '#5C1A28', alignItems: 'center', justifyContent: 'center' }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: C.accent, fontWeight: '600', fontSize: 14 }}>
              {(user?.firstName?.[0] ?? 'U').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
            <ActivityIndicator color={C.accent} size="large" />
            <Text style={{ color: C.text3, marginTop: 12, fontSize: 13 }}>Nalagam finance…</Text>
          </View>
        ) : (
          <>
            {/* ── Balance card ── */}
            <View style={{ backgroundColor: C.accent, margin: 16, borderRadius: 16, padding: 20 }}>
              <Text style={{ fontSize: 11, color: 'rgba(245,238,232,0.7)', letterSpacing: 0.08 }}>SKUPNO STANJE</Text>
              <Text style={{ fontSize: 32, fontWeight: '500', color: C.text1, marginTop: 4, marginBottom: 16 }}>
                {formatCurrency(data?.balance ?? 0, user?.currency)}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="arrow-down" size={12} color={C.warm} />
                    <Text style={{ fontSize: 10, color: 'rgba(245,238,232,0.75)' }}>Prihodki</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: C.text1, marginTop: 3 }}>
                    {formatCurrency(data?.totalIncome ?? 0, user?.currency)}
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="arrow-up" size={12} color={C.accent} />
                    <Text style={{ fontSize: 10, color: 'rgba(245,238,232,0.75)' }}>Stroški</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: C.text1, marginTop: 3 }}>
                    {formatCurrency(data?.totalExpenses ?? 0, user?.currency)}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Quick actions ── */}
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, color: C.text3, letterSpacing: 0.08, marginBottom: 10, textTransform: 'uppercase' }}>HITER DOSTOP</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                {[
                { label: 'Dodaj strošek', icon: 'add-circle-outline' as const, screen: '/transactions' },
                { label: 'Skeniraj račun', icon: 'camera-outline' as const, screen: '/transactions' },
                { label: 'Cilji', icon: 'flag-outline' as const, screen: '/goals' },
                { label: 'AI asistent', icon: 'chatbubble-ellipses-outline' as const, screen: '/assistant' },

                ].map((a) => (
                  <TouchableOpacity
                    key={a.label}
                    onPress={() => router.push(a.screen as any)}
                    style={{ width: (width - 42) / 2, backgroundColor: C.bg1, borderWidth: 0.5, borderColor: C.border2, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  >
                    <Ionicons name={a.icon} size={20} color={C.accent} />
                    <Text style={{ fontSize: 13, color: C.text1 }}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Weekly chart ── */}
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, color: C.text3, letterSpacing: 0.08, marginBottom: 10, textTransform: 'uppercase' }}>TA TEDEN</Text>
              <View style={{ backgroundColor: C.bg1, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 0.5, borderColor: C.border2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: C.text3 }}>Poraba</Text>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: C.text1 }}>
                    {formatCurrency(bars.reduce((a, b) => a + b, 0), user?.currency)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 72 }}>
                  {bars.map((h, i) => (
                    <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <View style={{ width: '100%', borderRadius: 4, height: (h / barMax) * 60, backgroundColor: i === new Date().getDay() - 1 ? C.accent : C.border2 }} />
                      <Text style={{ fontSize: 9, color: C.text3 }}>{DAYS[i]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* ── Recent transactions ── */}
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, color: C.text3, letterSpacing: 0.08, marginBottom: 10, textTransform: 'uppercase' }}>NEDAVNE TRANSAKCIJE</Text>
              <View style={{ gap: 8 }}>
                {(data?.recentTransactions ?? []).length === 0 ? (
                  <View style={{ backgroundColor: C.bg1, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 0.5, borderColor: C.border1 }}>
                    <Text style={{ color: C.text3, fontSize: 13 }}>Še ni transakcij.</Text>
                  </View>
                ) : (
                  data?.recentTransactions.map((tx) => (
                    <View key={tx.id} style={{ backgroundColor: C.bg1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 0.5, borderColor: C.border1 }}>
                      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#2A0D14', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 18 }}>{tx.category?.icon ?? (tx.type === 'INCOME' ? '💰' : '💸')}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, color: C.text1, fontWeight: '500' }}>{tx.description}</Text>
                        <Text style={{ fontSize: 12, color: C.text3 }}>{tx.category?.name ?? tx.type}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: tx.type === 'EXPENSE' ? C.accent : C.warm }}>
                        {tx.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(tx.amount, user?.currency)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}