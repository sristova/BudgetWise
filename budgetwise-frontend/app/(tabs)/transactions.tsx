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

// ─── Prevodni slovar: DB ime → slovensko ime za prikaz ────────────────────────
// Pokriva vse možne vrednosti ki so lahko v bazi (angleške stare + slovenske nove)
export const CATEGORY_DISPLAY: Record<string, string> = {
  // Angleške (stare — za obstoječe uporabnike)
  'Food & Dining':  'Hrana in pijača',
  'Transport':      'Prevoz',
  'Entertainment':  'Zabava',
  'Health':         'Zdravje',
  'Shopping':       'Nakupovanje',
  'Housing':        'Stanovanje',
  'Education':      'Izobraževanje',
  'Salary':         'Plača',
  'Investment':     'Investicije',
  'Freelance':      'Freelance',
  'Other':          'Ostalo',
  // Slovenske (nove)
  'Hrana in pijača':       'Hrana in pijača',
  'Restavracije':          'Restavracije',
  'Kavarne':               'Kavarne',
  'Transport in avto':     'Prevoz',
  'Nakupovanje':           'Nakupovanje',
  'Stanovanje in stroški': 'Stanovanje',
  'Zabava in prosti čas':  'Zabava',
  'Zdravje in oskrba':     'Zdravje',
  'Sport in fitnes':       'Šport',
  'Izobraževanje':         'Izobraževanje',
  'Potovanje':             'Potovanje',
  'Ostalo':                'Ostalo',
  'Plača':                 'Plača',
  'Dodatni zaslužek':      'Dodatni zaslužek',
  'Investicije':           'Investicije',
  // Morebitne variante
  'Hrana':  'Hrana',
  'Prevoz': 'Prevoz',
};

// Pridobi slovensko ime za prikaz, z fallback na originalno ime
export function getCategoryLabel(dbName: string | undefined): string {
  if (!dbName) return 'Nekategorizirano';
  return CATEGORY_DISPLAY[dbName] ?? dbName;
}

interface InvoiceData {
  merchant: string;
  amount: string;
  date: string;
  category: string;
  note: string;
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

// ─── Filter Bar ───────────────────────────────────────────────────────────────
// Filtri se gradijo dinamično iz DB kategorij — ne statično
function FilterBar({
  active,
  setActive,
  C,
  dbCategories,
}: {
  active: string;
  setActive: (f: string) => void;
  C: any;
  dbCategories: Array<{ id: string; name: string; type: string }>;
}) {
  // Samo EXPENSE kategorije za filter + "Vse"
  const expenseCategories = dbCategories.filter(c => c.type === 'EXPENSE');

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: "row" }}
    >
      {/* "Vse" filter */}
      <TouchableOpacity
        onPress={() => setActive('Vse')}
        style={{
          paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
          borderWidth: 0.5,
          borderColor: active === 'Vse' ? C.accent : C.border2,
          backgroundColor: active === 'Vse' ? C.accent : C.bg1,
        }}
      >
        <Text style={{ fontSize: 12, color: active === 'Vse' ? C.text1 : C.text3 }}>Vse</Text>
      </TouchableOpacity>

      {/* Dinamični filtri iz DB */}
      {expenseCategories.map((cat) => {
        const label = getCategoryLabel(cat.name);
        const isActive = active === cat.name;
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setActive(cat.name)}
            style={{
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
              borderWidth: 0.5,
              borderColor: isActive ? C.accent : C.border2,
              backgroundColor: isActive ? C.accent : C.bg1,
            }}
          >
            <Text style={{ fontSize: 12, color: isActive ? C.text1 : C.text3 }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Transaction Card ─────────────────────────────────────────────────────────
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
          {tx.category?.icon ?? (isExpense ? '💸' : '💰')}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, color: C.text1, fontWeight: "500" }}>{tx.description}</Text>
        <Text style={{ fontSize: 12, color: C.text3 }}>
          {tx.type === 'INCOME'
            ? 'Prihodek'
            : getCategoryLabel(tx.category?.name)
          } · {tx.date?.split('T')[0]}
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
function EditModal({ visible, tx, onClose, onSave, C, dbCategories }: any) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');

  useEffect(() => {
    if (visible && tx) {
      setDescription(tx.description ?? '');
      setAmount(String(parseFloat(tx.amount).toFixed(2)));
      setCategoryId(tx.category?.id ?? '');
    }
  }, [visible, tx]);

  const expenseCategories = dbCategories.filter((c: any) => c.type === 'EXPENSE');

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
                {expenseCategories.map((cat: any) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setCategoryId(cat.id)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                        backgroundColor: isSelected ? C.accent : C.inputBg,
                        borderWidth: 0.5,
                        borderColor: isSelected ? C.accent : C.border2,
                      }}
                    >
                      <Text style={{ color: isSelected ? C.text1 : C.text3, fontSize: 13 }}>
                        {cat.icon} {getCategoryLabel(cat.name)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => onSave({ description, amount, categoryId })}
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

// ─── Invoice Form Modal ───────────────────────────────────────────────────────
function InvoiceFormModal({ visible, data, onClose, onSave, C, dbCategories }: any) {
  const [form, setForm] = useState<InvoiceData>({
    merchant: "", amount: "", date: "", category: "", note: "",
  });

  const expenseCategories = dbCategories.filter((c: any) => c.type === 'EXPENSE');

  useEffect(() => {
    if (visible && expenseCategories.length > 0) {
      // Poskusi najti kategorijo ki jo je vrnil AI (po imenu)
      const aiCategoryName = data.category ?? '';
      const matched = expenseCategories.find((c: any) =>
        c.name.toLowerCase() === aiCategoryName.toLowerCase() ||
        getCategoryLabel(c.name).toLowerCase() === aiCategoryName.toLowerCase()
      );
      setForm({
        merchant: data.merchant ?? "",
        amount: data.amount ?? "",
        date: data.date ?? "",
        category: matched?.id ?? expenseCategories[0]?.id ?? "",
        note: "",
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
                  {expenseCategories.map((cat: any) => {
                    const isSelected = form.category === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setForm((f) => ({ ...f, category: cat.id }))}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                          backgroundColor: isSelected ? C.accent : C.inputBg,
                          borderWidth: 0.5,
                          borderColor: isSelected ? C.accent : C.border2,
                        }}
                      >
                        <Text style={{ color: isSelected ? C.text1 : C.text3, fontSize: 13 }}>
                          {cat.icon} {getCategoryLabel(cat.name)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
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
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [parsedInvoice, setParsedInvoice] = useState<Partial<InvoiceData>>({});
  const [editVisible, setEditVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  const { isReady, isAuthenticated } = useAuth();

  // Filter po točnem category.name iz DB (string primerjava, brez mape)
  const filterTx = () => {
    if (active === 'Vse') return transactions;
    return transactions.filter((t) => t.category?.name === active);
  };

  const fetchCategories = useCallback(async () => {
    if (!isReady || !isAuthenticated) return;
    try {
      const cats = await categoriesApi.getAll();
      setDbCategories(cats ?? []);
    } catch (err) {
      console.error('Napaka pri nalaganju kategorij:', err);
    }
  }, [isReady, isAuthenticated]);

  const fetchTransactions = useCallback(async () => {
    if (!isReady || !isAuthenticated) return;
    try {
      const res = await transactionsApi.getAll();
      setTransactions(res.data ?? []);
    } catch (err) {
      console.error('Napaka pri nalaganju transakcij:', err);
    }
  }, [isReady, isAuthenticated]);

  useEffect(() => {
    fetchCategories();
    fetchTransactions();
  }, [fetchCategories, fetchTransactions]);

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

  const handleEditSave = async ({ description, amount, categoryId }: {
    description: string;
    amount: string;
    categoryId: string;
  }) => {
    try {
      const amountNum = parseFloat(amount.replace(/[^0-9.]/g, '') || '0');
      await transactionsApi.update(editingTx.id, {
        description,
        amount: amountNum,
        ...(categoryId && { categoryId }),
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
      setParsedInvoice({
        merchant: parsed.merchant,
        amount: parsed.amount,
        date: parsed.date,
        category: parsed.category,
        note: '',
      });
      setFormVisible(true);
    } catch (e: any) {
      Alert.alert('Napaka', e?.message ?? 'Računa ni bilo mogoče analizirati.');
    } finally {
      setScanning(false);
    }
  };

  // categoryId je zdaj direktno ID iz DB (ne ime)
  const handleSave = async (data: InvoiceData) => {
    try {
      const cleanAmount = String(data.amount).replace(/[^0-9.]/g, '');
      const amountNum = parseFloat(cleanAmount || '0');

      await transactionsApi.create({
        type: 'EXPENSE',
        amount: amountNum,
        description: data.merchant || 'Skeniran račun',
        date: data.date || new Date().toISOString().split('T')[0],
        ...(data.category && { categoryId: data.category }),
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
        <FilterBar
          active={active}
          setActive={setActive}
          C={C}
          dbCategories={dbCategories}
        />

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
          {filterTx().length === 0 && (
            <View style={{ backgroundColor: C.bg1, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 0.5, borderColor: C.border1 }}>
              <Text style={{ color: C.text3, fontSize: 13 }}>Ni transakcij v tej kategoriji.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      <InvoiceFormModal
        visible={formVisible}
        data={parsedInvoice}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
        C={C}
        dbCategories={dbCategories}
      />

      <EditModal
        visible={editVisible}
        tx={editingTx}
        onClose={() => { setEditVisible(false); setEditingTx(null); }}
        onSave={handleEditSave}
        C={C}
        dbCategories={dbCategories}
      />
    </SafeAreaView>
  );
}