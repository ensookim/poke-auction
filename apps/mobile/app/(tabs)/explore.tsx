import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AUCTION_CATEGORIES } from '@/constants/auction';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const marketSignals = [
  { label: '마감 6시간 전', value: '입찰 집중', icon: 'time' },
  { label: '즉시 낙찰가', value: '시작가 + 30~70%', icon: 'flash' },
  { label: '상태 표기', value: '하자/언어 필수', icon: 'shield-checkmark' },
] as const;

export default function ExploreScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.eyebrow}>MARKET NOTE</ThemedText>
          <ThemedText type="title" style={styles.title}>
            시세와 카테고리
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            카드 경매를 빠르게 판단할 수 있는 기준만 모았습니다.
          </ThemedText>
        </View>

        <View style={styles.signalGrid}>
          {marketSignals.map((signal) => (
            <View key={signal.label} style={styles.signalCard}>
              <Ionicons name={signal.icon} size={22} color="#EF4444" />
              <ThemedText style={styles.signalValue}>{signal.value}</ThemedText>
              <ThemedText style={styles.signalLabel}>{signal.label}</ThemedText>
            </View>
          ))}
        </View>

        <ThemedText style={styles.sectionTitle}>카테고리 기준</ThemedText>
        <View style={styles.categoryList}>
          {AUCTION_CATEGORIES.filter((category) => category.key !== 'ALL').map(
            (category) => (
              <View key={category.key} style={styles.categoryItem}>
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: category.background },
                  ]}
                >
                  <ThemedText style={[styles.categoryInitial, { color: category.tint }]}>
                    {category.label.slice(0, 1)}
                  </ThemedText>
                </View>
                <View style={styles.categoryCopy}>
                  <ThemedText style={styles.categoryTitle}>
                    {category.label}
                  </ThemedText>
                  <ThemedText style={styles.categoryText}>
                    {category.subtitle}
                  </ThemedText>
                </View>
              </View>
            ),
          )}
        </View>

        <View style={styles.noticePanel}>
          <ThemedText style={styles.noticeTitle}>등록 전 체크</ThemedText>
          <ThemedText style={styles.noticeText}>
            카드 상태, 언어, 구성품, 사진을 명확히 올리면 입찰 전환이
            좋아집니다.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  scroller: {
    alignSelf: 'center',
    maxWidth: 520,
    width: '100%',
  },
  header: {
    marginBottom: 18,
  },
  eyebrow: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 21,
  },
  signalGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  signalCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 126,
    padding: 12,
  },
  signalValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 12,
    minHeight: 38,
  },
  signalLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  categoryList: {
    gap: 10,
    marginBottom: 18,
  },
  categoryItem: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 14,
  },
  categoryIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    marginRight: 12,
    width: 44,
  },
  categoryInitial: {
    fontSize: 18,
    fontWeight: '900',
  },
  categoryCopy: {
    flex: 1,
  },
  categoryTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 3,
  },
  categoryText: {
    color: '#6B7280',
    fontSize: 13,
  },
  noticePanel: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 18,
  },
  noticeTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 8,
  },
  noticeText: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 21,
  },
});
