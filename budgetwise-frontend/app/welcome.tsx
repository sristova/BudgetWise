import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const C = {
  bg1: '#070508',
  bg2: '#0D090C',
  card: '#120810',
  accent: '#A0263A',
  warm: '#C4967A',
  deep: '#7A1A2E',
  muted: '#8C6A5A',
  border1: '#251018',
  border2: '#3D1020',
  text1: '#F5EEE8',
  text2: '#C8B8B0',
  text3: '#5C4A50',
};

const FEATURES = [
  {
    icon: 'bar-chart-outline' as const,
    title: 'Pametna analitika',
    desc: 'Vizualiziraj porabo z lepimi tedenskimi in mesečnimi grafi.',
  },
  {
    icon: 'chatbubble-ellipses-outline' as const,
    title: 'AI finančni svetovalec',
    desc: 'Pridobi personalizirane nasvete in vpoglede s pomočjo umetne inteligence.',
  },
  {
    icon: 'flag-outline' as const,
    title: 'Varčevalni cilji',
    desc: 'Nastavi cilje, sledi napredku in proslavi vsak dosežek.',
  },
  {
    icon: 'scan-outline' as const,
    title: 'Skener računov',
    desc: 'Fotografiraj račun in BudgetWise ga samodejno kategorizira.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <LinearGradient
              colors={[C.deep, C.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Ionicons name="wallet" size={36} color={C.text1} />
            </LinearGradient>
          </View>

          <Text style={styles.appName}>BudgetWise</Text>
          <Text style={styles.tagline}>
            Tvoj osebni finančni{'\n'}pomočnik
          </Text>

          {/* Decorative mini-chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartLabel}>Mesečni pregled</Text>
            <View style={styles.bars}>
              {[40, 65, 30, 80, 55, 70, 90].map((h, i) => (
                <View key={i} style={styles.barCol}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: (h / 100) * 56,
                        backgroundColor: i === 6 ? C.accent : C.border2,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
            <View style={styles.chartFooter}>
              <View style={styles.statPill}>
                <Ionicons name="arrow-down" size={11} color={C.warm} />
                <Text style={styles.statText}>€2 200 prihodki</Text>
              </View>
              <View style={styles.statPill}>
                <Ionicons name="arrow-up" size={11} color={C.accent} />
                <Text style={styles.statText}>€357 porabljeno</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Features ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VSE KAR POTREBUJEŠ</Text>
          <View style={styles.featuresGrid}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.featureCard}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name={f.icon} size={22} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Social proof ── */}
        <View style={styles.proofRow}>
          {[
            { value: '50k+', label: 'Uporabnikov' },
            { value: '4.9★', label: 'Ocena' },
            { value: 'Brezplačno', label: 'Za vedno' },
          ].map((p) => (
            <View key={p.label} style={styles.proofItem}>
              <Text style={styles.proofValue}>{p.value}</Text>
              <Text style={styles.proofLabel}>{p.label}</Text>
            </View>
          ))}
        </View>

        {/* ── CTA ── */}
        <View style={styles.cta}>
          <TouchableOpacity
            style={styles.btnPrimary}
            activeOpacity={0.85}
            onPress={() => router.push('/register' as any)}
          >
            <LinearGradient
              colors={[C.accent, C.deep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              <Text style={styles.btnPrimaryText}>Začni — brezplačno</Text>
              <Ionicons name="arrow-forward" size={18} color={C.text1} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            activeOpacity={0.75}
            onPress={() => router.push('/login' as any)}
          >
            <Text style={styles.btnSecondaryText}>Že imam račun</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Tvoji podatki so šifrirani in jih nikoli ne prodamo.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg1 },
  scroll: { paddingBottom: 40 },

  hero: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  logoWrap: { marginBottom: 16 },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: C.text1,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: C.text2,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },

  chartCard: {
    width: width - 48,
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: C.border2,
    padding: 16,
    marginBottom: 8,
  },
  chartLabel: { fontSize: 11, color: C.text3, letterSpacing: 0.06, marginBottom: 10 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 64 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  chartFooter: { flexDirection: 'row', gap: 10, marginTop: 12 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.bg2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statText: { fontSize: 11, color: C.text2 },

  section: { paddingHorizontal: 20, marginTop: 36 },
  sectionTitle: {
    fontSize: 10,
    color: C.text3,
    letterSpacing: 0.12,
    marginBottom: 14,
  },
  featuresGrid: { gap: 10 },
  featureCard: {
    backgroundColor: C.bg2,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: C.border1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#2A0D14',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureTitle: { fontSize: 14, fontWeight: '600', color: C.text1, marginBottom: 3 },
  featureDesc: { fontSize: 12, color: C.text3, lineHeight: 18 },

  proofRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginTop: 28,
    backgroundColor: C.bg2,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: C.border1,
    paddingVertical: 18,
  },
  proofItem: { alignItems: 'center' },
  proofValue: { fontSize: 20, fontWeight: '700', color: C.text1 },
  proofLabel: { fontSize: 11, color: C.text3, marginTop: 2 },

  cta: { paddingHorizontal: 20, marginTop: 32, gap: 12 },
  btnPrimary: { borderRadius: 14, overflow: 'hidden' },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  btnPrimaryText: { fontSize: 16, fontWeight: '600', color: C.text1 },
  btnSecondary: {
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 15, color: C.text2 },

  footer: { marginTop: 24, alignItems: 'center', paddingHorizontal: 40 },
  footerText: { fontSize: 11, color: C.text3, textAlign: 'center', lineHeight: 16 },
});