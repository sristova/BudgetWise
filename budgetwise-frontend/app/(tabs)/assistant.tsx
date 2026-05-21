import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';

const C = {
  bg1:'#070508', bg2:'#0D090C', card:'#120810',
  accent:'#A0263A', warm:'#C4967A',
  border1:'#251018', border2:'#3D1020',
  text1:'#F5EEE8', text2:'#C8B8B0', text3:'#5C4A50',
};

// ─── Backend URL — nastavi v svojem .env ──────────────────────────────────────
// Expo: EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
const API_URL = "http://10.5.0.2:3000";

const SUGGESTIONS = [
  { id:1, icon:'help-circle-outline' as const, text:'Ali si lahko privoščim PS5 naslednji mesec?' },
  { id:2, icon:'trending-up-outline' as const, text:'Kako privarčujem za počitnice?' },
  { id:3, icon:'alert-circle-outline' as const, text:'Kje ljudje največ zapravijo?' },
  { id:4, icon:'bulb-outline' as const, text:'Daj mi nasvet za varčevanje.' },
];

type Msg = { id:number; role:'user'|'ai'; text:string };

// ─── Pomožna funkcija za JWT token ───────────────────────────────────────────
// Prilagodi glede na to, kje shranjuješ token (AsyncStorage, SecureStore, context...)

//HARDCODED ZA DEMO!!!!!!!
async function getAuthToken(): Promise<string> {
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OGYyYWU1MC0xOTU2LTQxYTItODQ1Ni0wNDMxYWRiZDJkMGEiLCJlbWFpbCI6ImRlbW9AYnVkZ2V0d2lzZS5hcHAiLCJpYXQiOjE3NzkxOTIzMTIsImV4cCI6MTc3OTE5MzIxMn0.nbnWiH-QcnwYQsebYXDXOMuEHYLNOSr5IBYT6C_vCJA";
}

export default function AssistantScreen() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  async function send(text?: string) {
    const msg = text ?? input.trim();
    if (!msg || loading) return;

    const userMsg: Msg = { id: Date.now(), role: 'user', text: msg };
    setMsgs(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 100);

    try {
      const token = await getAuthToken();

      const response = await fetch(`${API_URL}/api/v1/ai-chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: msg }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message ?? 'Napaka strežnika');
      }

      const aiText = data?.data?.message?.content ?? 'Prišlo je do napake. Poskusi znova.';
      setMsgs(p => [...p, { id: Date.now(), role: 'ai', text: aiText }]);
    } catch (err: any) {
      setMsgs(p => [...p, {
        id: Date.now(),
        role: 'ai',
        text: `❌ Napaka: ${err?.message ?? 'Preveri internet in prijavo.'}`,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg2 }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex:1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >

        {/* Header */}
        <View style={{
          flexDirection:'row', alignItems:'center', gap:10,
          backgroundColor:C.accent, paddingHorizontal:20, paddingVertical:16,
        }}>
          <Ionicons name="chatbubble-ellipses" size={22} color={C.text1} />
          <View style={{ flex:1 }}>
            <Text style={{ fontSize:16, fontWeight:'500', color:C.text1 }}>AI finančni asistent</Text>
            <Text style={{ fontSize:12, color:'rgba(245,238,232,0.75)', marginTop:2 }}>BudgetWise · Groq</Text>
          </View>
        </View>

        <ScrollView ref={ref} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow:1 }}>

          {/* Predlogi — vidni samo na začetku */}
          {msgs.length === 0 && (
            <View style={{ paddingHorizontal:16, gap:8, marginTop:16, marginBottom:8 }}>
              <Text style={{ fontSize:11, color:C.text3, letterSpacing:0.08, textTransform:'uppercase', marginBottom:4 }}>
                PREDLAGANA VPRAŠANJA
              </Text>
              {SUGGESTIONS.map(s => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => send(s.text)}
                  style={{
                    backgroundColor:C.bg1, borderWidth:0.5, borderColor:C.border2,
                    borderRadius:10, padding:12, flexDirection:'row', alignItems:'center', gap:10,
                  }}
                >
                  <Ionicons name={s.icon} size={16} color={C.accent} />
                  <Text style={{ fontSize:13, color:C.text2, flex:1 }}>{s.text}</Text>
                  <Ionicons name="chevron-forward" size={14} color={C.border2} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Sporočila */}
          <View style={{ paddingHorizontal:16, gap:10, paddingTop:4 }}>
            {msgs.map(m => (
              <View key={m.id} style={[
                { maxWidth:'85%', borderRadius:14, padding:12 },
                m.role === 'user'
                  ? { alignSelf:'flex-end', backgroundColor:C.accent, borderBottomRightRadius:4 }
                  : { alignSelf:'flex-start', backgroundColor:C.bg1, borderWidth:0.5, borderColor:C.border2, borderBottomLeftRadius:4 },
              ]}>
                <Text style={{ fontSize:13, lineHeight:20, color: m.role === 'user' ? C.text1 : C.text2 }}>
                  {m.text}
                </Text>
              </View>
            ))}

            {/* Loading indikator */}
            {loading && (
              <View style={{
                alignSelf:'flex-start', backgroundColor:C.bg1, borderWidth:0.5, borderColor:C.border2,
                borderRadius:14, borderBottomLeftRadius:4, padding:14,
                flexDirection:'row', gap:8, alignItems:'center',
              }}>
                <ActivityIndicator size="small" color={C.accent} />
                <Text style={{ fontSize:12, color:C.text3 }}>Razmišljam...</Text>
              </View>
            )}
          </View>

          <View style={{ height:16 }} />
        </ScrollView>

        {/* Input */}
        <View style={{
          flexDirection:'row', gap:8, padding:10,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          backgroundColor:C.bg1, borderTopWidth:0.5, borderTopColor:C.border1, alignItems:'center',
        }}>
          <TextInput
            style={{
              flex:1, backgroundColor:C.card, borderWidth:0.5, borderColor:C.border2,
              borderRadius:20, paddingHorizontal:14, paddingVertical:8,
              fontSize:13, color:C.text1,
            }}
            placeholder="Vprašaj asistenta..."
            placeholderTextColor={C.text3}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            editable={!loading}
            multiline={false}
          />
          <TouchableOpacity
            onPress={() => send()}
            disabled={loading}
            style={{
              width:36, height:36, borderRadius:18,
              backgroundColor: loading ? C.border2 : C.accent,
              alignItems:'center', justifyContent:'center',
            }}
          >
            <Ionicons name="send" size={15} color={C.text1} />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
