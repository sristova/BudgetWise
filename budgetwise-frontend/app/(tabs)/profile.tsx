// app/(tabs)/profile.tsx
import React, { useState } from 'react';
import {
  Alert, Modal, ScrollView, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const { colors: C, toggleTheme, isDark } = useTheme();
  const router = useRouter();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [notifyBudget, setNotifyBudget] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(true);
  const [notifyGoal, setNotifyGoal] = useState(true);
  const [uploading, setUploading] = useState(false);

  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';

  const handleLogout = () =>
    Alert.alert('Odjava', 'Ste prepričani, da se želite odjaviti?', [
      { text: 'Prekliči', style: 'cancel' },
      {
        text: 'Odjava', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/welcome' as any);
        }
      },
    ]);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Dovoljenje zavrnjeno', 'Aplikacija potrebuje dostop do galerije.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const selectedImage = result.assets[0];
    const formData = new FormData();
    formData.append('avatar', {
      uri: selectedImage.uri,
      name: selectedImage.fileName || 'avatar.png',
      type: selectedImage.mimeType || 'image/png',
    } as any);

    setUploading(true);
    try {
      await api.post('/users/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Uspeh', 'Profilna slika posodobljena.');
      await refreshUser();
    } catch (e) {
      Alert.alert('Napaka', 'Nalaganje slike ni uspelo.');
    } finally {
      setUploading(false);
    }
  };

  const styles = makeStyles(C);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Glava ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage} disabled={uploading} activeOpacity={0.8}>
            <View style={styles.avatarWrap}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <LinearGradient colors={[C.deep, C.accent]} style={styles.avatar}>
                  <Text style={styles.initials}>{initials}</Text>
                </LinearGradient>
              )}
              {uploading && (
                <View style={styles.avatarLoader}>
                  <ActivityIndicator size="small" color={C.text1} />
                </View>
              )}
            </View>
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={14} color={C.text1} />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>
            {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Brez imena'}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* ── Informacije ── */}
        <Section title="Račun" C={C}>
          <InfoRow icon="mail-outline" label="E-pošta" value={user?.email ?? '—'} C={C} />
          <InfoRow icon="cash-outline" label="Valuta" value={user?.currency ?? 'EUR'} C={C} />
          <InfoRow
            icon="shield-checkmark-outline"
            label="E-pošta potrjena"
            value={user?.isEmailVerified ? 'Da' : 'Ne'}
            valueColor={user?.isEmailVerified ? C.green : C.accent}
            C={C}
          />
        </Section>

        {/* ── Varnost ── */}
        <Section title="Varnost" C={C}>
          <TouchableOpacity style={styles.actionRow} onPress={() => setShowPasswordModal(true)}>
            <View style={styles.actionLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="key-outline" size={16} color={C.accent} />
              </View>
              <Text style={styles.actionText}>Spremeni geslo</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.text3} />
          </TouchableOpacity>
        </Section>

        {/* ── Videz ── */}
        <Section title="Videz" C={C}>
          <View style={styles.infoRow}>
            <View style={styles.actionLeft}>
              <View style={styles.iconBox}>
                <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={16} color={C.accent} />
              </View>
              <Text style={styles.actionText}>{isDark ? 'Temni način' : 'Svetli način'}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: C.border2, true: C.accent }}
              thumbColor={C.text1}
            />
          </View>
        </Section>

        {/* ── Obvestila ── */}
        <Section title="Obvestila" C={C}>
          <SwitchRow icon="wallet-outline" label="Opozorila proračuna" value={notifyBudget} onChange={setNotifyBudget} C={C} />
          <SwitchRow icon="document-text-outline" label="Tedensko poročilo" value={notifyWeekly} onChange={setNotifyWeekly} C={C} />
          <SwitchRow icon="flag-outline" label="Dosežen cilj" value={notifyGoal} onChange={setNotifyGoal} C={C} />
        </Section>

        {/* ── O aplikaciji ── */}
        <Section title="O aplikaciji" C={C}>
          <InfoRow icon="information-circle-outline" label="Verzija" value="1.0.0" C={C} />
          <InfoRow icon="people-outline" label="Ekipa" value="BudgetWise Team" C={C} />
        </Section>

        {/* ── Odjava ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={C.accent} />
          <Text style={styles.logoutText}>Odjava</Text>
        </TouchableOpacity>

      </ScrollView>

      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        C={C}
      />
    </SafeAreaView>
  );
}

// ─── Pomožne komponente ───────────────────────────────────────────────────────

function Section({ title, children, C }: { title: string; children: React.ReactNode; C: any }) {
  const styles = makeStyles(C);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({ icon, label, value, valueColor, C }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string; value: string; valueColor?: string; C: any;
}) {
  const styles = makeStyles(C);
  return (
    <View style={styles.infoRow}>
      <View style={styles.actionLeft}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={16} color={C.accent} />
        </View>
        <Text style={styles.actionText}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function SwitchRow({ icon, label, value, onChange, C }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string; value: boolean; onChange: (v: boolean) => void; C: any;
}) {
  const styles = makeStyles(C);
  return (
    <View style={styles.infoRow}>
      <View style={styles.actionLeft}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={16} color={C.accent} />
        </View>
        <Text style={styles.actionText}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.border2, true: C.accent }}
        thumbColor={C.text1}
      />
    </View>
  );
}

function ChangePasswordModal({ visible, onClose, C }: { visible: boolean; onClose: () => void; C: any }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);

  const styles = makeStyles(C);
  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); };

  const submit = async () => {
    if (next !== confirm) { Alert.alert('Napaka', 'Gesli se ne ujemata.'); return; }
    if (next.length < 8) { Alert.alert('Napaka', 'Geslo mora imeti vsaj 8 znakov.'); return; }
    setLoading(true);
    try {
      await api.post('/users/change-password', { currentPassword: current, newPassword: next });
      Alert.alert('Uspeh', 'Geslo je posodobljeno.');
      reset();
      onClose();
    } catch (e: any) {
      Alert.alert('Napaka', e?.response?.data?.message ?? 'Napaka pri spremembi gesla.');
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Spremeni geslo</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={C.text2} />
          </TouchableOpacity>
        </View>
        <View style={styles.modalBody}>
          <PasswordInput label="Trenutno geslo" value={current} onChange={setCurrent} show={showCurrent} onToggle={() => setShowCurrent(v => !v)} C={C} />
          <PasswordInput label="Novo geslo (min. 8 znakov)" value={next} onChange={setNext} show={showNext} onToggle={() => setShowNext(v => !v)} C={C} />
          <PasswordInput label="Potrdi novo geslo" value={confirm} onChange={setConfirm} show={showNext} onToggle={() => setShowNext(v => !v)} C={C} />
          <TouchableOpacity style={[styles.btnPrimary, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={[C.accent, C.deep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
              {loading ? <ActivityIndicator color={C.text1} /> : <Text style={styles.btnText}>Posodobi geslo</Text>}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Prekliči</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function PasswordInput({ label, value, onChange, show, onToggle, C }: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; C: any;
}) {
  const styles = makeStyles(C);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name="key-outline" size={16} color={C.text3} style={{ marginRight: 10 }} />
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={C.text3}
          secureTextEntry={!show}
          value={value}
          onChangeText={onChange}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={16} color={C.text3} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Dynamic styles ───────────────────────────────────────────────────────────

function makeStyles(C: any) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg1 },
    content: { paddingBottom: 60 },
    header: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
    avatarContainer: { position: 'relative', marginBottom: 14 },
    avatarWrap: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg2 },
    avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
    avatarImage: { width: 80, height: 80, borderRadius: 40 },
    avatarLoader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(7,5,8,0.6)', justifyContent: 'center', alignItems: 'center' },
    cameraIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: C.accent, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg1 },
    initials: { fontSize: 30, fontWeight: '600', color: C.text1 },
    name: { fontSize: 20, fontWeight: '600', color: C.text1, marginBottom: 4 },
    email: { fontSize: 13, color: C.text3 },
    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionTitle: { fontSize: 10, color: C.text3, letterSpacing: 0.1, marginBottom: 8 },
    sectionBody: { backgroundColor: C.bg2, borderRadius: 14, borderWidth: 0.5, borderColor: C.border1, overflow: 'hidden' },
    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: C.border1 },
    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13 },
    actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.border2, alignItems: 'center', justifyContent: 'center' },
    actionText: { fontSize: 14, color: C.text1 },
    infoValue: { fontSize: 13, color: C.text3 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginTop: 32, paddingVertical: 15, borderRadius: 14, borderWidth: 0.5, borderColor: C.border2, backgroundColor: C.bg2 },
    logoutText: { fontSize: 15, color: C.accent, fontWeight: '500' },
    modal: { flex: 1, backgroundColor: C.bg1 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: C.border1 },
    modalTitle: { fontSize: 18, fontWeight: '600', color: C.text1 },
    modalBody: { padding: 20, gap: 16 },
    fieldWrap: { gap: 6 },
    label: { fontSize: 12, color: C.text2, fontWeight: '500' },
    inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg2, borderRadius: 12, borderWidth: 0.5, borderColor: C.border2, paddingHorizontal: 14, height: 50 },
    input: { flex: 1, color: C.text1, fontSize: 15 },
    btnPrimary: { borderRadius: 14, overflow: 'hidden' },
    btnGrad: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
    btnText: { fontSize: 16, fontWeight: '600', color: C.text1 },
    cancelBtn: { alignItems: 'center', paddingVertical: 12 },
    cancelText: { fontSize: 15, color: C.text3 },
  });
}