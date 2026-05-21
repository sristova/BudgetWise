import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback } from 'react';
import { goalsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';


const C = {
  bg1:'#070508', bg2:'#0D090C',
  accent:'#A0263A', warm:'#C4967A', deep:'#7A1A2E', muted:'#8C6A5A',
  border1:'#251018', border2:'#3D1020',
  text1:'#F5EEE8', text2:'#C8B8B0', text3:'#5C4A50',
};

interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  description?: string;
}

export default function GoalsScreen() {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isReady, isAuthenticated } = useAuth();

  const fetchGoals = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await goalsApi.getAll();
      setGoals(data ?? []);
    } catch (err) {
      console.error("Napaka pri branju ciljev:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

useEffect(() => {
  if (!isReady || !isAuthenticated) return;
  fetchGoals();
}, [isReady, isAuthenticated, fetchGoals]);


  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg2 }}>
      <View style={{ backgroundColor:C.bg1, paddingHorizontal:20, paddingVertical:16, borderBottomWidth:0.5, borderBottomColor:C.border1 }}>
        <Text style={{ fontSize:18, fontWeight:'500', color:C.text1 }}>Varčevalni Cilji</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGoals(true); }} tintColor={C.accent} />}
      >
        <View style={{ height:16 }} />

        {loading ? (
          <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 40 }} />
        ) : goals.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🎯</Text>
            <Text style={{ color: C.text3, textAlign: 'center' }}>Nimate nastavljenih varčevalnih ciljev.</Text>
          </View>
        ) : (
          goals.map(g => {
            const progress = g.targetAmount > 0 ? Math.min(g.currentAmount / g.targetAmount, 1) : 0;
            const percentage = Math.round(progress * 100);

            return (
              <View key={g.id} style={{ backgroundColor:C.bg1, borderRadius:14, padding:14, marginHorizontal:16, marginBottom:12, borderWidth:0.5, borderColor:C.border1 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginBottom:10 }}>
                  <View style={{ width:36, height:36, borderRadius:10, backgroundColor:'#1A0D14', alignItems:'center', justifyContent:'center' }}>
                    <Ionicons name="flag-outline" size={18} color={C.warm} />
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:15, fontWeight:'500', color:C.text1 }}>{g.name}</Text>
                    {g.targetDate && (
                      <Text style={{ fontSize:12, color:C.text3 }}>Do: {new Date(g.targetDate).toLocaleDateString('sl-SI')}</Text>
                    )}
                  </View>
                  <Text style={{ fontSize:13, fontWeight:'500', color:C.accent }}>{percentage}%</Text>
                </View>

                {/* Progress Bar */}
                <View style={{ backgroundColor:C.border1, borderRadius:6, height:8, overflow:'hidden' }}>
                  <View style={{ height:'100%', borderRadius:6, width: `${percentage}%` as any, backgroundColor:C.accent }} />
                </View>

                <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:6 }}>
                  <Text style={{ fontSize:12, color:C.text1, fontWeight:'500' }}>
                    €{g.currentAmount} / €{g.targetAmount}
                  </Text>
                  {g.description && <Text style={{ fontSize:12, color:C.text3 }}>{g.description}</Text>}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}