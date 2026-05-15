import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const C = {
  bg1: '#070508', bg2: '#0D090C', card: '#120810',
  accent: '#A0263A', warm: '#C4967A', deep: '#7A1A2E', muted: '#8C6A5A',
  border1: '#251018', border2: '#3D1020',
  text1: '#F5EEE8', text2: '#C8B8B0', text3: '#5C4A50',
};

const DAYS = ['P','T','S','Č','P','S','N'];
const BARS = [30,55,20,70,45,60,85];
const TXS = [
  { id:1, name:'Mercator', cat:'🛒 Hrana', amount:'-€24,80', neg:true, icon:'cart' as const, ibg:'#2A0D14', ic:C.accent },
  { id:2, name:'Moj Bus',  cat:'🚌 Prevoz', amount:'-€2,10', neg:true, icon:'bus' as const, ibg:'#1E0D12', ic:C.warm },
  { id:3, name:'Štipendija', cat:'💰 Prihodek', amount:'+€200', neg:false, icon:'arrow-down' as const, ibg:'#1A0D14', ic:C.warm },
];

export default function HomeScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg2 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:C.bg1, paddingHorizontal:20, paddingVertical:14 }}>
          <View>
            <Text style={{ fontSize:12, color:C.text3 }}>Dober dan,</Text>
            <Text style={{ fontSize:17, fontWeight:'500', color:C.text1 }}>Stojka 👋</Text>
          </View>
          <View style={{ width:36, height:36, borderRadius:18, backgroundColor:C.card, borderWidth:0.5, borderColor:'#5C1A28', alignItems:'center', justifyContent:'center' }}>
            <Text style={{ color:C.accent, fontWeight:'600', fontSize:14 }}>S</Text>
          </View>
        </View>

        <View style={{ backgroundColor:C.accent, margin:16, borderRadius:16, padding:20 }}>
          <Text style={{ fontSize:11, color:'rgba(245,238,232,0.7)', letterSpacing:0.08 }}>SKUPNI SALDO</Text>
          <Text style={{ fontSize:32, fontWeight:'500', color:C.text1, marginTop:4, marginBottom:16 }}>€1.842,50</Text>
          <View style={{ flexDirection:'row', gap:12 }}>
            <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.25)', borderRadius:10, padding:10 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <Ionicons name="arrow-down" size={12} color={C.warm} />
                <Text style={{ fontSize:10, color:'rgba(245,238,232,0.75)' }}>Prihodki</Text>
              </View>
              <Text style={{ fontSize:15, fontWeight:'500', color:C.text1, marginTop:3 }}>€2.200</Text>
            </View>
            <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.25)', borderRadius:10, padding:10 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <Ionicons name="arrow-up" size={12} color={C.accent} />
                <Text style={{ fontSize:10, color:'rgba(245,238,232,0.75)' }}>Stroški</Text>
              </View>
              <Text style={{ fontSize:15, fontWeight:'500', color:C.text1, marginTop:3 }}>€357,50</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal:16, marginBottom:8 }}>
          <Text style={{ fontSize:11, color:C.text3, letterSpacing:0.08, marginBottom:10, textTransform:'uppercase' }}>HITRI DOSTOP</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:16 }}>
            {[
              { label:'Dodaj strošek', icon:'add-circle-outline' as const, screen:'/transactions' },
              { label:'Skeniraj račun', icon:'camera-outline' as const, screen:'/transactions' },
              { label:'Cilji', icon:'flag-outline' as const, screen:'/goals' },
              { label:'AI asistent', icon:'chatbubble-ellipses-outline' as const, screen:'/assistant' },
            ].map(a => (
              <TouchableOpacity key={a.label} onPress={() => router.push(a.screen as any)}
                style={{ width:(width-42)/2, backgroundColor:C.bg1, borderWidth:0.5, borderColor:C.border2, borderRadius:12, padding:12, flexDirection:'row', alignItems:'center', gap:8 }}>
                <Ionicons name={a.icon} size={20} color={C.accent} />
                <Text style={{ fontSize:13, color:C.text1 }}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal:16, marginBottom:8 }}>
          <Text style={{ fontSize:11, color:C.text3, letterSpacing:0.08, marginBottom:10, textTransform:'uppercase' }}>TA TEDEN</Text>
          <View style={{ backgroundColor:C.bg1, borderRadius:12, padding:14, marginBottom:16, borderWidth:0.5, borderColor:C.border2 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:12 }}>
              <Text style={{ fontSize:12, color:C.text3 }}>Poraba</Text>
              <Text style={{ fontSize:12, fontWeight:'500', color:C.text1 }}>€357,50</Text>
            </View>
            <View style={{ flexDirection:'row', alignItems:'flex-end', gap:6, height:72 }}>
              {BARS.map((h,i) => (
                <View key={i} style={{ flex:1, alignItems:'center', justifyContent:'flex-end', gap:4 }}>
                  <View style={{ width:'100%', borderRadius:4, height:(h/100)*60, backgroundColor: i===6 ? C.accent : C.border2 }} />
                  <Text style={{ fontSize:9, color:C.text3 }}>{DAYS[i]}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal:16, marginBottom:8 }}>
          <Text style={{ fontSize:11, color:C.text3, letterSpacing:0.08, marginBottom:10, textTransform:'uppercase' }}>ZADNJE TRANSAKCIJE</Text>
          <View style={{ gap:8 }}>
            {TXS.map(tx => (
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
        </View>
        <View style={{ height:24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}