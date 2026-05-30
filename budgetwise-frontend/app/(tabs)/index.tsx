import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
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
    category?: { name: string; icon: string; id?: string };
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    date: string;
  }>;
  categories?: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
  }>;
}

function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('sl-SI', { style: 'currency', currency }).format(amount);
}

export default function HomeScreen() {
  const { user, isReady, isAuthenticated } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Stanja za modalno okno
  const [modalVisible, setModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

const load = useCallback(async (silent = false) => {
  if (!silent) setLoading(true);
  try {
    const dashboard = await transactionsApi.getDashboard();
    setData({
      balance: dashboard.currentMonth.balance,
      totalIncome: dashboard.currentMonth.income,
      totalExpenses: dashboard.currentMonth.expenses,
      weeklySpending: dashboard.weeklySpending ?? [0, 0, 0, 0, 0, 0, 0],
      recentTransactions: dashboard.recentTransactions ?? [],
      categories: dashboard.categories ?? [],
    });
  } catch (err) {
    console.error('Dashboard load error:', err);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    load();
  }, [isReady, isAuthenticated, load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const handleCreateTransaction = async () => {
    if (!amount || !description) {
      Alert.alert('Napaka', 'Prosimo, izpolnite vsa polja.');
      return;
    }

    if (transactionType === 'EXPENSE' && !categoryId) {
      Alert.alert('Napaka', 'Prosimo, izberite kategorijo za strošek.');
      return;
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];

      await transactionsApi.create({
        amount: parseFloat(amount),
        description,
        type: transactionType,
        date: todayStr,
        categoryId: transactionType === 'INCOME' ? undefined : categoryId,
      });

      setModalVisible(false);
      setDescription('');
      setAmount('');
      setCategoryId(undefined);
      load(true); // Tiho osvežimo podatke na zaslonu
    } catch (error) {
      console.error(error);
      Alert.alert('Napaka', 'Ni uspelo dodati transakcije.');
    }
  };

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
            onPress={() => router.push('/(tabs)/profile' as any)}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, borderWidth: 0.5, borderColor: '#5C1A28', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {user?.avatarUrl ? (
              <Image 
                source={{ uri: user.avatarUrl }} 
                style={{ width: '100%', height: '100%' }} 
              />
            ) : (
              <Text style={{ color: C.accent, fontWeight: '600', fontSize: 14 }}>
                {(user?.firstName?.[0] ?? 'U').toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
            <ActivityIndicator color={C.accent} size="large" />
            <Text style={{ color: C.text3, marginTop: 12, fontSize: 13 }}>Nalagam finance…</Text>
          </View>
        ) : (
          <>
            {/* ── FINANČNI PREGLED (Preostanek, Prihodki, Stroški) ── */}
            <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
              
              {/* 1. Kartica: Preostanek denarja */}
              <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 0.5, borderColor: C.border2 }}>
                <Text style={{ color: C.text3, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Preostanek denarja
                </Text>
                <Text style={{ color: C.text1, fontSize: 30, fontWeight: '700', marginTop: 4 }}>
                  {formatCurrency(data?.balance ?? 0, user?.currency)}
                </Text>
              </View>

              {/* Vrstica z dvema ločenima karticama za Prihodke in Stroške */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                
                {/* 2. Kartica: Prihodki */}
                <TouchableOpacity
                  onPress={() => {
                    setTransactionType('INCOME');
                    setCategoryId(undefined);
                    setModalVisible(true);
                  }}
                  style={{ flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: C.border2 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="arrow-down-circle" size={16} color="#4CD964" />
                    <Text style={{ color: C.text2, fontSize: 12, fontWeight: '500' }}>Prihodki</Text>
                  </View>
                  <Text style={{ color: '#4CD964', fontSize: 18, fontWeight: '600', marginTop: 6 }}>
                    {formatCurrency(data?.totalIncome ?? 0, user?.currency)}
                  </Text>
                </TouchableOpacity>

                {/* 3. Kartica: Stroški */}
                <TouchableOpacity
                  onPress={() => {
                    setTransactionType('EXPENSE');
                    setModalVisible(true);
                  }}
                  style={{ flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: C.border2 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="arrow-up-circle" size={16} color={C.accent} />
                    <Text style={{ color: C.text2, fontSize: 12, fontWeight: '500' }}>Stroški</Text>
                  </View>
                  <Text style={{ color: C.accent, fontSize: 18, fontWeight: '600', marginTop: 6 }}>
                    {formatCurrency(data?.totalExpenses ?? 0, user?.currency)}
                  </Text>
                </TouchableOpacity>

              </View>
            </View>

            {/* ── Quick actions ── */}
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, color: C.text3, letterSpacing: 0.08, marginBottom: 10, textTransform: 'uppercase' }}>HITER DOSTOP</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Dodaj strošek', icon: 'add-circle-outline' as const, action: () => { setTransactionType('EXPENSE'); setModalVisible(true); } },
                  { label: 'Dodaj prihodek', icon: 'download-outline' as const, action: () => { setTransactionType('INCOME'); setCategoryId(undefined); setModalVisible(true); } },
                  { label: 'Cilji', icon: 'flag-outline' as const, action: () => router.push('/goals' as any) },
                  { label: 'AI asistent', icon: 'chatbubble-ellipses-outline' as const, action: () => router.push('/assistant' as any) },
                ].map((a) => (
                  <TouchableOpacity
                    key={a.label}
                    onPress={a.action}
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
                      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: tx.type === 'INCOME' ? '#0F2A14' : '#2A0D14', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 18 }}>{tx.category?.icon ?? (tx.type === 'INCOME' ? '💰' : '💸')}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, color: C.text1, fontWeight: '500' }}>{tx.description}</Text>
                        <Text style={{ fontSize: 12, color: C.text3 }}>{tx.category?.name ?? (tx.type === 'INCOME' ? 'Prihodek' : 'Strošek')}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: tx.type === 'EXPENSE' ? C.accent : '#4CD964' }}>
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

      {/* ─── MODALNO OKNO ZA DODAJANJE ─── */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.sheetOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.sheetTitle}>
                {transactionType === 'INCOME' ? 'Dodaj prihodek' : 'Dodaj strošek'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={C.text3} />
              </TouchableOpacity>
            </View>

            {/* Vnos zneska */}
            <Text style={styles.label}>Znesek</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={C.text3}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />

            {/* Vnos opisa */}
            <Text style={styles.label}>Opis transakcije</Text>
            <TextInput
              style={styles.input}
              placeholder={transactionType === 'INCOME' ? 'Plača, Božičnica, Prodaja...' : 'Trgovina, Kosilo, Bencin...'}
              placeholderTextColor={C.text3}
              value={description}
              onChangeText={setDescription}
            />

            {/* Izbira kategorije — Prikaže se samo pri stroških */}
            {transactionType === 'EXPENSE' && data?.categories && (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.label}>Kategorija</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {data.categories.map((cat) => {
                    const isSelected = categoryId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setCategoryId(cat.id)}
                        style={[
                          styles.categoryBadge,
                          isSelected && { backgroundColor: C.accent, borderColor: C.accent }
                        ]}
                      >
                        <Text style={{ fontSize: 16 }}>{cat.icon}</Text>
                        <Text style={{ color: isSelected ? C.text1 : C.text2, fontSize: 12, fontWeight: '500' }}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Gumb za shranjevanje */}
            <TouchableOpacity onPress={handleCreateTransaction} style={styles.submitBtn}>
              <Text style={{ color: C.text1, fontSize: 15, fontWeight: '600' }}>Shrani transakcijo</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 0.5,
    borderColor: C.border2,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: C.border2,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.text1,
  },
  label: {
    fontSize: 11,
    color: C.text3,
    textTransform: 'uppercase',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: C.bg1,
    borderRadius: 10,
    padding: 12,
    color: C.text1,
    borderWidth: 0.5,
    borderColor: C.border2,
    marginBottom: 16,
    fontSize: 14,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.bg1,
    borderWidth: 0.5,
    borderColor: C.border2,
  },
  submitBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
});