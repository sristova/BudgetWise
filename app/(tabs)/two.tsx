import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// ─── Theme ───────────────────────────────────────────────────────────────────
const C = {
  bg1: '#070508', bg2: '#0D090C', card: '#120810',
  accent: '#A0263A', warm: '#C4967A',
  border1: '#251018', border2: '#3D1020',
  text1: '#F5EEE8', text2: '#C8B8B0', text3: '#5C4A50', inactive: '#3A1820',
  success: '#2A6B3C', successText: '#6FCFA0',
  inputBg: '#0F0710',
};

// ─── Static data ─────────────────────────────────────────────────────────────
const FILTERS = ['Vse', 'Hrana', 'Prevoz', 'Zabava', 'Ostalo'];

const TODAY_INIT = [
  { id: 1, name: 'Mercator', cat: '🛒 Hrana · AI razvrščeno', amount: '-€24,80', neg: true, icon: 'cart' as const, ibg: '#2A0D14', ic: C.accent, collection: 'Hrana' },
  { id: 2, name: 'Moj Bus', cat: '🚌 Prevoz · AI razvrščeno', amount: '-€2,10', neg: true, icon: 'bus' as const, ibg: '#1E0D12', ic: C.warm, collection: 'Prevoz' },
];
const YESTERDAY_INIT = [
  { id: 3, name: 'Steam', cat: '🎮 Zabava', amount: '-€14,99', neg: true, icon: 'game-controller' as const, ibg: '#251018', ic: '#8C6A5A', collection: 'Zabava' },
  { id: 4, name: 'Spotify', cat: '🎵 Zabava', amount: '-€5,99', neg: true, icon: 'musical-notes' as const, ibg: '#1A0D14', ic: '#7A1A2E', collection: 'Zabava' },
];

const DEFAULT_COLLECTIONS = ['Hrana', 'Prevoz', 'Zabava', 'Ostalo', 'Noč ven'];

// ─── OCR helpers ─────────────────────────────────────────────────────────────

const GOOGLE_VISION_KEY = 'YOUR_API_KEY'; // ← paste key here

async function runGoogleVisionOCR(base64Image: string): Promise<string> {
  const body = {
    requests: [{
      image: { content: base64Image },
      features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
    }],
  };
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );
  const json = await res.json();
  return json.responses?.[0]?.fullTextAnnotation?.text ?? '';
}

/**
 * Option B – On-device ML Kit (free, no key needed).
 */

function mockOCR(): string {
  const merchants = ['Mercator', 'Lidl', 'Spar', 'Hofer', 'Tuš'];
  const amounts = ['12,40', '34,99', '8,50', '55,20', '22,75'];
  const m = merchants[Math.floor(Math.random() * merchants.length)];
  const a = amounts[Math.floor(Math.random() * amounts.length)];
  return `RAČUN\n${m} d.o.o.\nDatum: 15.05.2026\nSKUPAJ: €${a}\nHVALA ZA OBISK`;
}

/** Parse raw OCR text into structured fields. */
function parseInvoice(raw: string) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const merchantLine = lines.find(l => !l.match(/^ra.?un/i) && !l.match(/^datum/i) && !l.match(/skupaj/i) && !l.match(/hvala/i));
  const merchant = merchantLine?.replace(/d\.o\.o\.|d\.d\.|s\.p\./gi, '').trim() ?? '';

  // Amount
  const amountMatch = raw.match(/(?:skupaj|total|znesek)[^\d]*(\d[\d.,]+)/i)
    ?? raw.match(/€\s*(\d[\d.,]+)/)
    ?? raw.match(/(\d+[.,]\d{2})\s*€?/);
  const amount = amountMatch ? amountMatch[1].replace(',', '.') : '';

  // Date
  const dateMatch = raw.match(/(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})/);
  const date = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('sl-SI');

  // Naive category guess
  const lower = raw.toLowerCase();
  let category = 'Ostalo';
  if (lower.includes('mercator') || lower.includes('lidl') || lower.includes('spar') || lower.includes('hofer') || lower.includes('tuš')) category = 'Hrana';
  else if (lower.includes('bus') || lower.includes('vlak') || lower.includes('petrol') || lower.includes('marprom')) category = 'Prevoz';
  else if (lower.includes('kino') || lower.includes('game') || lower.includes('steam')) category = 'Zabava';

  return { merchant, amount, date, category, raw };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterBar({ active, setActive }: { active: string; setActive: (f: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: 'row' }}>
      {FILTERS.map(f => (
        <TouchableOpacity key={f} onPress={() => setActive(f)}
          style={{
            paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
            borderWidth: 0.5, borderColor: active === f ? C.accent : C.border2,
            backgroundColor: active === f ? C.accent : C.bg1,
          }}>
          <Text style={{ fontSize: 12, color: active === f ? C.text1 : C.text3 }}>{f}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function TxCard({ tx }: { tx: typeof TODAY_INIT[0] }) {
  return (
    <View style={{
      backgroundColor: C.bg1, borderRadius: 12, padding: 12,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 0.5, borderColor: C.border1,
    }}>
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: tx.ibg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={tx.icon} size={18} color={tx.ic} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, color: C.text1, fontWeight: '500' }}>{tx.name}</Text>
        <Text style={{ fontSize: 12, color: C.text3 }}>{tx.cat}</Text>
        {tx.collection ? (
          <View style={{ marginTop: 3, alignSelf: 'flex-start', backgroundColor: C.border2, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, color: C.text3 }}>{tx.collection}</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontSize: 14, fontWeight: '500', color: tx.neg ? C.accent : C.warm }}>{tx.amount}</Text>
    </View>
  );
}

// ─── Invoice Form Modal ───────────────────────────────────────────────────────

interface InvoiceData {
  merchant: string;
  amount: string;
  date: string;
  category: string;
  note: string;
  collection: string;
}

function InvoiceFormModal({
  visible, data, collections, onClose, onSave, onAddCollection,
}: {
  visible: boolean;
  data: Partial<InvoiceData>;
  collections: string[];
  onClose: () => void;
  onSave: (d: InvoiceData) => void;
  onAddCollection: (name: string) => void;
}) {
  const [form, setForm] = useState<InvoiceData>({
    merchant: '', amount: '', date: '', category: 'Ostalo', note: '', collection: collections[0] ?? 'Ostalo',
    ...data,
  });
  const [showCollPicker, setShowCollPicker] = useState(false);
  const [newCollName, setNewCollName] = useState('');

  // Sync when data prop changes (new scan)
  useState(() => { setForm(f => ({ ...f, ...data })); });

  const field = (label: string, key: keyof InvoiceData, keyboard?: 'default' | 'numeric' | 'decimal-pad') => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 11, color: C.text3, marginBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</Text>
      <TextInput
        value={form[key] as string}
        onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
        keyboardType={keyboard ?? 'default'}
        style={{
          backgroundColor: C.inputBg, borderRadius: 10, padding: 12,
          color: C.text1, fontSize: 14, borderWidth: 0.5, borderColor: C.border2,
        }}
        placeholderTextColor={C.text3}
        placeholder={`Vnesi ${label.toLowerCase()}…`}
      />
    </View>
  );

  const handleAddCollection = () => {
    const name = newCollName.trim();
    if (!name) return;
    onAddCollection(name);
    setForm(f => ({ ...f, collection: name }));
    setNewCollName('');
    setShowCollPicker(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(7,5,8,0.85)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.bg2, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, borderTopWidth: 0.5, borderColor: C.border2 }}>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: C.text1 }}>📄 Podrobnosti računa</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close-circle" size={24} color={C.text3} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {field('Trgovec / Prodajalec', 'merchant')}
              {field('Znesek (€)', 'amount', 'decimal-pad')}
              {field('Datum', 'date')}
              {field('Kategorija', 'category')}
              {field('Opomba', 'note')}

              {/* Collection picker */}
              <Text style={{ fontSize: 11, color: C.text3, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Kolekcija</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {collections.map(c => (
                    <TouchableOpacity key={c} onPress={() => setForm(f => ({ ...f, collection: c }))}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
                        backgroundColor: form.collection === c ? C.accent : C.inputBg,
                        borderWidth: 0.5, borderColor: form.collection === c ? C.accent : C.border2,
                      }}>
                      <Text style={{ color: form.collection === c ? C.text1 : C.text3, fontSize: 13 }}>{c}</Text>
                    </TouchableOpacity>
                  ))}

                  {/* Add new collection */}
                  <TouchableOpacity onPress={() => setShowCollPicker(p => !p)}
                    style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 0.5, borderColor: C.border2, backgroundColor: C.inputBg, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="add" size={14} color={C.warm} />
                    <Text style={{ color: C.warm, fontSize: 13 }}>Nova</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {showCollPicker && (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  <TextInput
                    value={newCollName}
                    onChangeText={setNewCollName}
                    placeholder="Ime kolekcije…"
                    placeholderTextColor={C.text3}
                    style={{ flex: 1, backgroundColor: C.inputBg, borderRadius: 10, padding: 10, color: C.text1, borderWidth: 0.5, borderColor: C.border2, fontSize: 14 }}
                  />
                  <TouchableOpacity onPress={handleAddCollection}
                    style={{ backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' }}>
                    <Text style={{ color: C.text1, fontWeight: '600' }}>Dodaj</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Save button */}
              <TouchableOpacity onPress={() => onSave(form)}
                style={{ backgroundColor: C.accent, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 }}>
                <Text style={{ color: C.text1, fontWeight: '600', fontSize: 15 }}>💾 Shrani transakcijo</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const [active, setActive] = useState('Vse');
  const [todayTx, setTodayTx] = useState(TODAY_INIT as any[]);
  const [yesterdayTx] = useState(YESTERDAY_INIT as any[]);
  const [collections, setCollections] = useState<string[]>(DEFAULT_COLLECTIONS);

  const [scanning, setScanning] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [parsedInvoice, setParsedInvoice] = useState<Partial<InvoiceData>>({});

  // Filter transactions
  const filterTx = (txs: any[]) =>
    active === 'Vse' ? txs : txs.filter(t => t.collection === active || t.cat?.includes(active));

  const handleScan = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      // Also try camera
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();

      // Let user choose camera or gallery
      Alert.alert(
        'Skeniraj račun',
        'Izberi vir slike',
        [
          {
            text: '📷 Kamera', onPress: async () => {
              if (camPerm.status !== 'granted') { Alert.alert('Dovoljenje zavrnjeno'); return; }
              const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 });
              if (!result.canceled) await processImage(result.assets[0]);
            },
          },
          {
            text: '🖼 Galerija', onPress: async () => {
              if (status !== 'granted') { Alert.alert('Dovoljenje zavrnjeno'); return; }
              const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8 });
              if (!result.canceled) await processImage(result.assets[0]);
            },
          },
          { text: 'Prekliči', style: 'cancel' },
        ],
      );
    } catch (e) {
      Alert.alert('Napaka', 'Skeniranje ni uspelo.');
    }
  };

  const processImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setScanning(true);
    try {
      let rawText = '';

      if (GOOGLE_VISION_KEY !== 'YOUR_API_KEY' && asset.base64) {
        // Real OCR via Google Vision
        rawText = await runGoogleVisionOCR(asset.base64);
      } else {
        // Demo mode – mock OCR
        await new Promise(r => setTimeout(r, 1200)); // simulate network delay
        rawText = mockOCR();
      }

      const parsed = parseInvoice(rawText);
      setParsedInvoice({
        merchant: parsed.merchant,
        amount: parsed.amount,
        date: parsed.date,
        category: parsed.category,
        note: '',
        collection: parsed.category,
      });
      setFormVisible(true);
    } catch (e) {
      Alert.alert('OCR napaka', 'Besedila ni bilo mogoče prebrati. Prosim poskusite znova.');
    } finally {
      setScanning(false);
    }
  };

  const handleSave = (data: InvoiceData) => {
    const newTx = {
      id: Date.now(),
      name: data.merchant || 'Neznano',
      cat: `${data.category} · ručno dodano`,
      amount: `-€${parseFloat(data.amount || '0').toFixed(2).replace('.', ',')}`,
      neg: true,
      icon: 'receipt' as const,
      ibg: '#2A0D14',
      ic: C.warm,
      collection: data.collection,
      note: data.note,
    };
    setTodayTx(prev => [newTx, ...prev]);
    setFormVisible(false);
    setParsedInvoice({});
  };

  const handleAddCollection = (name: string) => {
    if (!collections.includes(name)) setCollections(prev => [...prev, name]);
  };

  const groups = [
    { label: 'DANES', data: filterTx(todayTx) },
    { label: 'VČERAJ', data: filterTx(yesterdayTx) },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg2 }}>
      {/* Header */}
      <View style={{ backgroundColor: C.bg1, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: C.border1 }}>
        <Text style={{ fontSize: 18, fontWeight: '500', color: C.text1 }}>Transakcije</Text>
        <Text style={{ fontSize: 13, color: C.text3, marginTop: 2 }}>Maj 2026</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <FilterBar active={active} setActive={setActive} />

        {/* Scan button */}
        <TouchableOpacity
          onPress={handleScan}
          disabled={scanning}
          style={{
            backgroundColor: scanning ? C.inactive : C.accent,
            borderRadius: 12, padding: 13,
            marginHorizontal: 16, marginBottom: 12,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {scanning
            ? <ActivityIndicator size="small" color={C.text1} />
            : <Ionicons name="camera" size={18} color={C.text1} />}
          <Text style={{ fontSize: 14, color: C.text1, fontWeight: '500' }}>
            {scanning ? 'Prepoznavam besedilo…' : 'Skeniraj račun (AI OCR)'}
          </Text>
        </TouchableOpacity>

        {/* Collections summary strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
          {collections.map(col => {
            const count = [...todayTx, ...yesterdayTx].filter(t => t.collection === col).length;
            if (!count) return null;
            return (
              <View key={col} style={{ backgroundColor: C.bg1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 0.5, borderColor: C.border1 }}>
                <Text style={{ color: C.text3, fontSize: 11 }}>{col}</Text>
                <Text style={{ color: C.text1, fontSize: 13, fontWeight: '600', marginTop: 2 }}>{count} transakcij</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Transaction groups */}
        {groups.map(g => g.data.length > 0 && (
          <View key={g.label} style={{ paddingHorizontal: 16, marginBottom: 12, gap: 8 }}>
            <Text style={{ fontSize: 11, color: C.inactive, letterSpacing: 0.5, textTransform: 'uppercase' }}>{g.label}</Text>
            {g.data.map(tx => <TxCard key={tx.id} tx={tx} />)}
          </View>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Invoice form modal */}
      <InvoiceFormModal
        visible={formVisible}
        data={parsedInvoice}
        collections={collections}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
        onAddCollection={handleAddCollection}
      />
    </SafeAreaView>
  );
}