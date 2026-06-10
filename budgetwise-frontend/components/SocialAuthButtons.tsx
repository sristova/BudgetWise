import React, { useState } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { useAuth } from '@/contexts/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const C = {
  bg1: '#070508', bg2: '#0D090C',
  accent: '#A0263A', warm: '#C4967A', deep: '#7A1A2E',
  border2: '#3D1020',
  text1: '#F5EEE8', text2: '#C8B8B0', text3: '#5C4A50',
};

export default function SocialAuthButtons() {
  const { loginWithGoogle } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: __DEV__ ? undefined : 'budgetwise',
  });

  const [_request, response, promptAsync] = Google.useAuthRequest({
    iosClientId:     process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    webClientId:     process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    responseType:    'id_token',
    redirectUri,
  });

  const handleGoogleCallback = async (idToken: string) => {
    setLoadingProvider('google');
    try {
      await loginWithGoogle(idToken);
    } catch (err: any) {
      Alert.alert('Napaka', err?.message ?? 'Google prijava ni uspela');
    } finally {
      setLoadingProvider(null);
    }
  };

  React.useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token || response.authentication?.idToken;
      if (idToken) {
        handleGoogleCallback(idToken);
      } else {
        Alert.alert('Napaka', 'Google ni vrnil identifikacijskega žetona.');
      }
    }
  }, [response]);

  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>ali nadaljuj z</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => Alert.alert('Kmalu na voljo 🚀', 'Google prijava bo kmalu na voljo.')}        
        disabled={loadingProvider === 'google'}
        activeOpacity={0.75}
      >
        {loadingProvider === 'google'
          ? <ActivityIndicator size="small" color={C.warm} />
          : <Text style={styles.googleIcon}>G</Text>
        }
        <Text style={styles.buttonLabel}>Prijava z Google</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { gap: 16, marginTop: 8 },
  divider:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line:        { flex: 1, height: 0.5, backgroundColor: '#3D1020' },
  dividerText: { fontSize: 12, color: '#5C4A50' },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 0.5,
    borderColor: '#3D1020', backgroundColor: '#0D090C', minHeight: 50,
  },
  googleIcon:   { fontSize: 15, fontWeight: '700', color: '#EA4335' },
  buttonLabel:  { fontSize: 14, fontWeight: '500', color: '#C8B8B0' },
});