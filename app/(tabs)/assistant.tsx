import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';

const C = {
  bg1:'#070508', bg2:'#0D090C', card:'#120810',
  accent:'#A0263A', warm:'#C4967A',
  border1:'#251018', border2:'#3D1020',
  text1:'#F5EEE8', text2:'#C8B8B0', text3:'#5C4A50',
};
const SUGGESTIONS = [
  { id:1, icon:'help-circle-outline' as const, text:'Ali si lahko privoščim PS5 naslednji mesec?' },
  { id:2, icon:'trending-up-outline' as const, text:'Kako privarčujem za Španijo do julija?' },
  { id:3, icon:'alert-circle-outline' as const, text:'Kje največ zapravim?' },
];
type Msg = { id:number; role:'user'|'ai'; text:string };
const INIT: Msg[] = [
  { id:1, role:'user', text:'Kje največ zapravim?' },
  { id:2, role:'ai', text:'Ta mesec si največ porabila za hrano (€142) — to je 40% vseh stroškov. Sledi zabava (€68) in prevoz (€45).\n\n💡 Predlog: z €20 manj na hrano na teden dosežeš cilj za Španijo 3 tedne prej.' },
];

export default function AssistantScreen() {
  const [msgs, setMsgs] = useState<Msg[]>(INIT);
  const [input, setInput] = useState('');
  const ref = useRef<ScrollView>(null);

  function send(text?: string) {
    const msg = text ?? input.trim();
    if (!msg) return;
    setMsgs(p => [...p,
      { id:Date.now(), role:'user', text:msg },
      { id:Date.now()+1, role:'ai', text:'Analiziram tvoje podatke... 💭 Na podlagi tvojih zadnjih transakcij ti lahko povem več.' }
    ]);
    setInput('');
    setTimeout(() => ref.current?.scrollToEnd({ animated:true }), 100);
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg2 }}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:10, backgroundColor:C.accent, paddingHorizontal:20, paddingVertical:16 }}>
          <Ionicons name="chatbubble-ellipses" size={22} color={C.text1} />
          <View>
            <Text style={{ fontSize:16, fontWeight:'500', color:C.text1 }}>AI finančni asistent</Text>
            <Text style={{ fontSize:12, color:'rgba(245,238,232,0.75)', marginTop:2 }}>Pozna tvoje finance in cilje</Text>
          </View>
        </View>
        <ScrollView ref={ref} showsVerticalScrollIndicator={false}>
          <View style={{ padding:16, gap:8 }}>
            <Text style={{ fontSize:11, color:C.text3, letterSpacing:0.08, textTransform:'uppercase', marginBottom:4 }}>PREDLAGANA VPRAŠANJA</Text>
            {SUGGESTIONS.map(s => (
              <TouchableOpacity key={s.id} onPress={() => send(s.text)}
                style={{ backgroundColor:C.bg1, borderWidth:0.5, borderColor:C.border2, borderRadius:10, padding:10, flexDirection:'row', alignItems:'center', gap:8 }}>
                <Ionicons name={s.icon} size={16} color={C.accent} />
                <Text style={{ fontSize:13, color:C.text2, flex:1 }}>{s.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ paddingHorizontal:16, gap:10 }}>
            {msgs.map(m => (
              <View key={m.id} style={[
                { maxWidth:'85%', borderRadius:14, padding:12 },
                m.role==='user'
                  ? { alignSelf:'flex-end', backgroundColor:C.accent, borderBottomRightRadius:4 }
                  : { alignSelf:'flex-start', backgroundColor:C.bg1, borderWidth:0.5, borderColor:C.border2, borderBottomLeftRadius:4 }
              ]}>
                <Text style={{ fontSize:13, lineHeight:18, color: m.role==='user' ? C.text1 : C.text2 }}>{m.text}</Text>
              </View>
            ))}
          </View>
          <View style={{ height:12 }} />
        </ScrollView>
        <View style={{ flexDirection:'row', gap:8, padding:10, backgroundColor:C.bg1, borderTopWidth:0.5, borderTopColor:C.border1, alignItems:'center' }}>
          <TextInput
            style={{ flex:1, backgroundColor:C.card, borderWidth:0.5, borderColor:C.border2, borderRadius:20, paddingHorizontal:14, paddingVertical:8, fontSize:13, color:C.text1 }}
            placeholder="Vprašaj asistenta..." placeholderTextColor={C.text3}
            value={input} onChangeText={setInput} onSubmitEditing={() => send()} returnKeyType="send"
          />
          <TouchableOpacity onPress={() => send()} style={{ width:34, height:34, borderRadius:17, backgroundColor:C.accent, alignItems:'center', justifyContent:'center' }}>
            <Ionicons name="send" size={16} color={C.text1} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}