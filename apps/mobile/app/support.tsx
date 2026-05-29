import Constants from 'expo-constants';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { palette } from '@/constants/ui';

const notices = [
  {
    title: '안전결제 안내',
    body: '결제 금액은 구매확정 전까지 보관되며, 송장 등록과 수령 확인 후 정산 단계로 넘어갑니다.',
  },
  {
    title: '외부거래 주의',
    body: '계좌이체, 오픈채팅 등 앱 밖 거래는 분쟁 보호 대상에서 제외될 수 있습니다.',
  },
  {
    title: '신고 처리',
    body: '신고가 접수되면 운영자가 채팅 기록, 상품 정보, 거래 상태를 확인한 뒤 조치합니다.',
  },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const openMail = async () => {
    const url = 'mailto:support@cardbid.app?subject=CardBid%20문의';
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('메일 앱 없음', 'support@cardbid.app 으로 문의해주세요.');
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={palette.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText style={styles.eyebrow}>SUPPORT</ThemedText>
            <ThemedText style={styles.title}>고객지원</ThemedText>
          </View>
        </View>

        <Pressable style={styles.contactCard} onPress={openMail}>
          <View style={styles.contactIcon}>
            <Ionicons name="mail-outline" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.contactCopy}>
            <ThemedText style={styles.contactTitle}>문의하기</ThemedText>
            <ThemedText style={styles.contactText}>거래, 결제, 신고 문의를 메일로 보내요.</ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </Pressable>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>공지사항</ThemedText>
          {notices.map((notice) => (
            <View key={notice.title} style={styles.noticeItem}>
              <Ionicons name="megaphone-outline" size={18} color={palette.brand} />
              <View style={styles.noticeCopy}>
                <ThemedText style={styles.noticeTitle}>{notice.title}</ThemedText>
                <ThemedText style={styles.noticeText}>{notice.body}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.versionBox}>
          <ThemedText style={styles.versionLabel}>앱 버전</ThemedText>
          <ThemedText style={styles.versionValue}>CardBid {appVersion}</ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F5F5F5', flex: 1 },
  scroller: { alignSelf: 'center', maxWidth: 520, width: '100%' },
  content: { padding: 20 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 18 },
  backButton: { alignItems: 'center', height: 40, justifyContent: 'center', marginRight: 10, width: 40 },
  headerCopy: { flex: 1 },
  eyebrow: { color: palette.brand, fontSize: 12, fontWeight: '900', marginBottom: 3 },
  title: { color: palette.ink, fontSize: 25, fontWeight: '900' },
  contactCard: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
    padding: 14,
  },
  contactIcon: {
    alignItems: 'center',
    backgroundColor: palette.brand,
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  contactCopy: { flex: 1 },
  contactTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  contactText: { color: '#CBD5E1', fontSize: 12, lineHeight: 17, marginTop: 3 },
  section: { gap: 10 },
  sectionTitle: { color: palette.ink, fontSize: 16, fontWeight: '900', marginBottom: 2 },
  noticeItem: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 13,
  },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: palette.ink, fontSize: 14, fontWeight: '900' },
  noticeText: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  versionBox: {
    alignItems: 'center',
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
  },
  versionLabel: { color: palette.muted, fontSize: 13, fontWeight: '800' },
  versionValue: { color: palette.ink, fontSize: 13, fontWeight: '900' },
});
