import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { palette } from '@/constants/ui';

const noticeSections = [
  {
    icon: 'storefront-outline',
    title: 'CardPick은 거래 중개 플랫폼입니다',
    body:
      'CardPick은 판매자와 구매자가 카드 거래를 할 수 있도록 연결하는 통신판매중개 서비스입니다. 실제 상품 등록, 설명, 발송, 거래 이행의 1차 책임은 각 거래 당사자에게 있습니다.',
  },
  {
    icon: 'alert-circle-outline',
    title: '사기와 허위 등록은 금지됩니다',
    body:
      '허위 상품, 타인의 사진 도용, 미발송, 결제 유도, 외부 거래 강요 등은 금지됩니다. 신고가 접수되면 계정 제한, 게시글 삭제, 거래 기록 보존, 관계기관 제출 등 필요한 조치를 할 수 있습니다.',
  },
  {
    icon: 'chatbubble-ellipses-outline',
    title: '분쟁은 채팅 기록을 기준으로 확인합니다',
    body:
      '배송지, 포장 상태, 추가 사진, 송장번호 등 거래 관련 정보는 앱 내 채팅으로 남겨주세요. 앱 밖에서 진행한 거래나 입금 유도는 확인과 보호가 어려울 수 있습니다.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: '법령상 책임은 배제하지 않습니다',
    body:
      '본 고지는 플랫폼이 거래 당사자가 아니라는 점을 알리기 위한 안내입니다. CardPick의 고의 또는 과실, 법령상 의무 위반으로 발생한 책임까지 배제한다는 의미는 아닙니다.',
  },
];

export default function LegalNoticeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[styles.content, { paddingBottom: 28 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={palette.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText style={styles.eyebrow}>SAFETY NOTICE</ThemedText>
            <ThemedText style={styles.title}>안전거래 및 중개자 고지</ThemedText>
          </View>
        </View>

        <View style={styles.noticeBox}>
          <ThemedText style={styles.noticeTitle}>거래 전 꼭 확인해주세요</ThemedText>
          <ThemedText style={styles.noticeText}>
            카드 상태, 구성품, 배송 방식, 결제 조건은 거래 당사자가 직접 확인해야 합니다.
            의심 거래는 앱 내 채팅을 중단하고 신고 또는 고객 문의로 남겨주세요.
          </ThemedText>
        </View>

        <View style={styles.sectionList}>
          {noticeSections.map((section) => (
            <View key={section.title} style={styles.sectionCard}>
              <View style={styles.sectionIcon}>
                <Ionicons name={section.icon as any} size={19} color={palette.ink} />
              </View>
              <View style={styles.sectionCopy}>
                <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
                <ThemedText style={styles.sectionText}>{section.body}</ThemedText>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  scroller: { alignSelf: 'center', maxWidth: 520, width: '100%' },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 14 },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: palette.brand, fontSize: 12, fontWeight: '900', marginBottom: 3 },
  title: { color: palette.ink, fontSize: 25, fontWeight: '900', lineHeight: 33 },
  noticeBox: {
    backgroundColor: '#111827',
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
  },
  noticeTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', marginBottom: 7 },
  noticeText: { color: '#CBD5E1', fontSize: 13, fontWeight: '700', lineHeight: 20 },
  sectionList: { gap: 10 },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  sectionIcon: {
    alignItems: 'center',
    backgroundColor: '#FEE500',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: palette.ink, fontSize: 15, fontWeight: '900', marginBottom: 5 },
  sectionText: { color: '#4B5563', fontSize: 13, fontWeight: '700', lineHeight: 20 },
});
