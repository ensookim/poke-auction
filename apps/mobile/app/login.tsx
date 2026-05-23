import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useAuth } from '@/context/AuthContext';
import authService from '@/services/authService';
import { ThemedText } from '@/components/themed-text';
import { router } from 'expo-router';
import { ThemedView } from '../components/themed-view';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { isLoading, checkAuth } = useAuth();
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleKakaoLogin = async () => {
    try {
      setIsAuthLoading(true);

      const appRedirectUri = makeRedirectUri({
        path: 'login-success',
      });
      const loginUrl = authService.getKakaoLoginUrl(appRedirectUri);

      console.log('🟢 카카오 로그인 URL:', loginUrl);
      console.log('🟢 앱 리다이렉트 URI:', appRedirectUri);

      const result = await WebBrowser.openAuthSessionAsync(
        loginUrl,
        appRedirectUri,
      );

      console.log('🟢 카카오 로그인 결과:', result);

      if (result.type !== 'success') {
        console.log('카카오 로그인 취소/실패:', result);
        return;
      }

      const parsedUrl = new URL(result.url);

      const accessToken = parsedUrl.searchParams.get('accessToken');
      const refreshToken = parsedUrl.searchParams.get('refreshToken');
      const userId = parsedUrl.searchParams.get('userId');
      const nickname = parsedUrl.searchParams.get('nickname');

      console.log('🟢 userId:', userId);
      console.log('🟢 nickname:', nickname);

      if (!accessToken || !refreshToken) {
        Alert.alert('로그인 실패', '토큰을 받지 못했습니다.');
        return;
      }

      await authService.saveTokens(accessToken, refreshToken);

      if (userId && nickname) {
        await authService.saveUser({
          id: Number(userId),
          nickname,
        });
      }

      // 저장된 토큰/유저 정보를 AuthContext에 다시 반영

      await checkAuth();

      console.log('✅ checkAuth 끝. 홈으로 이동 시도');

      router.replace('/');

      router.replace('/');
    } catch (error) {
      console.error('카카오 로그인 처리 실패:', error);

      Alert.alert(
        '로그인 실패',
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.',
      );
    } finally {
      setIsAuthLoading(false);
    }
  };

  if (isLoading || isAuthLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
          <KakaoLoginButton
            onPress={handleKakaoLogin}
            disabled={isAuthLoading}
          />
        </View>
      </View>
    </SafeAreaView>
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
