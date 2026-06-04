import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { transactionsApi, categoriesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';

const FILTERS = [
  "Vse", "Hrana", "Restavracije", "Kavarne", "Prevoz",
  "Zabava", "Zdravje", "Oblačila", "Sport", "Potovanje", "Ostalo",
];

const DEFAULT_COLLECTIONS = [
  "Hrana", "Restavracije", "Kavarne", "Prevoz", "Zabava",
  "Zdravje", "Oblačila", "Sport", "Potovanje", "Ostalo",
];

const CATEGORY_MAP: Record<string, string> = {
  'Hrana': 'Food & Dining',
  'Restavracije': 'Food & Dining',
  'Kavarne': 'Food & Dining',
  'Prevoz': 'Transport',
  'Zabava': 'Entertainment',
  'Zdravje': 'Health',
  'Oblačila': 'Shopping',
  'Sport': 'Health',
  'Potovanje': 'Transport',
};

interface InvoiceData {
  merchant: string;
  amount: string;
  date: string;
  category: string;
  note: string;
  collection: string;
}

interface ParsedInvoice {
  merchant: string;
  amount: string;
  date: string;
  category: string;
}

async function parseReceiptViaBackend(base64Image: string): Promise<ParsedInvoice> {
  try {
    const response = await api.post("/ai-chat/parse-receipt",
      { imageBase64: base64Image },
      { timeout: 60_000 }
    );
    const parsed = response.data?.data;
    return {
      merchant: parsed?.merchant ?? "",
      amount: String(parsed?.amount ?? ""),
      date: parsed?.date ?? new Date().toLocaleDateString("sl-SI"),
      category: parsed?.category ?? "Ostalo",
    };
  } catch (e: any) {
    console.error('STATUS:', e?.response?.status);
    console.error('BACKEND ERROR:', JSON.stringify(e?.response?.data, null, 2));
    throw e;
  }
}

function FilterBar({ active, setActive, C }: { active: string; setActive: (f: string) => void; C: any }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: "row" }}
    >
      {FILTERS.map((f) => (
        <TouchableOpacity
          key={f}
          onPress={() => setActive(f)}
          style={{
            paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
            borderWidth: 0.5,
            borderColor: active === f ? C.accent : C.border2,
            backgroundColor: active === f ? C.accent : C.bg1,
          }}
        >
          <Text style={{ fontSize: 12, color: active === f ? C.text1 : C.text3 }}>{f}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Transaction Card z brisanjem in urejanjem ────────────────────────────────
function TxCard({ tx, C, onDelete, onEdit }: { tx: any; C: any; onDelete: () => void; onEdit: () => void }) {
  const isExpense = tx.type === 'EXPENSE';

  const confirmDelete = () => {
    Alert.alert(
      'Izbriši transakcijo',
      `Ali res želiš izbrisati "${tx.description}"?`,
      [
        { text: 'Prekliči', style: 'cancel' },
        { text: 'Izbriši', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <View style={{
      backgroundColor: C.bg1, borderRadius: 12, padding: 12,
      flexDirection: "row", alignItems: "center", gap: 12,
      borderWidth: 0.5, borderColor: C.border1,
    }}>
      <View style={{
        width: 38, height: 38, borderRadius: 10, backgroundColor: C.border2,
        alignItems: "center", justifyContent: "center",
      }}>
        <Text style={{ fontSize: 18 }}>
          {tx.category?.icon ?? (isExpense ? '💸' : '💚')}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, color: C.text1, fontWeight: "500" }}>{tx.description}</Text>
        <Text style={{ fontSize: 12, color: C.text3 }}>
          {tx.type === 'INCOME' ? 'Prihodek' : (Object.entries(CATEGORY_MAP).find(([, eng]) => eng === tx.category?.name)?.[0] ?? tx.category?.name ?? 'Nekategorizirano')} · {tx.date?.split('T')[0]}
        </Text>
      </View>
      <Text style={{ fontSize: 14, fontWeight: "500", color: isExpense ? C.accent : C.warm }}>
        {isExpense ? '-' : '+'}€{parseFloat(tx.amount).toFixed(2)}
      </Text>
      <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="pencil-outline" size={18} color={C.text3} />
      </TouchableOpacity>
      <TouchableOpacity onPress={confirmDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={18} color={C.accent} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ visible, tx, onClose, onSave, C }: any) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (visible && tx) {
      setDescription(tx.description ?? '');
      setAmount(String(parseFloat(tx.amount).toFixed(2)));
      setCategory(tx.category?.name ?? '');
    }
  }, [visible, tx]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: C.bg2, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ color: C.text1, fontSize: 18, fontWeight: "600" }}>✏️ Uredi transakcijo</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close-circle" size={24} color={C.text3} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 11, color: C.text3, marginBottom: 4, textTransform: "uppercase" }}>Opis</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholderTextColor={C.text3}
                style={{ backgroundColor: C.inputBg, borderRadius: 10, padding: 12, color: C.text1, borderWidth: 0.5, borderColor: C.border2, marginBottom: 16 }}
              />

              <Text style={{ fontSize: 11, color: C.text3, marginBottom: 4, textTransform: "uppercase" }}>Znesek</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholderTextColor={C.text3}
                style={{ backgroundColor: C.inputBg, borderRadius: 10, padding: 12, color: C.text1, borderWidth: 0.5, borderColor: C.border2, marginBottom: 16 }}
              />

              <Text style={{ fontSize: 11, color: C.text3, marginBottom: 8, textTransform: "uppercase" }}>Kategorija</Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {["Hrana", "Restavracije", "Kavarne", "Prevoz", "Zabava", "Zdravje", "Oblačila", "Sport", "Potovanje", "Ostalo"].map((cat) => {
                  const englishName = CATEGORY_MAP[cat] ?? cat;
                  const isSelected = category === englishName;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(englishName)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                        backgroundColor: isSelected ? C.accent : C.inputBg,
                        borderWidth: 0.5,
                        borderColor: isSelected ? C.accent : C.border2,
                      }}
                    >
                      <Text style={{ color: isSelected ? C.text1 : C.text3, fontSize: 13 }}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => onSave({ description, amount, category })}
              style={{ backgroundColor: C.accent, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 4, marginBottom: Platform.OS === 'ios' ? 20 : 0 }}
            >
              <Text style={{ color: C.text1, fontWeight: "600", fontSize: 15 }}>💾 Shrani</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function InvoiceFormModal({ visible, data, collections, onClose, onSave, C }: any) {
  const [form, setForm] = useState<InvoiceData>({
    merchant: "", amount: "", date: "", category: "Ostalo", note: "", collection: "Ostalo",
  });

  useEffect(() => {
    if (visible) {
      setForm({
        merchant: data.merchant ?? "",
        amount: data.amount ?? "",
        date: data.date ?? "",
        category: data.category ?? "Ostalo",
        note: "",
        collection: data.category ?? "Ostalo",
      });
    }
  }, [visible, data]);

  const field = (label: string, key: keyof InvoiceData, keyboard: any = "default") => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 11, color: C.text3, marginBottom: 4, textTransform: "uppercase" }}>
        {label}
      </Text>
      <TextInput
        value={form[key]}
        onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
        keyboardType={keyboard}
        placeholderTextColor={C.text3}
        style={{
          backgroundColor: C.inputBg, borderRadius: 10, padding: 12,
          color: C.text1, borderWidth: 0.5, borderColor: C.border2,
        }}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: C.bg2, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ color: C.text1, fontSize: 18, fontWeight: "600" }}>📄 Račun</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close-circle" size={24} color={C.text3} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {field("Trgovec / Naziv", "merchant")}
              {field("Znesek", "amount", "decimal-pad")}
              {field("Datum", "date")}

              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 11, color: C.text3, marginBottom: 8, textTransform: "uppercase" }}>
                  Kategorija
                </Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {["Hrana", "Restavracije", "Kavarne", "Prevoz", "Zabava", "Zdravje", "Oblačila", "Sport", "Potovanje", "Ostalo"].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setForm((f) => ({ ...f, category: cat }))}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                        backgroundColor: form.category === cat ? C.accent : C.inputBg,
                        borderWidth: 0.5,
                        borderColor: form.category === cat ? C.accent : C.border2,
                      }}
                    >
                      <Text style={{ color: form.category === cat ? C.text1 : C.text3, fontSize: 13 }}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {field("Opomba", "note")}
            </ScrollView>

            <TouchableOpacity
              onPress={() => onSave(form)}
              style={{ backgroundColor: C.accent, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 10 }}
            >
              <Text style={{ color: C.text1, fontWeight: "600", fontSize: 15 }}>💾 Shrani</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function TransactionsScreen() {
  const { colors: C } = useTheme();
  const [active, setActive] = useState("Vse");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [collections] = useState(DEFAULT_COLLECTIONS);
  const [scanning, setScanning] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [parsedInvoice, setParsedInvoice] = useState<Partial<InvoiceData>>({});
  const [editVisible, setEditVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  const { isReady, isAuthenticated } = useAuth();

  const filterTx = () => {
    if (active === 'Vse') return transactions;
    const englishName = CATEGORY_MAP[active];
    if (!englishName) return transactions;
    return transactions.filter((t) => t.category?.name === englishName);
  };

  const fetchTransactions = useCallback(async () => {
    if (!isReady || !isAuthenticated) return;
    try {
      const res = await transactionsApi.getAll();
      setTransactions(res.data ?? []);
    } catch (err) {
      console.error('Napaka pri nalaganju transakcij:', err);
    }
  }, [isReady, isAuthenticated]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleDelete = async (id: string) => {
    try {
      await transactionsApi.delete(id);
      await fetchTransactions();
    } catch (err) {
      Alert.alert('Napaka', 'Transakcije ni bilo mogoče izbrisati.');
    }
  };

  const handleEdit = (tx: any) => {
    setEditingTx(tx);
    setEditVisible(true);
  };

const handleEditSave = async ({ description, amount, category }: { description: string; amount: string; category: string }) => {
  try {
    const amountNum = parseFloat(amount.replace(/[^0-9.]/g, '') || '0');
    const allCategories = await categoriesApi.getAll();
    const matched = allCategories.find((c: any) => c.name.toLowerCase() === category.toLowerCase());
    await transactionsApi.update(editingTx.id, {
      description,
      amount: amountNum,
      ...(matched && { categoryId: matched.id }),
    });
    setEditVisible(false);
    setEditingTx(null);
    await fetchTransactions();
  } catch (err) {
    Alert.alert('Napaka', 'Transakcije ni bilo mogoče posodobiti.');
  }
};

  const handleScan = async () => {
    const galleryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();

    Alert.alert("Skeniraj račun", "Izberi vir slike", [
      {
        text: "📷 Kamera",
        onPress: async () => {
          if (camPerm.status !== "granted") { Alert.alert("Dovoli dostop do kamere"); return; }
          const result = await ImagePicker.launchCameraAsync({ quality: 1 });
          if (!result.canceled) await processImage(result.assets[0]);
        },
      },
      {
        text: "🖼 Galerija",
        onPress: async () => {
          if (galleryPerm.status !== "granted") { Alert.alert("Dovoli dostop do galerije"); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8 });
          if (!result.canceled) await processImage(result.assets[0]);
        },
      },
      { text: "Prekliči", style: "cancel" },
    ]);
  };

  const processImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setScanning(true);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (!manipulated.base64) throw new Error('Kompresija slike ni uspela');
      const parsed = await parseReceiptViaBackend(manipulated.base64);
      setParsedInvoice({ merchant: parsed.merchant, amount: parsed.amount, date: parsed.date, category: parsed.category, note: '', collection: parsed.category });
      setFormVisible(true);
    } catch (e: any) {
      Alert.alert('Napaka', e?.message ?? 'Računa ni bilo mogoče analizirati.');
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async (data: InvoiceData) => {
    try {
      const cleanAmount = String(data.amount).replace(/[^0-9.]/g, '');
      const amountNum = parseFloat(cleanAmount || '0');
      const allCategories = await categoriesApi.getAll();
      const englishName = CATEGORY_MAP[data.category] ?? data.category;
      const matched = allCategories.find((c: any) => c.name.toLowerCase() === englishName.toLowerCase());
      await transactionsApi.create({
        type: 'EXPENSE',
        amount: amountNum,
        description: data.merchant || 'Skeniran račun',
        date: data.date || new Date().toISOString().split('T')[0],
        ...(matched && { categoryId: matched.id }),
      });
      await fetchTransactions();
      setFormVisible(false);
    } catch (err: any) {
      console.error('handleSave error:', JSON.stringify(err?.response?.data, null, 2));
      Alert.alert('Napaka', 'Transakcije ni bilo mogoče shraniti.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={{ backgroundColor: C.bg1, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: C.border1 }}>
        <Text style={{ fontSize: 18, fontWeight: "500", color: C.text1 }}>Transakcije</Text>
        <Text style={{ fontSize: 13, color: C.text3, marginTop: 2 }}>
          {new Date().toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' })}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <FilterBar active={active} setActive={setActive} C={C} />

        <TouchableOpacity
          onPress={handleScan}
          disabled={scanning}
          style={{
            backgroundColor: scanning ? C.inactive : C.accent,
            borderRadius: 12, padding: 13, marginHorizontal: 16, marginBottom: 12,
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {scanning
            ? <ActivityIndicator size="small" color={C.text1} />
            : <Ionicons name="camera" size={18} color={C.text1} />
          }
          <Text style={{ fontSize: 14, color: C.text1, fontWeight: "500" }}>
            {scanning ? "AI analizira račun..." : "Skeniraj račun"}
          </Text>
        </TouchableOpacity>

        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {filterTx().map((tx) => (
            <TxCard
              key={tx.id}
              tx={tx}
              C={C}
              onDelete={() => handleDelete(tx.id)}
              onEdit={() => handleEdit(tx)}
            />
          ))}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      <InvoiceFormModal
        visible={formVisible}
        data={parsedInvoice}
        collections={collections}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
        C={C}
      />

      <EditModal
        visible={editVisible}
        tx={editingTx}
        onClose={() => { setEditVisible(false); setEditingTx(null); }}
        onSave={handleEditSave}
        C={C}
      />
    </SafeAreaView>
  );
}