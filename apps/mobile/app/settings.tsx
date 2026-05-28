import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { palette } from '@/constants/ui';
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
        message: '선택한 알림이 위에서 표시됩니다.',
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.eyebrow}>SETTINGS</ThemedText>
          <ThemedText type="title" style={styles.title}>
            설정
          </ThemedText>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>앱 안 상단 알림</ThemedText>
            <ThemedText style={styles.sectionText}>
              휴대폰 푸시 알림과 별개로 앱을 보는 중 위에서 내려오는 알림이에요.
            </ThemedText>
          </View>

          <SettingToggle
            icon="notifications-outline"
            title="상단 알림 전체"
            description="앱 내부 토스트 알림을 모두 켜거나 꺼요"
            value={toastSettings.all}
            onValueChange={updateAll}
          />
          <SettingToggle
            icon="hammer-outline"
            title="입찰 알림"
            description="입찰 완료 같은 경매 액션 알림"
            value={toastSettings.bid}
            disabled={!toastSettings.all}
            onValueChange={updateBid}
          />
          <SettingToggle
            icon="chatbubble-ellipses-outline"
            title="채팅 알림"
            description="앱 사용 중 새 채팅이 왔을 때 표시"
            value={toastSettings.chat}
            disabled={!toastSettings.all}
            onValueChange={updateChat}
          />
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
        <ThemedText style={[styles.settingTitle, disabled && styles.disabledText]}>
          {title}
        </ThemedText>
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

const styles = StyleSheet.create({
  container: { backgroundColor: '#F5F5F5', flex: 1 },
  scroller: { alignSelf: 'center', maxWidth: 520, width: '100%' },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  header: { marginBottom: 18 },
  eyebrow: { color: palette.brand, fontSize: 12, fontWeight: '900', marginBottom: 4 },
  title: { color: palette.ink, fontSize: 28, fontWeight: '900', lineHeight: 34 },
  section: { paddingVertical: 2 },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { color: palette.ink, fontSize: 16, fontWeight: '900' },
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
  settingIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  settingCopy: { flex: 1 },
  settingTitle: { color: palette.ink, fontSize: 14, fontWeight: '900' },
  settingText: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  disabledText: { color: '#667085' },
});
