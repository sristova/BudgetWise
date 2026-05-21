import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';
import { aiChatApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';


const C = {
  bg1:'#070508', bg2:'#0D090C', card:'#120810',
  accent:'#A0263A', warm:'#C4967A',
  border1:'#251018', border2:'#3D1020',
  text1:'#F5EEE8', text2:'#C8B8B0', text3:'#5C4A50',
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { isReady, isAuthenticated } = useAuth();


  // Load chat history securely on mount
  useEffect(() => {
  if (!isReady || !isAuthenticated) return;
  async function loadHistory() {
    try {
      const history = await aiChatApi.getHistory();
      setMessages(history ?? []);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error("Failed to load chat history", err);
    }
  }
  loadHistory();
}, [isReady, isAuthenticated]);

  async function send(textToSend?: string) {
    const targetText = textToSend ?? input;
    if (!targetText.trim() || loading) return;

    if (!textToSend) setInput('');
    
    const userMsg: Message = { id: String(Date.now()), role: 'user', content: targetText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      // Securely calling the backend API instance with automatic dynamic token injection
      const response = await aiChatApi.sendMessage(targetText);
      const assistantMsg: Message = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: response?.reply ?? response ?? "Oprostite, prišlo je do napake.",
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: "Napaka pri komunikaciji s strežnikom. Preverite povezavo.",
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex:1, backgroundColor:C.bg2 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex:1 }}>
        
        {/* Header */}
        <View style={{ padding:16, backgroundColor:C.bg1, borderBottomWidth:0.5, borderBottomColor:C.border1, flexDirection:'row', alignItems:'center', gap:10 }}>
          <View style={{ width:8, height:8, borderRadius:4, backgroundColor:'#6FCFA0' }} />
          <Text style={{ fontSize:16, fontWeight:'600', color:C.text1 }}>BudgetWise AI Asistent</Text>
        </View>

        {/* Messages */}
        <ScrollView ref={scrollRef} style={{ flex:1, padding:16 }} contentContainerStyle={{ paddingBottom:10 }}>
          {messages.length === 0 && (
            <View style={{ alignItems:'center', marginTop:40, paddingHorizontal:20 }}>
              <Text style={{ fontSize:32, marginBottom:12 }}>🤖</Text>
              <Text style={{ color:C.text1, fontSize:15, fontWeight:'600', marginBottom:4 }}>Pozdravljeni!</Text>
              <Text style={{ color:C.text3, fontSize:13, textAlign:'center', marginBottom:20 }}>
                Sem vaš osebni finančni svetovalec. Kako vam lahko pomagam danes?
              </Text>
            </View>
          )}

          {messages.map(m => (
            <View key={m.id} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor: m.role === 'user' ? C.accent : C.card,
              borderWidth: m.role === 'user' ? 0 : 0.5,
              borderColor: C.border1,
              borderRadius:16, paddingHorizontal:14, paddingVertical:10,
              maxWidth:'85%', marginBottom:12,
            }}>
              <Text style={{ fontSize:14, color:C.text1, lineHeight:20 }}>{m.content}</Text>
            </View>
          ))}

          {loading && (
            <View style={{ alignSelf:'flex-start', backgroundColor:C.card, borderRadius:16, paddingHorizontal:14, paddingVertical:10, borderBottomWidth:0.5, borderColor:C.border1 }}>
              <Text style={{ color:C.text3, fontSize:13 }}>Razmišljam...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input Footer Bar */}
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