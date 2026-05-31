import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DetailPageHeader } from '@/components/detail-page-header';
import { ThemedText } from '@/components/themed-text';
import { formatPrice, formatRemainingTime, getCategoryMeta } from '@/constants/auction';
import { palette } from '@/constants/ui';
import recentViewedService, { RecentViewedAuction } from '@/services/recentViewedService';

export default function RecentViewedScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<RecentViewedAuction[]>([]);

  const load = useCallback(() => {
    recentViewedService.getAll().then(setItems).catch(() => setItems([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const clear = () => {
    Alert.alert('최근 본 상품 삭제', '최근 본 상품 목록을 모두 지울까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await recentViewedService.clear();
          setItems([]);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <DetailPageHeader eyebrow="RECENT" title="최근 본 상품" />
          {items.length > 0 ? (
            <Pressable style={styles.clearButton} onPress={clear} accessibilityLabel="최근 본 상품 삭제">
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </Pressable>
          ) : null}
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={30} color="#98A2B3" />
            <ThemedText style={styles.emptyTitle}>최근 본 상품이 없어요</ThemedText>
            <ThemedText style={styles.emptyText}>경매 상세를 열면 여기에 자동으로 저장됩니다.</ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((auction) => {
              const category = getCategoryMeta(auction.cardCategory);
              return (
                <Pressable
                  key={auction.id}
                  style={styles.card}
                  onPress={() => router.push(`/auctions/${auction.id}` as any)}
                >
                  <Image source={{ uri: auction.imageUrl }} style={styles.image} contentFit="cover" />
                  <View style={styles.cardBody}>
                    <ThemedText style={[styles.category, { color: category.tint }]}>{category.label}</ThemedText>
                    <ThemedText style={styles.cardName} numberOfLines={2}>
                      {auction.cardName}
                    </ThemedText>
                    <View style={styles.metaRow}>
                      <ThemedText style={styles.price}>{formatPrice(auction.currentPrice)}</ThemedText>
                      <ThemedText style={styles.metaText}>{auction.bidCount}입찰</ThemedText>
                    </View>
                    <ThemedText style={styles.timeText}>{formatRemainingTime(auction.endAt)}</ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F5F5F5', flex: 1 },
  scroller: { alignSelf: 'center', maxWidth: 520, width: '100%' },
  content: { paddingHorizontal: 20, paddingTop: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  clearButton: { alignItems: 'center', height: 40, justifyContent: 'center', marginTop: 10, width: 40 },
  empty: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 28,
  },
  emptyTitle: { color: palette.ink, fontSize: 17, fontWeight: '900', lineHeight: 23, marginTop: 12 },
  emptyText: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  list: { gap: 10 },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  image: { backgroundColor: '#E5E7EB', height: 118, width: 92 },
  cardBody: { flex: 1, padding: 12 },
  category: { fontSize: 11, fontWeight: '900', marginBottom: 5 },
  cardName: { color: palette.ink, fontSize: 15, fontWeight: '900', lineHeight: 20 },
  metaRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  price: { color: palette.ink, fontSize: 16, fontWeight: '900' },
  metaText: { color: palette.muted, fontSize: 11, fontWeight: '800' },
  timeText: { color: palette.brand, fontSize: 12, fontWeight: '900', marginTop: 7 },
});
