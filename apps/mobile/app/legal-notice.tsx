import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { palette } from '@/constants/ui';

const policyGroups = [
  {
    title: '개인정보처리방침',
    icon: 'lock-closed-outline',
    items: [
      '카카오 로그인 식별값, 닉네임, 채팅/거래 기록, 배송지 정보는 서비스 제공과 분쟁 대응을 위해 처리합니다.',
      '배송지와 연락처는 해당 거래의 판매자에게만 전달되며, 거래 목적 외 사용을 금지합니다.',
      '회원 탈퇴 시 계정은 비활성화되지만 전자상거래 분쟁 대응에 필요한 거래 기록은 법령상 보관 기간 동안 보관될 수 있습니다.',
    ],
  },
  {
    title: '이용약관',
    icon: 'document-text-outline',
    items: [
      'CardPick은 구매자와 판매자를 연결하는 통신판매중개 서비스입니다.',
      '허위 매물, 타인의 사진 도용, 외부 결제 유도, 욕설과 위협 행위는 제한됩니다.',
      '입찰과 즉시구매는 실제 구매 의사로 간주되며, 낙찰 후 정당한 사유 없는 미결제는 이용 제한 사유가 될 수 있습니다.',
    ],
  },
  {
    title: '환불·거래정책',
    icon: 'shield-checkmark-outline',
    items: [
      '안전결제 금액은 구매확정 전까지 보류되며, 구매확정 후 판매자 정산 단계로 넘어갑니다.',
      '상품 미발송, 설명과 현저히 다른 상품, 위조 의심 등은 채팅 기록과 사진을 기준으로 확인합니다.',
      '단순 변심 환불은 판매자와 합의가 필요하며, 외부거래는 플랫폼 보호 대상에서 제외될 수 있습니다.',
    ],
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
            <ThemedText style={styles.eyebrow}>POLICY</ThemedText>
            <ThemedText style={styles.title}>약관 및 거래정책</ThemedText>
          </View>
        </View>

        <View style={styles.noticeBox}>
          <ThemedText style={styles.noticeTitle}>거래 전 꼭 확인해주세요</ThemedText>
          <ThemedText style={styles.noticeText}>
            카드 상태, 구성품, 배송 방식, 결제 조건은 거래 당사자가 직접 확인해야 합니다.
            분쟁이 생기면 채팅 기록, 사진, 송장 정보를 기준으로 확인합니다.
          </ThemedText>
        </View>

        <View style={styles.sectionList}>
          {policyGroups.map((group) => (
            <View key={group.title} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons name={group.icon as any} size={19} color={palette.ink} />
                </View>
                <ThemedText style={styles.sectionTitle}>{group.title}</ThemedText>
              </View>
              {group.items.map((item) => (
                <View key={item} style={styles.policyRow}>
                  <View style={styles.bullet} />
                  <ThemedText style={styles.sectionText}>{item}</ThemedText>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: palette.canvas, flex: 1 },
  scroller: { alignSelf: 'center', maxWidth: 520, width: '100%' },
  content: { padding: 20 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 18 },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: palette.brand, fontSize: 12, fontWeight: '900', marginBottom: 3 },
  title: { color: palette.ink, fontSize: 24, fontWeight: '900' },
  noticeBox: {
    backgroundColor: '#F8FAFC',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  noticeTitle: { color: palette.ink, fontSize: 15, fontWeight: '900', marginBottom: 6 },
  noticeText: { color: palette.muted, fontSize: 13, lineHeight: 20 },
  sectionList: { gap: 12 },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: 9, marginBottom: 10 },
  sectionIcon: {
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  sectionTitle: { color: palette.ink, fontSize: 16, fontWeight: '900' },
  policyRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  bullet: {
    backgroundColor: palette.brand,
    borderRadius: 999,
    height: 6,
    marginTop: 7,
    width: 6,
  },
  sectionText: { color: '#4B5563', flex: 1, fontSize: 13, lineHeight: 20 },
});
