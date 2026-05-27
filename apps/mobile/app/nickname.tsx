import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import authService from '@/services/authService';

type NicknameState = 'idle' | 'available' | 'taken';

export default function NicknameSetupScreen() {
  const { checkAuth } = useAuth();
  const [nickname, setNickname] = useState('');
  const [nicknameState, setNicknameState] = useState<NicknameState>('idle');
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedNickname = useMemo(() => nickname.trim(), [nickname]);
  const isLengthValid = trimmedNickname.length >= 2 && trimmedNickname.length <= 12;
  const canContinue = isLengthValid && nicknameState === 'available' && !isSubmitting;

  const helperText = useMemo(() => {
    if (!trimmedNickname) {
      return '2자 이상 12자 이하로 입력해주세요.';
    }
    if (!isLengthValid) {
      return '닉네임은 2자 이상 12자 이하로 사용할 수 있어요.';
    }
    if (nicknameState === 'available') {
      return '좋아요. 사용할 수 있는 닉네임이에요.';
    }
    if (nicknameState === 'taken') {
      return '이미 사용 중인 닉네임이에요.';
    }
    return '중복 확인을 눌러 사용할 수 있는지 확인해주세요.';
  }, [isLengthValid, nicknameState, trimmedNickname]);

  const handleCheckAvailability = async () => {
    if (!isLengthValid) {
      Alert.alert('닉네임 확인', '닉네임은 2자 이상 12자 이하로 입력해주세요.');
      return;
    }

    try {
      setIsChecking(true);
      const available = await authService.checkNicknameAvailability(trimmedNickname);
      setNicknameState(available ? 'available' : 'taken');
    } catch (error) {
      Alert.alert('오류', error instanceof Error ? error.message : '닉네임 확인에 실패했습니다.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!canContinue) {
      Alert.alert('닉네임 설정', '사용 가능한 닉네임인지 먼저 확인해주세요.');
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText style={styles.step}>프로필 설정</ThemedText>
            <ThemedText style={styles.title}>닉네임을{'\n'}어떤 걸로 할까요?</ThemedText>
            <ThemedText style={styles.subtitle}>
              경매 목록, 입찰, 채팅에서 다른 사람에게 보여지는 이름이에요.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <View
              style={[
                styles.inputWrap,
                nicknameState === 'available' && styles.inputWrapSuccess,
                nicknameState === 'taken' && styles.inputWrapError,
              ]}
            >
              <TextInput
                value={nickname}
                onChangeText={(text) => {
                  setNickname(text);
                  setNicknameState('idle');
                }}
                placeholder="예: 카드마스터"
                placeholderTextColor="#A3AAB8"
                style={styles.input}
                maxLength={12}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleCheckAvailability}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.checkButton,
                  pressed && styles.pressed,
                  (!isLengthValid || isChecking || isSubmitting) && styles.checkButtonDisabled,
                ]}
                onPress={handleCheckAvailability}
                disabled={!isLengthValid || isChecking || isSubmitting}
              >
                {isChecking ? (
                  <ActivityIndicator color="#111827" size="small" />
                ) : (
                  <ThemedText style={styles.checkButtonText}>확인</ThemedText>
                )}
              </Pressable>
            </View>

            <ThemedText
              style={[
                styles.helper,
                nicknameState === 'available' && styles.helperSuccess,
                nicknameState === 'taken' && styles.helperError,
              ]}
            >
              {helperText}
            </ThemedText>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.pressed,
              !canContinue && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canContinue}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.submitButtonText}>시작하기</ThemedText>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  keyboardView: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  header: {
    paddingTop: 20,
  },
  step: {
    color: '#687385',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 18,
  },
  title: {
    color: '#101828',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 42,
  },
  subtitle: {
    color: '#667085',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
  },
  form: {
    marginTop: 44,
  },
  inputWrap: {
    minHeight: 62,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D7DCE5',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 8,
  },
  inputWrapSuccess: {
    borderColor: '#12B76A',
  },
  inputWrapError: {
    borderColor: '#F04438',
  },
  input: {
    flex: 1,
    color: '#101828',
    fontSize: 21,
    fontWeight: '800',
    height: 58,
    paddingVertical: 0,
  },
  checkButton: {
    height: 44,
    minWidth: 64,
    borderRadius: 8,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  checkButtonDisabled: {
    opacity: 0.45,
  },
  checkButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  helper: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  helperSuccess: { color: '#027A48', fontWeight: '800' },
  helperError: { color: '#B42318', fontWeight: '800' },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 18,
    paddingTop: 12,
    backgroundColor: '#F7F8FA',
  },
  submitButton: {
    height: 56,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  pressed: { opacity: 0.86 },
});
