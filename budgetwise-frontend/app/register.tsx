import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '@/contexts/AuthContext';

const C = {
  bg1: '#070508', bg2: '#0D090C', card: '#120810',
  accent: '#A0263A', warm: '#C4967A', deep: '#7A1A2E',
  border1: '#251018', border2: '#3D1020',
  text1: '#F5EEE8', text2: '#C8B8B0', text3: '#5C4A50',
};

interface Fields {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirm: string;
}
type FieldErrors = Partial<Record<keyof Fields, string>>;

export default function RegisterScreen() {
  const { register, isLoading, error, clearError } = useAuth();
  const router = useRouter();

  const [fields, setFields] = useState<Fields>({
    firstName: '', lastName: '', email: '', password: '', confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function setField(key: keyof Fields, value: string) {
    setFields((p) => ({ ...p, [key]: value }));
    setFieldErrors((p) => ({ ...p, [key]: undefined }));
    clearError();
  }

  function validate(): boolean {
    const errs: FieldErrors = {};
    if (!fields.firstName.trim()) errs.firstName = 'Ime je obvezno';
    if (!fields.lastName.trim()) errs.lastName = 'Priimek je obvezen';
    if (!fields.email.trim()) errs.email = 'E-pošta je obvezna';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errs.email = 'Vnesite veljavno e-pošto';
    if (!fields.password) errs.password = 'Geslo je obvezno';
    else if (fields.password.length < 8) errs.password = 'Vsaj 8 znakov';
    if (fields.confirm !== fields.password) errs.confirm = 'Gesli se ne ujemata';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleRegister() {
    Keyboard.dismiss();
    clearError();
    if (!validate()) return;
    try {
      await register({
        firstName: fields.firstName.trim(),
        lastName: fields.lastName.trim(),
        email: fields.email.trim().toLowerCase(),
        password: fields.password,
        currency: 'EUR',
      });
    } catch {
      // Napaka je že nastavljena v AuthContext
    }
  }

  const field = (
    key: keyof Fields,
    label: string,
    icon: React.ComponentProps<typeof Ionicons>['name'],
    opts: { placeholder?: string; secure?: boolean; keyboard?: any; toggle?: boolean } = {}
  ) => (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, fieldErrors[key] ? styles.inputError : null]}>
        <Ionicons name={icon} size={18} color={C.text3} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={opts.placeholder ?? label}
          placeholderTextColor={C.text3}
          secureTextEntry={opts.secure && !showPassword}
          keyboardType={opts.keyboard}
          autoCapitalize={key === 'email' ? 'none' : 'words'}
          autoCorrect={false}
          value={fields[key]}
          onChangeText={(t) => setField(key, t)}
          returnKeyType="next"
        />
        {opts.toggle && (
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.text3} />
          </TouchableOpacity>
        )}
      </View>
      {fieldErrors[key] && <Text style={styles.fieldError}>{fieldErrors[key]}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={22} color={C.text2} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <LinearGradient colors={[C.deep, C.accent]} style={styles.iconGrad}>
                <Ionicons name="person-add" size={24} color={C.text1} />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Ustvari račun</Text>
            <Text style={styles.subtitle}>Začni upravljati svoje finance danes</Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={C.accent} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                {field('firstName', 'Ime', 'person-outline', { placeholder: 'Ana' })}
              </View>
              <View style={{ flex: 1 }}>
                {field('lastName', 'Priimek', 'person-outline', { placeholder: 'Novak' })}
              </View>
            </View>
            {field('email', 'E-pošta', 'mail-outline', { placeholder: 'ime@primer.com', keyboard: 'email-address' })}
            {field('password', 'Geslo', 'key-outline', { placeholder: '••••••••', secure: true, toggle: true })}
            {field('confirm', 'Potrdi geslo', 'shield-checkmark-outline', { placeholder: '••••••••', secure: true })}

            <TouchableOpacity
              style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[C.accent, C.deep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
                {isLoading ? (
                  <ActivityIndicator color={C.text1} />
                ) : (
                  <>
                    <Text style={styles.btnText}>Ustvari račun</Text>
                    <Ionicons name="arrow-forward" size={18} color={C.text1} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.terms}>
              Z ustvarjanjem računa se strinjaš z našimi{' '}
              <Text style={{ color: C.warm }}>Pogoji uporabe</Text>
              {' '}in{' '}
              <Text style={{ color: C.warm }}>Politiko zasebnosti</Text>.
            </Text>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Že imaš račun? </Text>
            <TouchableOpacity onPress={() => router.replace('/login' as any)}>
              <Text style={styles.switchLink}>Prijava</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  back: { marginTop: 8, marginBottom: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  iconWrap: { marginBottom: 16 },
  iconGrad: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: C.text1, marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.text3, textAlign: 'center' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2A0D14', borderRadius: 10, borderWidth: 0.5,
    borderColor: C.accent, padding: 12, marginBottom: 16,
  },
  errorBannerText: { fontSize: 13, color: C.warm, flex: 1 },
  form: { gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 12, color: C.text2, fontWeight: '500' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg2, borderRadius: 12, borderWidth: 0.5,
    borderColor: C.border2, paddingHorizontal: 14, height: 50,
  },
  inputError: { borderColor: C.accent },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: C.text1, fontSize: 15 },
  fieldError: { fontSize: 11, color: C.accent, marginTop: 2 },
  btnPrimary: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  btnText: { fontSize: 16, fontWeight: '600', color: C.text1 },
  terms: { fontSize: 11, color: C.text3, textAlign: 'center', lineHeight: 18 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  switchText: { fontSize: 14, color: C.text3 },
  switchLink: { fontSize: 14, color: C.warm, fontWeight: '600' },
});