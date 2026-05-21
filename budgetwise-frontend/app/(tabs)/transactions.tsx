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
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { transactionsApi, categoriesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// UVOZ URADNEGA API KLIENTA 
import { api } from '@/lib/api';

// ─── Theme 
const C = {
  bg1: "#070508",
  bg2: "#0D090C",
  card: "#120810",
  accent: "#A0263A",
  warm: "#C4967A",
  border1: "#251018",
  border2: "#3D1020",
  text1: "#F5EEE8",
  text2: "#C8B8B0",
  text3: "#5C4A50",
  inactive: "#3A1820",
  success: "#2A6B3C",
  successText: "#6FCFA0",
  inputBg: "#0F0710",
};

// ─── Static Data 
const FILTERS = [
  "Vse",
  "Hrana",
  "Restavracije",
  "Kavarne",
  "Prevoz",
  "Zabava",
  "Zdravje",
  "Oblačila",
  "Sport",
  "Potovanje",
  "Ostalo",
];

const DEFAULT_COLLECTIONS = [
  "Hrana",
  "Restavracije",
  "Kavarne",
  "Prevoz",
  "Zabava",
  "Zdravje",
  "Oblačila",
  "Sport",
  "Potovanje",
  "Ostalo",
];

// ─── Types 
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

// ─── Receipt parsing — Kliče backend preko uradne instance 
async function parseReceiptViaBackend(base64Image: string): Promise<ParsedInvoice> {
  //  Uporabimo uradni 'api' objekt, ki sam doda Bearer žeton in ustrezen IP naslov!
  const response = await api.post("/ai-chat/parse-receipt", { 
    imageBase64: base64Image 
  });

  const parsed = response.data?.data;

  return {
    merchant: parsed?.merchant ?? "",
    amount: String(parsed?.amount ?? ""),
    date: parsed?.date ?? new Date().toLocaleDateString("sl-SI"),
    category: parsed?.category ?? "Ostalo",
  };
}

// ─── Filter Bar 
function FilterBar({
  active,
  setActive,
}: {
  active: string;
  setActive: (f: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
        flexDirection: "row",
      }}
    >
      {FILTERS.map((f) => (
        <TouchableOpacity
          key={f}
          onPress={() => setActive(f)}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 0.5,
            borderColor: active === f ? C.accent : C.border2,
            backgroundColor: active === f ? C.accent : C.bg1,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: active === f ? C.text1 : C.text3,
            }}
          >
            {f}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Transaction Card 
function TxCard({ tx }: { tx: any }) {
  return (
    <View
      style={{
        backgroundColor: C.bg1,
        borderRadius: 12,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderWidth: 0.5,
        borderColor: C.border1,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: tx.ibg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={tx.icon} size={18} color={tx.ic} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            color: C.text1,
            fontWeight: "500",
          }}
        >
          {tx.name}
        </Text>

        <Text
          style={{
            fontSize: 12,
            color: C.text3,
          }}
        >
          {tx.cat}
        </Text>
      </View>

      <Text
        style={{
          fontSize: 14,
          fontWeight: "500",
          color: C.accent,
        }}
      >
        {tx.amount}
      </Text>
    </View>
  );
}

// ─── Invoice Modal 
function InvoiceFormModal({
  visible,
  data,
  collections,
  onClose,
  onSave,
}: any) {
  const [form, setForm] = useState<InvoiceData>({
    merchant: "",
    amount: "",
    date: "",
    category: "Ostalo",
    note: "",
    collection: "Ostalo",
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

  const field = (
    label: string,
    key: keyof InvoiceData,
    keyboard: any = "default",
  ) => (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          fontSize: 11,
          color: C.text3,
          marginBottom: 4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>

      <TextInput
        value={form[key]}
        onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
        keyboardType={keyboard}
        style={{
          backgroundColor: C.inputBg,
          borderRadius: 10,
          padding: 12,
          color: C.text1,
          borderWidth: 0.5,
          borderColor: C.border2,
        }}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.8)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: C.bg2,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  color: C.text1,
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                📄 Račun
              </Text>

              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close-circle" size={24} color={C.text3} />
              </TouchableOpacity>
            </View>

            {field("Trgovec", "merchant")}
            {field("Znesek", "amount", "decimal-pad")}
            {field("Datum", "date")}

            {/* kategorija */}
            <View style={{ marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 11,
                  color: C.text3,
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                Kategorija
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {[
                  "Hrana",
                  "Restavracije",
                  "Kavarne",
                  "Prevoz",
                  "Zabava",
                  "Zdravje",
                  "Oblačila",
                  "Sport",
                  "Potovanje",
                  "Ostalo",
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setForm((f) => ({ ...f, category: cat }))}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor:
                        form.category === cat ? C.accent : C.inputBg,
                      borderWidth: 0.5,
                      borderColor: form.category === cat ? C.accent : C.border2,
                    }}
                  >
                    <Text
                      style={{
                        color: form.category === cat ? C.text1 : C.text3,
                        fontSize: 13,
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {field("Opomba", "note")}

            <TouchableOpacity
              onPress={() => onSave(form)}
              style={{
                backgroundColor: C.accent,
                borderRadius: 12,
                padding: 14,
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <Text
                style={{
                  color: C.text1,
                  fontWeight: "600",
                  fontSize: 15,
                }}
              >
                💾 Shrani
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── MAIN SCREEN 
export default function TransactionsScreen() {
  const [active, setActive] = useState("Vse");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [collections] = useState(DEFAULT_COLLECTIONS);
  const [scanning, setScanning] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [parsedInvoice, setParsedInvoice] = useState<Partial<InvoiceData>>({});
  const { isReady, isAuthenticated } = useAuth();

  const filterTx = () => {
    if (active === "Vse") return transactions;
    return transactions.filter(
      (t) => t.collection === active || t.cat?.includes(active),
    );
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

useEffect(() => {
  fetchTransactions();
}, [fetchTransactions]);

  const handleScan = async () => {
    const galleryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();

    Alert.alert("Skeniraj račun", "Izberi vir slike", [
      {
        text: "📷 Kamera",
        onPress: async () => {
          if (camPerm.status !== "granted") {
            Alert.alert("Dovoli dostop do kamere");
            return;
          }

          const result = await ImagePicker.launchCameraAsync({
            base64: true,
            quality: 0.8,
          });

          if (!result.canceled) {
            await processImage(result.assets[0]);
          }
        },
      },
      {
        text: "🖼 Galerija",
        onPress: async () => {
          if (galleryPerm.status !== "granted") {
            Alert.alert("Dovoli dostop do galerije");
            return;
          }

          const result = await ImagePicker.launchImageLibraryAsync({
            base64: true,
            quality: 0.8,
          });

          if (!result.canceled) {
            await processImage(result.assets[0]);
          }
        },
      },
      {
        text: "Prekliči",
        style: "cancel",
      },
    ]);
  };

  const processImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setScanning(true);

    try {
      if (!asset.base64) {
        throw new Error("Ni base64 slike");
      }

      const parsed = await parseReceiptViaBackend(asset.base64);

      setParsedInvoice({
        merchant: parsed.merchant,
        amount: parsed.amount,
        date: parsed.date,
        category: parsed.category,
        note: "",
        collection: parsed.category,
      });

      setFormVisible(true);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Napaka", e?.message ?? "Računa ni bilo mogoče analizirati.");
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async (data: InvoiceData) => {
  try {
    const amountNum = parseFloat(data.amount || '0');
    await transactionsApi.create({
      type: 'EXPENSE',
      amount: amountNum,
      description: data.merchant,
      date: new Date().toISOString().split('T')[0], 
      note: data.note,
    });
    await fetchTransactions(); // osveži seznam iz baze
    setFormVisible(false);
  } catch (err) {
    Alert.alert('Napaka', 'Transakcije ni bilo mogoče shraniti.');
  }
};

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: C.bg2,
      }}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: C.bg1,
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 0.5,
          borderBottomColor: C.border1,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "500",
            color: C.text1,
          }}
        >
          Transakcije
        </Text>

        <Text
          style={{
            fontSize: 13,
            color: C.text3,
            marginTop: 2,
          }}
        >
          Maj 2026
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <FilterBar active={active} setActive={setActive} />

        {/* Scan Button */}
        <TouchableOpacity
          onPress={handleScan}
          disabled={scanning}
          style={{
            backgroundColor: scanning ? C.inactive : C.accent,
            borderRadius: 12,
            padding: 13,
            marginHorizontal: 16,
            marginBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {scanning ? (
            <ActivityIndicator size="small" color={C.text1} />
          ) : (
            <Ionicons name="camera" size={18} color={C.text1} />
          )}

          <Text
            style={{
              fontSize: 14,
              color: C.text1,
              fontWeight: "500",
            }}
          >
            {scanning ? "AI analizira račun..." : "Skeniraj račun"}
          </Text>
        </TouchableOpacity>

        {/* Transactions */}
        <View
          style={{
            paddingHorizontal: 16,
            gap: 8,
          }}
        >
          {filterTx().map((tx) => (
            <TxCard key={tx.id} tx={tx} />
          ))}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal */}
      <InvoiceFormModal
        visible={formVisible}
        data={parsedInvoice}
        collections={collections}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}