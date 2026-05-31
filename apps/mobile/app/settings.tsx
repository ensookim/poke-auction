import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DetailPageHeader } from '@/components/detail-page-header';
import { ThemedText } from '@/components/themed-text';
import { palette } from '@/constants/ui';
import authService from '@/services/authService';
import appSettingsService, { ToastSettings } from '@/services/appSettingsService';
import { showToast } from '@/services/toastService';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [toastSettings, setToastSettings] = useState<ToastSettings>({
    all: true,
    bid: true,
    chat: true,
  });

  useEffect(() => {
    appSettingsService
      .getToastSettings()
      .then(setToastSettings)
      .catch(() => null);
  }, []);

  const updateAll = async (enabled: boolean) => {
    setToastSettings((prev) => ({ ...prev, all: enabled }));
    await appSettingsService.setToastEnabled(enabled);
    if (enabled) {
      showToast({
        type: 'success',
        title: '상단 알림 켜짐',
        message: '선택한 알림을 앱 상단에 표시합니다.',
      });
    }
  };

  const updateBid = async (enabled: boolean) => {
    setToastSettings((prev) => ({ ...prev, bid: enabled }));
    await appSettingsService.setBidToastEnabled(enabled);
  };

  const updateChat = async (enabled: boolean) => {
    setToastSettings((prev) => ({ ...prev, chat: enabled }));
    await appSettingsService.setChatToastEnabled(enabled);
  };

  const handleWithdraw = () => {
    Alert.alert(
      '회원 탈퇴',
      '탈퇴하면 계정 정보가 비활성화되고 다시 복구할 수 없습니다. 진행할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.withdraw();
              router.replace('/login');
            } catch (error) {
              Alert.alert('탈퇴 실패', error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailPageHeader eyebrow="SETTINGS" title="설정" />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>앱 상단 알림</ThemedText>
            <ThemedText style={styles.sectionText}>
              앱 사용 중 입찰과 채팅 알림을 상단 토스트로 받을지 선택합니다.
            </ThemedText>
          </View>
          <SettingToggle
            icon="notifications-outline"
            title="상단 알림 전체"
            description="앱 안에서 뜨는 토스트 알림을 모두 켜거나 끕니다"
            value={toastSettings.all}
            onValueChange={updateAll}
          />
          <SettingToggle
            icon="hammer-outline"
            title="입찰 알림"
            description="입찰, 낙찰, 거래 상태 변경 알림"
            value={toastSettings.bid}
            disabled={!toastSettings.all}
            onValueChange={updateBid}
          />
          <SettingToggle
            icon="chatbubble-ellipses-outline"
            title="채팅 알림"
            description="앱 사용 중 새 채팅 내용을 상단에 표시"
            value={toastSettings.chat}
            disabled={!toastSettings.all}
            onValueChange={updateChat}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>서비스</ThemedText>
            <ThemedText style={styles.sectionText}>배송, 최근 본 상품, 고객지원 정보를 관리합니다.</ThemedText>
          </View>
          <NavigationRow
            icon="location-outline"
            title="기본 배송지"
            description="낙찰 후 사용할 배송지를 미리 저장"
            onPress={() => router.push('/shipping-address' as any)}
          />
          <NavigationRow
            icon="time-outline"
            title="최근 본 상품"
            description="최근 확인한 경매를 다시 보기"
            onPress={() => router.push('/recent-viewed' as any)}
          />
          <NavigationRow
            icon="help-circle-outline"
            title="문의하기 · 공지사항 · 앱 버전"
            description="고객지원과 서비스 공지 확인"
            onPress={() => router.push('/support' as any)}
          />
          <NavigationRow
            icon="shield-checkmark-outline"
            title="약관 및 거래정책"
            description="개인정보처리방침, 이용약관, 환불정책"
            onPress={() => router.push('/legal-notice' as any)}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>계정</ThemedText>
            <ThemedText style={styles.sectionText}>더 이상 서비스를 이용하지 않을 때 계정을 비활성화할 수 있습니다.</ThemedText>
          </View>
          <Pressable style={styles.withdrawButton} onPress={handleWithdraw}>
            <Ionicons name="person-remove-outline" size={18} color="#DC2626" />
            <ThemedText style={styles.withdrawText}>회원 탈퇴</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingToggle({
  description,
  disabled,
  icon,
  onValueChange,
  title,
  value,
}: {
  description: string;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onValueChange: (value: boolean) => void;
  title: string;
  value: boolean;
}) {
  return (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={18} color={disabled ? '#98A2B3' : palette.muted} />
      </View>
      <View style={styles.settingCopy}>
        <ThemedText style={[styles.settingTitle, disabled && styles.disabledText]}>{title}</ThemedText>
        <ThemedText style={styles.settingText}>{description}</ThemedText>
      </View>
      <Switch
        disabled={disabled}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#D0D5DD', true: '#BBF7D0' }}
        thumbColor={value ? palette.success : '#FFFFFF'}
      />
    </View>
  );
}

function NavigationRow({
  description,
  icon,
  onPress,
  title,
}: {
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable style={styles.navigationRow} onPress={onPress}>
      <Ionicons name={icon} size={18} color={palette.ink} />
      <View style={styles.navigationCopy}>
        <ThemedText style={styles.navigationTitle}>{title}</ThemedText>
        <ThemedText style={styles.navigationText}>{description}</ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={17} color={palette.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F5F5F5', flex: 1 },
  scroller: { alignSelf: 'center', maxWidth: 520, width: '100%' },
  content: { paddingHorizontal: 20, paddingTop: 4 },
  section: { marginBottom: 22, paddingVertical: 2 },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { color: palette.ink, fontSize: 16, fontWeight: '900', lineHeight: 22 },
  sectionText: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  settingRow: {
    alignItems: 'center',
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 72,
    paddingVertical: 12,
  },
  settingRowDisabled: { opacity: 0.58 },
  settingIcon: { alignItems: 'center', borderRadius: 8, height: 34, justifyContent: 'center', width: 34 },
  settingCopy: { flex: 1 },
  settingTitle: { color: palette.ink, fontSize: 14, fontWeight: '900', lineHeight: 20 },
  settingText: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  disabledText: { color: '#667085' },
  navigationRow: {
    alignItems: 'center',
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 66,
    paddingVertical: 12,
  },
  navigationCopy: { flex: 1 },
  navigationTitle: { color: palette.ink, fontSize: 14, fontWeight: '900', lineHeight: 20 },
  navigationText: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  withdrawButton: {
    alignItems: 'center',
    borderColor: '#FCA5A5',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  withdrawText: { color: '#DC2626', fontSize: 14, fontWeight: '900' },
});
