import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  formatPrice,
  formatRemainingTime,
  getCategoryMeta,
} from '@/constants/auction';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import auctionService, { AuctionResponse } from '@/services/auctionService';

export default function MyBids() {
  const { isLoading, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [auctions, setAuctions] = useState<AuctionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auctionService.getAuctionsByBidder();
      setAuctions(data);
    } catch (error) {
      Alert.alert(
        '오류',
        error instanceof Error ? error.message : '불러오기 실패',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) {
        load();
      }
    }, [isSignedIn, load]),
  );

  const stats = useMemo(
    () => ({
      active: auctions.filter((auction) => auction.active).length,
      won: auctions.filter((auction) => auction.winnerId).length,
    }),
    [auctions],
  );

  if (isLoading || loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#EF4444" />
      </ThemedView>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 40 + insets.bottom },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.eyebrow}>MY BIDS</ThemedText>
          <ThemedText type="title" style={styles.title}>
            내 입찰
          </ThemedText>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <ThemedText style={styles.statValue}>{auctions.length}</ThemedText>
            <ThemedText style={styles.statLabel}>전체</ThemedText>
          </View>
          <View style={styles.statBox}>
            <ThemedText style={styles.statValue}>{stats.active}</ThemedText>
            <ThemedText style={styles.statLabel}>진행중</ThemedText>
          </View>
          <View style={styles.statBox}>
            <ThemedText style={styles.statValue}>{stats.won}</ThemedText>
            <ThemedText style={styles.statLabel}>낙찰</ThemedText>
          </View>
        </View>

        {auctions.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyTitle}>아직 입찰한 경매가 없어요</ThemedText>
            <ThemedText style={styles.emptyText}>
              구매 탭에서 마음에 드는 카드를 찾아보세요.
            </ThemedText>
            <Pressable style={styles.emptyButton} onPress={() => router.push('/buy')}>
              <ThemedText style={styles.emptyButtonText}>경매 보러가기</ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {auctions.map((auction) => {
              const category = getCategoryMeta(auction.cardCategory);
              return (
                <Pressable
                  key={auction.id}
                  style={styles.item}
                  onPress={() => router.push(`/auctions/${auction.id}`)}
                >
                  <View style={styles.imageFrame}>
                    <ThemedText style={styles.artMark}>
                      {auction.cardName.slice(0, 1)}
                    </ThemedText>
                    <Image
                      source={{ uri: auction.imageUrl }}
                      style={styles.image}
                      contentFit="cover"
                    />
                  </View>
                  <View style={styles.itemBody}>
                    <View style={styles.itemTop}>
                      <ThemedText
                        style={[styles.category, { color: category.tint }]}
                      >
                        {category.label}
                      </ThemedText>
                      <ThemedText style={styles.status}>
                        {auction.active ? '진행중' : '종료'}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.itemTitle} numberOfLines={1}>
                      {auction.cardName}
                    </ThemedText>
                    <ThemedText style={styles.itemMeta}>
                      {formatRemainingTime(auction.endAt)} · 입찰 {auction.bidCount}회
                    </ThemedText>
                    <ThemedText style={styles.itemPrice}>
                      {formatPrice(auction.currentPrice)}
                    </ThemedText>
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
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F7F9',
  },
  scroller: {
    alignSelf: 'center',
    maxWidth: 520,
    width: '100%',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
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
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  statValue: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    padding: 28,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  list: {
    gap: 12,
  },
  item: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  imageFrame: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    aspectRatio: 0.72,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: 104,
  },
  artMark: {
    color: '#CBD5E1',
    fontSize: 36,
    fontWeight: '900',
    position: 'relative',
    zIndex: 1,
  },
  image: {
    height: '100%',
    position: 'absolute',
    width: '100%',
  },
  itemBody: {
    flex: 1,
    padding: 14,
  },
  itemTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    fontWeight: '900',
  },
  status: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
  },
  itemTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  itemMeta: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 12,
  },
  itemPrice: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
});
