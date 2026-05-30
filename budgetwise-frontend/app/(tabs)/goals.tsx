// app/(tabs)/goals/index.tsx
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView,
  Platform, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback, useRef } from 'react';
import { goalsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Goal, CreateGoalPayload, UpdateGoalPayload, GoalStatus } from '../../types/goals';

const ICONS = ['🎯','🏖️','💻','🚗','🏠','📚','💍','✈️','🎓','💪','🏋️','🎸','🍕','🐶','🎮','🌍'];
const CURRENCIES = ['EUR','USD','GBP','CHF','HRK','RSD','BAM'] as const;

function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('sl-SI', { style: 'currency', currency }).format(amount);
}

function isOverdue(goal: Goal): boolean {
  if (!goal.deadline || goal.status !== 'ACTIVE') return false;
  return new Date(goal.deadline) < new Date();
}

// statusLabel zdaj sprejme C kot parameter ker je zunaj komponente
function statusLabel(goal: Goal, C: any): { label: string; bg: string; color: string } | null {
  if (goal.status === 'COMPLETED') return { label: '✓ DOSEŽEN', bg: C.success, color: C.successText };
  if (goal.status === 'PAUSED')    return { label: '⏸ PAVZA',  bg: C.paused,  color: C.pausedText };
  if (goal.status === 'CANCELLED') return { label: '✕ PREKLICAN', bg: C.border2, color: C.text3 };
  if (isOverdue(goal))              return { label: '⚠ ZAMUDA', bg: C.warning, color: C.warningText };
  return null;
}

// makeStyles funkcija — sprejme C in vrne S
function makeStyles(C: any) {
  return {
    header: {
      backgroundColor: C.bg1, paddingHorizontal: 20, paddingVertical: 16,
      borderBottomWidth: 0.5 as const, borderBottomColor: C.border1,
      flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const,
    },
    headerBtn: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent,
      alignItems: 'center' as const, justifyContent: 'center' as const,
    },
    sectionLabel: {
      fontSize: 11, color: C.text3, textTransform: 'uppercase' as const,
      letterSpacing: 0.08, paddingHorizontal: 16, marginBottom: 10,
    },
    card: {
      backgroundColor: C.bg1, borderRadius: 16, padding: 16,
      marginHorizontal: 16, marginBottom: 12,
      borderWidth: 0.5 as const,
    },
    iconContainer: {
      width: 44, height: 44, borderRadius: 12, backgroundColor: C.border2,
      alignItems: 'center' as const, justifyContent: 'center' as const,
    },
    progressTrack: {
      backgroundColor: C.border1, borderRadius: 6, height: 8, overflow: 'hidden' as const,
    },
    progressFill: { height: '100%' as const, borderRadius: 6 },
    primaryBtn: {
      backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14,
      alignItems: 'center' as const, flexDirection: 'row' as const,
      justifyContent: 'center' as const, gap: 6,
    },
    primaryBtnDisabled: { backgroundColor: C.border2 },
    primaryBtnText: { color: C.text1, fontWeight: '600' as const, fontSize: 15 },
    ghostBtn: {
      flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
      gap: 6, padding: 8, backgroundColor: C.border1, borderRadius: 10,
    },
    iconActionBtn: {
      width: 40, backgroundColor: C.border1, borderRadius: 10,
      alignItems: 'center' as const, justifyContent: 'center' as const,
    },
    quickBtn: {
      flex: 1, backgroundColor: C.bg1, borderRadius: 8, padding: 8,
      alignItems: 'center' as const, borderWidth: 0.5 as const, borderColor: C.border2,
    },
    dashedAddBtn: {
      backgroundColor: C.bg1, borderWidth: 0.5 as const, borderStyle: 'dashed' as const,
      borderColor: C.border2, borderRadius: 14, padding: 14,
      marginHorizontal: 16, marginTop: 4,
      flexDirection: 'row' as const, alignItems: 'center' as const,
      justifyContent: 'center' as const, gap: 8,
    },
    sheet: {
      backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, borderWidth: 0.5 as const, borderColor: C.border2,
      maxHeight: '90%' as const,
    },
    sheetHandle: {
      width: 40, height: 4, backgroundColor: C.border2, borderRadius: 2,
      alignSelf: 'center' as const, marginBottom: 20,
    },
    sheetTitle: { fontSize: 18, fontWeight: '600' as const, color: C.text1 },
    label: { fontSize: 11, color: C.text3, textTransform: 'uppercase' as const, marginBottom: 6 },
    input: {
      backgroundColor: C.inputBg, borderRadius: 10, padding: 12,
      color: C.text1, borderWidth: 0.5 as const, borderColor: C.border2,
      marginBottom: 14, fontSize: 14,
    },
    iconBtn: {
      width: 44, height: 44, borderRadius: 12, backgroundColor: C.inputBg,
      borderWidth: 0.5 as const, borderColor: C.border2,
      alignItems: 'center' as const, justifyContent: 'center' as const,
    },
    iconBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
    currencyBtn: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
      backgroundColor: C.inputBg, borderWidth: 0.5 as const, borderColor: C.border2,
    },
    currencyBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
    statusBtn: {
      flex: 1, paddingVertical: 8, borderRadius: 8,
      backgroundColor: C.inputBg, borderWidth: 0.5 as const, borderColor: C.border2,
      alignItems: 'center' as const,
    },
    statusBtnActive: { backgroundColor: C.deep, borderColor: C.accent },
  };
}

interface GoalFormFields {
  name: string; description: string; targetAmount: string;
  deadline: string; icon: string; currency: string;
}
const EMPTY_FORM: GoalFormFields = {
  name: '', description: '', targetAmount: '', deadline: '', icon: '🎯', currency: 'EUR',
};

function GoalForm({ fields, onChange, C, S }: {
  fields: GoalFormFields;
  onChange: (f: Partial<GoalFormFields>) => void;
  C: any; S: any;
}) {
  return (
    <>
      <Text style={S.label}>Ikona</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {ICONS.map(ic => (
            <TouchableOpacity key={ic} onPress={() => onChange({ icon: ic })} style={[S.iconBtn, fields.icon === ic && S.iconBtnActive]}>
              <Text style={{ fontSize: 22 }}>{ic}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <Text style={S.label}>Ime cilja *</Text>
      <TextInput value={fields.name} onChangeText={v => onChange({ name: v })} placeholder="npr. Počitnice v Španiji" placeholderTextColor={C.text3} style={S.input} />
      <Text style={S.label}>Ciljni znesek *</Text>
      <TextInput value={fields.targetAmount} onChangeText={v => onChange({ targetAmount: v })} placeholder="1500" placeholderTextColor={C.text3} keyboardType="decimal-pad" style={S.input} />
      <Text style={S.label}>Valuta</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {CURRENCIES.map(cur => (
            <TouchableOpacity key={cur} onPress={() => onChange({ currency: cur })} style={[S.currencyBtn, fields.currency === cur && S.currencyBtnActive]}>
              <Text style={{ fontSize: 12, color: fields.currency === cur ? C.text1 : C.text3 }}>{cur}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <Text style={S.label}>Rok (LLLL-MM-DD)</Text>
      <TextInput value={fields.deadline} onChangeText={v => onChange({ deadline: v })} placeholder="2026-12-31" placeholderTextColor={C.text3} style={S.input} />
      <Text style={S.label}>Opis (neobvezno)</Text>
      <TextInput value={fields.description} onChangeText={v => onChange({ description: v })} placeholder="Kratka opomba..." placeholderTextColor={C.text3} style={[S.input, { marginBottom: 20 }]} multiline numberOfLines={2} />
    </>
  );
}

function AddGoalModal({ visible, onClose, onSaved, C, S }: {
  visible: boolean; onClose: () => void; onSaved: () => void; C: any; S: any;
}) {
  const [fields, setFields] = useState<GoalFormFields>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  function merge(partial: Partial<GoalFormFields>) { setFields(f => ({ ...f, ...partial })); }
  function reset() { setFields(EMPTY_FORM); }

  async function handleSave() {
    if (!fields.name.trim()) return Alert.alert('Napaka', 'Ime cilja je obvezno.');
    const amount = parseFloat(fields.targetAmount.replace(',', '.'));
    if (!amount || amount <= 0) return Alert.alert('Napaka', 'Vnesi veljaven znesek.');
    if (fields.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(fields.deadline)) return Alert.alert('Napaka', 'Rok mora biti v obliki LLLL-MM-DD.');
    setSaving(true);
    try {
      await goalsApi.create({ name: fields.name.trim(), icon: fields.icon, targetAmount: amount, currency: fields.currency as any, ...(fields.description.trim() && { description: fields.description.trim() }), ...(fields.deadline.trim() && { deadline: fields.deadline.trim() }) });
      reset(); onSaved(); onClose();
    } catch (err: any) {
      Alert.alert('Napaka', err?.message ?? 'Cilja ni bilo mogoče shraniti.');
    } finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={S.sheet}>
          <View style={S.sheetHandle} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={S.sheetTitle}>Nov cilj</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}><Ionicons name="close-circle" size={24} color={C.text3} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <GoalForm fields={fields} onChange={merge} C={C} S={S} />
          </ScrollView>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={[S.primaryBtn, saving && S.primaryBtnDisabled]}>
            {saving ? <ActivityIndicator color={C.text1} size="small" /> : <Text style={S.primaryBtnText}>Shrani cilj</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: 'ACTIVE', label: '▶ Aktiven' },
  { value: 'PAUSED', label: '⏸ Pavza' },
  { value: 'CANCELLED', label: '✕ Preklican' },
];

function EditGoalModal({ goal, onClose, onSaved, C, S }: {
  goal: Goal | null; onClose: () => void; onSaved: () => void; C: any; S: any;
}) {
  const [fields, setFields] = useState<GoalFormFields>(EMPTY_FORM);
  const [status, setStatus] = useState<GoalStatus>('ACTIVE');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!goal) return;
    setFields({ name: goal.name, description: goal.description ?? '', targetAmount: String(goal.targetAmount), deadline: goal.deadline?.split('T')[0] ?? '', icon: goal.icon, currency: goal.currency });
    setStatus(goal.status === 'COMPLETED' ? 'ACTIVE' : goal.status);
  }, [goal]);

  if (!goal) return null;
  function merge(partial: Partial<GoalFormFields>) { setFields(f => ({ ...f, ...partial })); }

  async function handleSave() {
    if (!fields.name.trim()) return Alert.alert('Napaka', 'Ime cilja je obvezno.');
    const amount = parseFloat(fields.targetAmount.replace(',', '.'));
    if (!amount || amount <= 0) return Alert.alert('Napaka', 'Vnesi veljaven znesek.');
    if (fields.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(fields.deadline)) return Alert.alert('Napaka', 'Rok mora biti v obliki LLLL-MM-DD.');
    setSaving(true);
    try {
      await goalsApi.update(goal!.id, { name: fields.name.trim(), icon: fields.icon, targetAmount: amount, currency: fields.currency as any, status, ...(fields.description.trim() && { description: fields.description.trim() }), deadline: fields.deadline.trim() || undefined });
      onSaved(); onClose();
    } catch (err: any) {
      Alert.alert('Napaka', err?.message ?? 'Cilja ni bilo mogoče posodobiti.');
    } finally { setSaving(false); }
  }

  return (
    <Modal visible={!!goal} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={S.sheet}>
          <View style={S.sheetHandle} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={S.sheetTitle}>Uredi cilj</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={24} color={C.text3} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <GoalForm fields={fields} onChange={merge} C={C} S={S} />
            {goal.status !== 'COMPLETED' && (
              <>
                <Text style={[S.label, { marginBottom: 8 }]}>Status</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                  {STATUS_OPTIONS.map(opt => (
                    <TouchableOpacity key={opt.value} onPress={() => setStatus(opt.value)} style={[S.statusBtn, status === opt.value && S.statusBtnActive]}>
                      <Text style={{ fontSize: 12, color: status === opt.value ? C.text1 : C.text3 }}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={[S.primaryBtn, saving && S.primaryBtnDisabled]}>
            {saving ? <ActivityIndicator color={C.text1} size="small" /> : <Text style={S.primaryBtnText}>Shrani spremembe</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ContributeModal({ goal, onClose, onSaved, C, S }: {
  goal: Goal | null; onClose: () => void; onSaved: () => void; C: any; S: any;
}) {
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (goal) setAmount(''); }, [goal]);
  if (!goal) return null;
  const remaining = Number(goal.targetAmount) - Number(goal.currentAmount);

  async function handleContribute() {
    const num = parseFloat(amount.replace(',', '.'));
    if (!num || num <= 0) return Alert.alert('Napaka', 'Vnesi veljaven znesek.');
    if (num > remaining + 0.01) return Alert.alert('Napaka', `Maksimalni prispevek je ${formatCurrency(remaining, goal!.currency)}.`);
    setSaving(true);
    try {
      const result = await goalsApi.contribute(goal!.id, num);
      onSaved(); onClose();
      if (result?.completed) setTimeout(() => Alert.alert('🎉 Čestitke!', `Cilj "${goal!.name}" je dosežen!`), 300);
    } catch (err: any) {
      Alert.alert('Napaka', err?.message ?? 'Prispevka ni bilo mogoče shraniti.');
    } finally { setSaving(false); }
  }

  return (
    <Modal visible={!!goal} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={S.sheet}>
          <View style={S.sheetHandle} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={S.sheetTitle}>Dodaj prispevek</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={24} color={C.text3} /></TouchableOpacity>
          </View>
          <View style={{ backgroundColor: C.bg1, borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 0.5, borderColor: C.border1 }}>
            <Text style={{ fontSize: 14, color: C.text1, fontWeight: '500' }}>{goal.icon} {goal.name}</Text>
            <Text style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>Prihranili: {formatCurrency(Number(goal.currentAmount), goal.currency)} / {formatCurrency(Number(goal.targetAmount), goal.currency)}</Text>
            <Text style={{ fontSize: 12, color: C.warm, marginTop: 2 }}>Še manjka: {formatCurrency(remaining, goal.currency)}</Text>
          </View>
          <Text style={S.label}>Znesek *</Text>
          <TextInput value={amount} onChangeText={setAmount} placeholder={`Max ${formatCurrency(remaining, goal.currency)}`} placeholderTextColor={C.text3} keyboardType="decimal-pad" autoFocus style={[S.input, { marginBottom: 12 }]} />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            {[10, 25, 50, 100].map(q => (
              <TouchableOpacity key={q} onPress={() => setAmount(String(Math.min(q, Math.ceil(remaining))))} style={S.quickBtn}>
                <Text style={{ fontSize: 13, color: C.text2 }}>{formatCurrency(q, goal.currency).replace(/\s/g, '\u00A0')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={handleContribute} disabled={saving} style={[S.primaryBtn, saving && S.primaryBtnDisabled]}>
            {saving ? <ActivityIndicator color={C.text1} size="small" /> : <Text style={S.primaryBtnText}>Dodaj prispevek</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function GoalCard({ goal, onContribute, onEdit, onDelete, C, S }: {
  goal: Goal; onContribute: (g: Goal) => void; onEdit: (g: Goal) => void; onDelete: (g: Goal) => void; C: any; S: any;
}) {
  const progress = goal.targetAmount > 0 ? Math.min(Number(goal.currentAmount) / Number(goal.targetAmount), 1) : 0;
  const percentage = Math.round(progress * 100);
  const isCompleted = goal.status === 'COMPLETED';
  const overdue = isOverdue(goal);
  const badge = statusLabel(goal, C);
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animWidth, { toValue: percentage, duration: 600, useNativeDriver: false }).start();
  }, [percentage]);

  const progressColor = isCompleted ? C.successText : overdue ? C.warningText : C.accent;
  const cardBorderColor = isCompleted ? C.success : overdue ? C.warning : C.border2;

  return (
    <View style={[S.card, { borderColor: cardBorderColor }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <View style={S.iconContainer}><Text style={{ fontSize: 24 }}>{goal.icon}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '500', color: C.text1 }}>{goal.name}</Text>
          {goal.description ? <Text style={{ fontSize: 12, color: C.text3, marginTop: 1 }} numberOfLines={1}>{goal.description}</Text> : null}
          {goal.deadline ? <Text style={{ fontSize: 12, color: overdue ? C.warningText : C.text3, marginTop: 1 }}>Rok: {new Date(goal.deadline).toLocaleDateString('sl-SI')}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: progressColor }}>{percentage}%</Text>
          {badge && <View style={{ backgroundColor: badge.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: badge.color, fontWeight: '600' }}>{badge.label}</Text></View>}
        </View>
      </View>
      <View style={S.progressTrack}>
        <Animated.View style={[S.progressFill, { width: animWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), backgroundColor: progressColor }]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 }}>
        <Text style={{ fontSize: 13, color: C.text1, fontWeight: '500' }}>{formatCurrency(Number(goal.currentAmount), goal.currency)}</Text>
        <Text style={{ fontSize: 13, color: C.text3 }}>cilj: {formatCurrency(Number(goal.targetAmount), goal.currency)}</Text>
      </View>
      {isCompleted ? (
        <TouchableOpacity onPress={() => onDelete(goal)} style={[S.ghostBtn, { flex: 1 }]}>
          <Ionicons name="trash-outline" size={14} color={C.text3} />
          <Text style={{ fontSize: 12, color: C.text3 }}>Odstrani</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => onContribute(goal)} style={[S.primaryBtn, { flex: 1, paddingVertical: 10 }]}>
            <Ionicons name="add-circle-outline" size={16} color={C.text1} />
            <Text style={[S.primaryBtnText, { fontSize: 13 }]}>Dodaj prispevek</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(goal)} style={S.iconActionBtn}><Ionicons name="pencil-outline" size={16} color={C.text2} /></TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(goal)} style={S.iconActionBtn}><Ionicons name="trash-outline" size={16} color={C.text3} /></TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function SummaryCard({ goals, C }: { goals: Goal[]; C: any }) {
  const active = goals.filter(g => g.status === 'ACTIVE');
  if (active.length === 0) return null;
  const totalTarget = active.reduce((s, g) => s + Number(g.targetAmount), 0);
  const totalSaved = active.reduce((s, g) => s + Number(g.currentAmount), 0);
  const pct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
  return (
    <View style={{ backgroundColor: C.accent, marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16 }}>
      <Text style={{ fontSize: 11, color: 'rgba(245,238,232,0.7)', letterSpacing: 0.08, marginBottom: 4 }}>SKUPNI NAPREDEK</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
        <Text style={{ fontSize: 28, fontWeight: '500', color: C.text1 }}>{formatCurrency(totalSaved)}</Text>
        <Text style={{ fontSize: 14, color: 'rgba(245,238,232,0.75)' }}>od {formatCurrency(totalTarget)}</Text>
      </View>
      <View style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
        <View style={{ height: '100%', borderRadius: 6, width: `${pct}%` as any, backgroundColor: C.warm }} />
      </View>
      <Text style={{ fontSize: 12, color: 'rgba(245,238,232,0.75)', marginTop: 6 }}>{pct}% skupnega cilja · {active.length} aktivnih</Text>
    </View>
  );
}

function EmptyState({ onAdd, C, S }: { onAdd: () => void; C: any; S: any }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 }}>
      <Text style={{ fontSize: 52, marginBottom: 16 }}>🎯</Text>
      <Text style={{ fontSize: 17, fontWeight: '500', color: C.text1, marginBottom: 8, textAlign: 'center' }}>Ni nastavljenih ciljev</Text>
      <Text style={{ fontSize: 14, color: C.text3, textAlign: 'center', lineHeight: 21, marginBottom: 28 }}>Dodajte prvi varčevalni cilj in{'\n'}začnite slediti napredku.</Text>
      <TouchableOpacity onPress={onAdd} style={{ backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="add-circle-outline" size={18} color={C.text1} />
        <Text style={{ fontSize: 14, color: C.text1, fontWeight: '500' }}>Dodaj cilj</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function GoalsScreen() {
  const { colors: C } = useTheme(); // ← EDINA SPREMEMBA v glavni funkciji
  const S = makeStyles(C);          // ← stili se generirajo dinamično

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const { isReady, isAuthenticated } = useAuth();

  const fetchGoals = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await goalsApi.getAll();
      setGoals(data ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Napaka pri nalaganju ciljev.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    fetchGoals();
  }, [isReady, isAuthenticated, fetchGoals]);

  function handleDelete(goal: Goal) {
    Alert.alert('Izbriši cilj', `Ali res želite izbrisati "${goal.name}"?`, [
      { text: 'Prekliči', style: 'cancel' },
      { text: 'Izbriši', style: 'destructive', onPress: async () => {
        setGoals(prev => prev.filter(g => g.id !== goal.id));
        try { await goalsApi.delete(goal.id); }
        catch { Alert.alert('Napaka', 'Cilja ni bilo mogoče izbrisati.'); fetchGoals(true); }
      }},
    ]);
  }

  const activeGoals    = goals.filter(g => g.status === 'ACTIVE');
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');
  const otherGoals     = goals.filter(g => g.status !== 'ACTIVE' && g.status !== 'COMPLETED');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={S.header}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: '500', color: C.text1 }}>Varčevalni cilji</Text>
          <Text style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{activeGoals.length} aktivnih · {completedGoals.length} doseženih</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={S.headerBtn}>
          <Ionicons name="add" size={22} color={C.text1} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGoals(true); }} tintColor={C.accent} />}>
        <View style={{ height: 16 }} />
        {loading ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={{ color: C.text3, marginTop: 12, fontSize: 13 }}>Nalagam cilje…</Text>
          </View>
        ) : error ? (
          <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 32, marginBottom: 12 }}>⚠️</Text>
            <Text style={{ color: C.text3, textAlign: 'center', marginBottom: 16 }}>{error}</Text>
            <TouchableOpacity onPress={() => fetchGoals()} style={S.primaryBtn}><Text style={S.primaryBtnText}>Poskusi znova</Text></TouchableOpacity>
          </View>
        ) : goals.length === 0 ? (
          <EmptyState onAdd={() => setShowAdd(true)} C={C} S={S} />
        ) : (
          <>
            <SummaryCard goals={goals} C={C} />
            {activeGoals.length > 0 && (
              <>
                <Text style={S.sectionLabel}>AKTIVNI CILJI</Text>
                {activeGoals.map(g => <GoalCard key={g.id} goal={g} onContribute={setContributeGoal} onEdit={setEditGoal} onDelete={handleDelete} C={C} S={S} />)}
              </>
            )}
            {otherGoals.length > 0 && (
              <>
                <Text style={[S.sectionLabel, { marginTop: 8 }]}>OSTALI CILJI</Text>
                {otherGoals.map(g => <GoalCard key={g.id} goal={g} onContribute={setContributeGoal} onEdit={setEditGoal} onDelete={handleDelete} C={C} S={S} />)}
              </>
            )}
            {completedGoals.length > 0 && (
              <>
                <Text style={[S.sectionLabel, { marginTop: 8 }]}>DOSEŽENI CILJI</Text>
                {completedGoals.map(g => <GoalCard key={g.id} goal={g} onContribute={setContributeGoal} onEdit={setEditGoal} onDelete={handleDelete} C={C} S={S} />)}
              </>
            )}
            <TouchableOpacity onPress={() => setShowAdd(true)} style={S.dashedAddBtn}>
              <Ionicons name="add" size={20} color={C.text3} />
              <Text style={{ fontSize: 14, color: C.text3 }}>Dodaj cilj</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      <AddGoalModal visible={showAdd} onClose={() => setShowAdd(false)} onSaved={() => fetchGoals(true)} C={C} S={S} />
      <EditGoalModal goal={editGoal} onClose={() => setEditGoal(null)} onSaved={() => { fetchGoals(true); setEditGoal(null); }} C={C} S={S} />
      <ContributeModal goal={contributeGoal} onClose={() => setContributeGoal(null)} onSaved={() => fetchGoals(true)} C={C} S={S} />
    </SafeAreaView>
  );
}