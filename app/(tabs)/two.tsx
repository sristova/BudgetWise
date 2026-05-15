import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

const C = {
  bg1:'#070508', bg2:'#0D090C', card:'#120810',
  accent:'#A0263A', warm:'#C4967A',
  border1:'#251018', border2:'#3D1020',
  text1:'#F5EEE8', text2:'#C8B8B0', text3:'#5C4A50', inactive:'#3A1820',
};
const FILTERS = ['Vse','Hrana','Prevoz','Zabava','Ostalo'];
const TODAY = [
  { id:1, name:'Mercator', cat:'🛒 Hrana · AI razvrščeno', amount:'-€24,80', neg:true, icon:'cart' as const, ibg:'#2A0D14', ic:C.accent },
  { id:2, name:'Moj Bus', cat:'🚌 Prevoz · AI razvrščeno', amount:'-€2,10', neg:true, icon:'bus' as const, ibg:'#1E0D12', ic:C.warm },
];
const YESTERDAY = [
  { id:3, name:'Steam', cat:'🎮 Zabava', amount:'-€14,99', neg:true, icon:'game-controller' as const, ibg:'#251018', ic:'#8C6A5A' },
  { id:4, name:'Spotify', cat:'🎵 Zabava', amount:'-€5,99', neg:true, icon:'musical-notes' as const, ibg:'#1A0D14', ic:'#7A1A2E' },
];

export default function TransactionsScreen() {
  const [active, setActive] = useState('Vse');
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg2 }}>
      <View style={{ backgroundColor:C.bg1, paddingHorizontal:20, paddingVertical:14, borderBottomWidth:0.5, borderBottomColor:C.border1 }}>
        <Text style={{ fontSize:18, fontWeight:'500', color:C.text1 }}>Transakcije</Text>
        <Text style={{ fontSize:13, color:C.text3, marginTop:2 }}>Maj 2026</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:16, paddingVertical:12, gap:8, flexDirection:'row' }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} onPress={() => setActive(f)}
              style={{ paddingHorizontal:14, paddingVertical:6, borderRadius:20, borderWidth:0.5, borderColor: active===f ? C.accent : C.border2, backgroundColor: active===f ? C.accent : C.bg1 }}>
              <Text style={{ fontSize:12, color: active===f ? C.text1 : C.text3 }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={{ backgroundColor:C.accent, borderRadius:12, padding:13, marginHorizontal:16, marginBottom:12, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Ionicons name="camera" size={18} color={C.text1} />
          <Text style={{ fontSize:14, color:C.text1, fontWeight:'500' }}>Skeniraj račun (AI)</Text>
        </TouchableOpacity>
        {[{ label:'DANES', data:TODAY }, { label:'VČERAJ', data:YESTERDAY }].map(g => (
          <View key={g.label} style={{ paddingHorizontal:16, marginBottom:12, gap:8 }}>
            <Text style={{ fontSize:11, color:C.inactive, letterSpacing:0.5, textTransform:'uppercase' }}>{g.label}</Text>
            {g.data.map(tx => (
              <View key={tx.id} style={{ backgroundColor:C.bg1, borderRadius:12, padding:12, flexDirection:'row', alignItems:'center', gap:12, borderWidth:0.5, borderColor:C.border1 }}>
                <View style={{ width:38, height:38, borderRadius:10, backgroundColor:tx.ibg, alignItems:'center', justifyContent:'center' }}>
                  <Ionicons name={tx.icon} size={18} color={tx.ic} />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:14, color:C.text1, fontWeight:'500' }}>{tx.name}</Text>
                  <Text style={{ fontSize:12, color:C.text3 }}>{tx.cat}</Text>
                </View>
                <Text style={{ fontSize:14, fontWeight:'500', color: tx.neg ? C.accent : C.warm }}>{tx.amount}</Text>
              </View>
            ))}
          </View>
        ))}
        <View style={{ height:24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}