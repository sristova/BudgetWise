import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const C = {
  bg1:'#070508', bg2:'#0D090C',
  accent:'#A0263A', warm:'#C4967A', deep:'#7A1A2E', muted:'#8C6A5A',
  border1:'#251018', border2:'#3D1020',
  text1:'#F5EEE8', text2:'#C8B8B0', text3:'#5C4A50',
};
const GOALS = [
  { id:1, name:'Nov laptop', eta:'Cilj: september 2026', icon:'laptop-outline' as const, ibg:'#1A0D14', ic:C.warm, pct:0.67, pc:C.accent, cur:'€670', tar:'€1.000', note:'€30/teden za cilj', pctLbl:'67%' },
  { id:2, name:'Potovanje — Španija', eta:'Cilj: julij 2026', icon:'airplane-outline' as const, ibg:'#251018', ic:C.muted, pct:0.40, pc:C.warm, cur:'€200', tar:'€500', note:'⚠️ Zaostajate', pctLbl:'40%' },
  { id:3, name:'Varnostni sklad', eta:'Brez roka', icon:'shield-checkmark-outline' as const, ibg:'#1E0D12', ic:C.deep, pct:0.25, pc:C.muted, cur:'€250', tar:'€1.000', note:'Samodejno varčevanje', pctLbl:'25%' },
];

export default function GoalsScreen() {
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg2 }}>
      <View style={{ backgroundColor:C.bg1, paddingHorizontal:20, paddingVertical:14, borderBottomWidth:0.5, borderBottomColor:C.border1 }}>
        <Text style={{ fontSize:18, fontWeight:'500', color:C.text1 }}>Cilji varčevanja</Text>
        <Text style={{ fontSize:13, color:C.text3, marginTop:2 }}>3 aktivni cilji</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical:16, gap:10 }}>
        {GOALS.map(g => (
          <View key={g.id} style={{ backgroundColor:C.bg1, borderRadius:14, padding:16, marginHorizontal:16, borderWidth:0.5, borderColor:C.border2 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:12 }}>
              <View style={{ width:36, height:36, borderRadius:10, backgroundColor:g.ibg, alignItems:'center', justifyContent:'center' }}>
                <Ionicons name={g.icon} size={20} color={g.ic} />
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:15, fontWeight:'500', color:C.text1 }}>{g.name}</Text>
                <Text style={{ fontSize:12, color:C.text3 }}>{g.eta}</Text>
              </View>
              <Text style={{ fontSize:13, fontWeight:'500', color:g.pc }}>{g.pctLbl}</Text>
            </View>
            <View style={{ backgroundColor:C.border1, borderRadius:6, height:8, overflow:'hidden' }}>
              <View style={{ height:'100%', borderRadius:6, width:`${g.pct*100}%` as any, backgroundColor:g.pc }} />
            </View>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:6 }}>
              <Text style={{ fontSize:12, color:C.text1, fontWeight:'500' }}>{g.cur} / {g.tar}</Text>
              <Text style={{ fontSize:12, color:C.text3 }}>{g.note}</Text>
            </View>
          </View>
        ))}
        <TouchableOpacity style={{ backgroundColor:C.bg1, borderWidth:0.5, borderStyle:'dashed', borderColor:C.border2, borderRadius:14, padding:14, marginHorizontal:16, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Ionicons name="add" size={20} color={C.text3} />
          <Text style={{ fontSize:14, color:C.text3 }}>Dodaj cilj</Text>
        </TouchableOpacity>
        <View style={{ height:8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}