import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const C = {
  bg1:'#070508', bg2:'#0D090C',
  accent:'#A0263A', warm:'#C4967A', deep:'#7A1A2E', muted:'#8C6A5A',
  border1:'#251018', border2:'#3D1020',
  text1:'#F5EEE8', text2:'#C8B8B0', text3:'#5C4A50',
};
const SUMMARY = [
  { label:'Prihodki', val:'€2.200', color:'#C4967A' },
  { label:'Stroški', val:'€357,50', color:'#A0263A' },
  { label:'Prihranek', val:'€842,50', color:'#A0263A' },
  { label:'Stopnja var.', val:'38%', color:'#F5EEE8' },
];
const CATS = [
  { name:'Hrana', pct:1.00, color:'#A0263A', amt:'€142' },
  { name:'Zabava', pct:0.48, color:'#C4967A', amt:'€68' },
  { name:'Prevoz', pct:0.32, color:'#8C6A5A', amt:'€45' },
  { name:'Ostalo', pct:0.25, color:'#7A1A2E', amt:'€35' },
  { name:'Naročnine', pct:0.15, color:'#5C1A28', amt:'€21' },
];

export default function ReportScreen() {
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg2 }}>
      <View style={{ backgroundColor:C.bg1, paddingHorizontal:20, paddingVertical:14, borderBottomWidth:0.5, borderBottomColor:C.border1 }}>
        <Text style={{ fontSize:18, fontWeight:'500', color:C.text1 }}>Mesečno poročilo</Text>
        <Text style={{ fontSize:13, color:C.text3, marginTop:2 }}>Maj 2026</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ height:14 }} />
        <View style={{ backgroundColor:C.bg1, borderRadius:14, marginHorizontal:16, marginBottom:10, padding:16, borderWidth:0.5, borderColor:C.border2 }}>
          <Text style={{ fontSize:14, fontWeight:'500', color:C.text1, marginBottom:12 }}>Povzetek</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
            {SUMMARY.map(s => (
              <View key={s.label} style={{ flex:1, minWidth:'45%', backgroundColor:C.bg2, borderRadius:10, padding:10 }}>
                <Text style={{ fontSize:11, color:C.text3 }}>{s.label}</Text>
                <Text style={{ fontSize:16, fontWeight:'500', color:s.color, marginTop:2 }}>{s.val}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ backgroundColor:C.bg1, borderRadius:14, marginHorizontal:16, marginBottom:10, padding:16, borderWidth:0.5, borderColor:C.border2 }}>
          <Text style={{ fontSize:14, fontWeight:'500', color:C.text1, marginBottom:12 }}>Poraba po kategorijah</Text>
          {CATS.map(cat => (
            <View key={cat.name} style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:10 }}>
              <View style={{ width:10, height:10, borderRadius:5, backgroundColor:cat.color }} />
              <Text style={{ fontSize:13, color:C.text1, flex:1 }}>{cat.name}</Text>
              <View style={{ width:80, height:6, backgroundColor:C.border1, borderRadius:4, overflow:'hidden' }}>
                <View style={{ height:'100%', borderRadius:4, width:`${cat.pct*100}%` as any, backgroundColor:cat.color }} />
              </View>
              <Text style={{ fontSize:12, color:C.text3, minWidth:40, textAlign:'right' }}>{cat.amt}</Text>
            </View>
          ))}
        </View>
        <View style={{ paddingHorizontal:16, marginBottom:24 }}>
          <TouchableOpacity style={{ backgroundColor:C.accent, borderRadius:12, padding:13, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8 }}>
            <Ionicons name="download-outline" size={18} color={C.text1} />
            <Text style={{ fontSize:14, color:C.text1, fontWeight:'500' }}>Prenesi PDF poročilo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}