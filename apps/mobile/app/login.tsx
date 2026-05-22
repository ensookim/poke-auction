import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuthRequest } from 'expo-auth-session';
import { useAuth } from '@/context/AuthContext';
import authService from '@/services/authService';
import { ThemedText } from '@/components/themed-text';
import { router } from 'expo-router';
import { ThemedView } from '../components/themed-view';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Kakao OAuth endpoint
  const discovery = {
    authorizationEndpoint: 'https://kauth.kakao.com/oauth/authorize',
    tokenEndpoint: 'https://kauth.kakao.com/oauth/token',
  };

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_KAKAO_APP_ID || '',
      redirectUri: authService.getRedirectUri(),
      usePKCE: false,
    },
    discovery,
  );

  const handleKakaoCallback = useCallback(async (code: string) => {
    try {
      setIsAuthLoading(true);
      await login(code);
      Alert.alert('로그인 성공!');
      router.replace('/');
    } catch (error) {
      const backendMessage =
        typeof error === 'object' && error !== null
          ? (error as any).response?.data || (error as any).message
          : undefined;

      Alert.alert(
        '로그인 실패',
        backendMessage || '알 수 없는 오류가 발생했습니다.',
      );
    } finally {
      setIsAuthLoading(false);
    }
  }, [login]);

  // Handle auth response
  useEffect(() => {
    if (response?.type === 'success') {
      const authCode = response.params.code;
      handleKakaoCallback(authCode);
    }
  }, [handleKakaoCallback, response]);

  const handleKakaoLogin = async () => {
    await promptAsync();
  };

  if (isLoading || isAuthLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" style={styles.brand}>
          CardBid
        </ThemedText>
        <ThemedText type="title" style={styles.title}>
          카드 경매
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          트레이딩 카드부터 한정판 카드까지, 간편하게 입찰해보세요.
        </ThemedText>

        <View style={styles.loginContainer}>
          <KakaoLoginButton onPress={handleKakaoLogin} disabled={!request} />
        </View>
      </View>
    </ThemedView>
  );
}

function KakaoLoginButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.kakaoButton,
        pressed && styles.kakaoButtonPressed,
        disabled && styles.kakaoButtonDisabled,
      ]}
    >
      <ThemedText style={styles.kakaoButtonText} allowFontScaling={false}>
        {disabled ? '로딩 중...' : '카카오로 시작하기'}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F2F3F7',
  },
  content: {
    width: '100%',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  brand: {
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#7A7A7A',
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#686E7A',
    textAlign: 'left',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: '92%',
  },
  loginContainer: {
    width: '100%',
  },
  kakaoButton: {
    backgroundColor: '#111111',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kakaoButtonPressed: {
    opacity: 0.92,
  },
  kakaoButtonDisabled: {
    opacity: 0.55,
  },
  kakaoButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
