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

export default function LoginScreen() {
  const { login, isLoading, error, clearError } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = 'E-pošta je obvezna';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Vnesite veljavno e-pošto';
    if (!password) errors.password = 'Geslo je obvezno';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleLogin() {
    Keyboard.dismiss();
    clearError();
    if (!validate()) return;
    try {
      await login(email.trim().toLowerCase(), password);
    } catch {
      // Napaka je že nastavljena v AuthContext
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          {/* Nazaj */}
          <TouchableOpacity
            style={styles.back}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={22} color={C.text2} />
          </TouchableOpacity>

          {/* Glava */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <LinearGradient colors={[C.deep, C.accent]} style={styles.iconGrad}>
                <Ionicons name="lock-closed" size={24} color={C.text1} />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Dobrodošel nazaj</Text>
            <Text style={styles.subtitle}>Prijavi se v svoj BudgetWise račun</Text>
          </View>

          {/* Globalna napaka */}
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={C.accent} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Obrazec */}
          <View style={styles.form}>
            {/* E-pošta */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>E-pošta</Text>
              <View style={[styles.inputRow, fieldErrors.email ? styles.inputError : null]}>
                <Ionicons name="mail-outline" size={18} color={C.text3} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="ime@primer.com"
                  placeholderTextColor={C.text3}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    clearError();
                    setFieldErrors(p => ({ ...p, email: undefined }));
                  }}
                  returnKeyType="next"
                />
              </View>
              {fieldErrors.email && (
                <Text style={styles.fieldError}>{fieldErrors.email}</Text>
              )}
            </View>

            {/* Geslo */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Geslo</Text>
              <View style={[styles.inputRow, fieldErrors.password ? styles.inputError : null]}>
                <Ionicons name="key-outline" size={18} color={C.text3} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={C.text3}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    clearError();
                    setFieldErrors(p => ({ ...p, password: undefined }));
                  }}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={C.text3}
                  />
                </TouchableOpacity>
              </View>
              {fieldErrors.password && (
                <Text style={styles.fieldError}>{fieldErrors.password}</Text>
              )}
            </View>

            {/* Pozabljeno geslo */}
            <TouchableOpacity style={styles.forgot}>
              <Text style={styles.forgotText}>Pozabljeno geslo?</Text>
            </TouchableOpacity>

            {/* Gumb za prijavo */}
            <TouchableOpacity
              style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[C.accent, C.deep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
                {isLoading ? (
                  <ActivityIndicator color={C.text1} />
                ) : (
                  <>
                    <Text style={styles.btnText}>Prijava</Text>
                    <Ionicons name="arrow-forward" size={18} color={C.text1} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Povezava na registracijo */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Nimaš računa? </Text>
            <TouchableOpacity onPress={() => router.replace('/register' as any)}>
              <Text style={styles.switchLink}>Registracija</Text>
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
  form: { gap: 16 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 12, color: C.text2, fontWeight: '500' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg2, borderRadius: 12,
    borderWidth: 0.5, borderColor: C.border2,
    paddingHorizontal: 14, height: 50,
  },
  inputError: { borderColor: C.accent },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: C.text1, fontSize: 15 },
  fieldError: { fontSize: 11, color: C.accent, marginTop: 2 },
  forgot: { alignSelf: 'flex-end' },
  forgotText: { fontSize: 13, color: C.warm },
  btnPrimary: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  btnText: { fontSize: 16, fontWeight: '600', color: C.text1 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  switchText: { fontSize: 14, color: C.text3 },
  switchLink: { fontSize: 14, color: C.warm, fontWeight: '600' },
});