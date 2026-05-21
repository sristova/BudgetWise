import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { reportsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const C = {
  bg1:'#070508', bg2:'#0D090C',
  accent:'#A0263A', warm:'#C4967A', deep:'#7A1A2E',
  border1:'#251018', border2:'#3D1020',
  text1:'#F5EEE8', text2:'#C8B8B0', text3:'#5C4A50',
};

interface ReportCategory {
  name: string;
  amount: number;
  percentage: number;
  color?: string;
}

interface ReportData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  categories: ReportCategory[];
}

export default function ReportScreen() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const { isReady, isAuthenticated } = useAuth();


  useEffect(() => {
  if (!isReady || !isAuthenticated) return;
  async function loadReport() {
    try {
      const now = new Date();
      const report = await reportsApi.getMonthly(now.getFullYear(), now.getMonth() + 1);
      setData(report);
    } catch (err) {
      console.error("Napaka pri pridobivanju finančnega poročila:", err);
    } finally {
      setLoading(false);
    }
  }
  loadReport();
}, [isReady, isAuthenticated]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex:1, backgroundColor:C.bg2, justifyContent:'center' }}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  const SUMMARY = [
    { label:'Prihodki', val: `€${data?.totalIncome ?? 0}`, color:'#C4967A' },
    { label:'Stroški', val: `€${data?.totalExpenses ?? 0}`, color:'#A0263A' },
    { label:'Prihranek', val: `€${data?.netSavings ?? 0}`, color: C.text1 },
    { label:'Stopnja var.', val: `${Math.round(data?.savingsRate ?? 0)}%`, color:'#F5EEE8' },
  ];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg2 }}>
      <View style={{ backgroundColor:C.bg1, paddingHorizontal:20, paddingVertical:16, borderBottomWidth:0.5, borderBottomColor:C.border1 }}>
        <Text style={{ fontSize:18, fontWeight:'500', color:C.text1 }}>Mesečno Poročilo</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Metric Grid */}
        <View style={{ flexDirection:'row', flexWrap:'wrap', padding:12, gap:8 }}>
          {SUMMARY.map(item => (
            <View key={item.label} style={{ width:'48%', backgroundColor:C.bg1, borderRadius:12, padding:14, borderWidth:0.5, borderColor:C.border1 }}>
              <Text style={{ fontSize:11, color:C.text3, marginBottom:4, textTransform:'uppercase' }}>{item.label}</Text>
              <Text style={{ fontSize:18, fontWeight:'600', color:item.color }}>{item.val}</Text>
            </View>
          ))}
        </View>

        {/* Category Breakdown list */}
        <View style={{ backgroundColor:C.bg1, borderRadius:14, marginHorizontal:16, marginBottom:20, padding:16, borderWidth:0.5, borderColor:C.border2 }}>
          <Text style={{ fontSize:14, fontWeight:'500', color:C.text1, marginBottom:12 }}>Poraba po kategorijah</Text>
          
          {!data?.categories || data.categories.length === 0 ? (
            <Text style={{ color:C.text3, fontSize:13 }}>Ni podatkov za ta mesec.</Text>
          ) : (
            data.categories.map((cat, idx) => {
              const colors = ['#A0263A', '#C4967A', '#7A1A2E', '#8C6A5A'];
              const catColor = cat.color ?? colors[idx % colors.length];
              return (
                <View key={cat.name} style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:10 }}>
                  <View style={{ width:10, height:10, borderRadius:5, backgroundColor:catColor }} />
                  <Text style={{ fontSize:13, color:C.text1, flex:1 }}>{cat.name}</Text>
                  <View style={{ width:80, height:6, backgroundColor:C.border1, borderRadius:4, overflow:'hidden' }}>
                    <View style={{ height:'100%', borderRadius:4, width: `${Math.round(cat.percentage)}%` as any, backgroundColor:catColor }} />
                  </View>
                  <Text style={{ fontSize:12, color:C.text3, minWidth:50, textAlign:'right' }}>€{cat.amount}</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}