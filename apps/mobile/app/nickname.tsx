import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import authService from '@/services/authService';

export default function NicknameSetupScreen() {
  const { checkAuth } = useAuth();
  const [nickname, setNickname] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const trimmedNickname = useMemo(() => nickname.trim(), [nickname]);

  const handleCheckAvailability = async () => {
    if (trimmedNickname.length < 2 || trimmedNickname.length > 12) {
      Alert.alert('닉네임 확인', '닉네임은 2자 이상 12자 이하로 입력해주세요.');
      return;
    }

    try {
      setIsChecking(true);
      const available = await authService.checkNicknameAvailability(trimmedNickname);
      setIsAvailable(available);
      if (!available) {
        Alert.alert('닉네임 중복', '이미 사용중인 닉네임입니다.');
      }
    } catch (error) {
      Alert.alert('오류', error instanceof Error ? error.message : '닉네임 확인에 실패했습니다.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!isAvailable) {
      Alert.alert('닉네임 설정', '먼저 중복 확인을 통과해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.updateNickname(trimmedNickname);
      await checkAuth();
      router.replace('/');
    } catch (error) {
      Alert.alert('오류', error instanceof Error ? error.message : '닉네임 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>닉네임 설정</ThemedText>
        <ThemedText style={styles.subtitle}>중복되지 않는 닉네임을 입력해주세요.</ThemedText>

        <View style={styles.inputRow}>
          <TextInput
            value={nickname}
            onChangeText={(text) => {
              setNickname(text);
              setIsAvailable(null);
            }}
            placeholder="닉네임 입력 (2~12자)"
            style={styles.input}
            maxLength={12}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={({ pressed }) => [styles.checkButton, pressed && styles.pressed]}
            onPress={handleCheckAvailability}
            disabled={isChecking || isSubmitting}
          >
            {isChecking ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.checkButtonText}>중복확인</ThemedText>
            )}
          </Pressable>
        </View>

        {isAvailable === true ? <ThemedText style={styles.available}>사용 가능한 닉네임입니다.</ThemedText> : null}

        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            (pressed || isSubmitting || !isAvailable) && styles.pressed,
            (!isAvailable || isSubmitting) && styles.disabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || !isAvailable}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.submitButtonText}>시작하기</ThemedText>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  title: { fontSize: 28, fontWeight: '900', color: '#111827' },
  subtitle: { marginTop: 8, color: '#6B7280', fontSize: 15 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 46,
    color: '#111827',
    fontSize: 15,
  },
  checkButton: {
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 82,
  },
  checkButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  submitButton: {
    marginTop: 20,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  available: { marginTop: 10, color: '#047857', fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
});
