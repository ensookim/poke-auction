import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  AUCTION_CATEGORIES,
  formatPrice,
  formatRemainingTime,
  getCategoryMeta,
  sortAuctions,
} from '@/constants/auction';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import auctionService, { AuctionResponse } from '@/services/auctionService';

export default function HomeScreen() {
  const { user, isLoading, isSignedIn } = useAuth();
  const [auctions, setAuctions] = useState<AuctionResponse[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const loadAuctions = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await auctionService.getAuctions({
        sort: 'hot',
        activeOnly: true,
      });
      setAuctions(data);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    loadAuctions();
  }, [loadAuctions]);

  const heroAuction = useMemo(() => auctions[0] ?? null, [auctions]);
  const endingSoon = useMemo(
    () => sortAuctions(auctions, 'ending').slice(0, 4),
    [auctions],
  );

  if (isLoading || isFetching) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#EF4444" />
      </ThemedView>
    );
  }

  if (!isSignedIn || !user) {
    return <Redirect href="/login" />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.eyebrow}>POKE AUCTION</ThemedText>
            <ThemedText type="title" style={styles.title}>
              오늘의 카드 경매
            </ThemedText>
          </View>
          <Pressable style={styles.iconButton} onPress={() => router.push('/sell')}>
            <Ionicons name="add" size={24} color="#111827" />
          </Pressable>
        </View>

        <View style={styles.welcomeBand}>
          <View style={styles.welcomeCopy}>
            <ThemedText style={styles.welcomeName}>
              {user.nickname}님을 위한 추천
            </ThemedText>
            <ThemedText style={styles.welcomeText}>
              마감 임박, 인기 카드, 미개봉 상품을 빠르게 둘러보세요.
            </ThemedText>
          </View>
          <View style={styles.statPill}>
            <ThemedText style={styles.statNumber}>{auctions.length}</ThemedText>
            <ThemedText style={styles.statLabel}>진행중</ThemedText>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRail}
        >
          {AUCTION_CATEGORIES.map((category) => (
            <Pressable
              key={category.key}
              style={[styles.categoryCard, { backgroundColor: category.background }]}
              onPress={() =>
                router.push({
                  pathname: '/buy',
                  params: { category: category.key },
                })
              }
            >
              <ThemedText style={[styles.categoryLabel, { color: category.tint }]}>
                {category.label}
              </ThemedText>
              <ThemedText style={styles.categorySubtitle}>
                {category.subtitle}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {heroAuction ? (
          <Pressable
            style={styles.heroCard}
            onPress={() => router.push(`/auctions/${heroAuction.id}`)}
          >
            <View style={styles.heroImageFrame}>
              <ThemedText style={styles.artMark}>
                {heroAuction.cardName.slice(0, 2)}
              </ThemedText>
              <Image
                source={{ uri: heroAuction.imageUrl }}
                style={styles.heroImage}
                contentFit="contain"
                transition={180}
              />
            </View>
            <View style={styles.heroContent}>
              <View style={styles.heroTopline}>
                <ThemedText style={styles.heroBadge}>
                  {getCategoryMeta(heroAuction.cardCategory).label}
                </ThemedText>
                <ThemedText style={styles.heroTime}>
                  {formatRemainingTime(heroAuction.endAt)}
                </ThemedText>
              </View>
              <ThemedText type="subtitle" style={styles.heroTitle}>
                {heroAuction.cardName}
              </ThemedText>
              <View style={styles.heroFooter}>
                <View>
                  <ThemedText style={styles.muted}>현재가</ThemedText>
                  <ThemedText style={styles.heroPrice}>
                    {formatPrice(heroAuction.currentPrice)}
                  </ThemedText>
                </View>
                <View style={styles.bidBadge}>
                  <Ionicons name="flash" size={15} color="#EF4444" />
                  <ThemedText style={styles.bidBadgeText}>
                    {heroAuction.bidCount} bids
                  </ThemedText>
                </View>
              </View>
            </View>
          </Pressable>
        ) : (
          <View style={styles.emptyBlock}>
            <ThemedText style={styles.emptyTitle}>진행중인 경매가 없어요</ThemedText>
            <ThemedText style={styles.emptyText}>
              첫 포켓몬 카드를 등록해서 시장을 열어보세요.
            </ThemedText>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>마감 임박</ThemedText>
          <Pressable onPress={() => router.push('/buy')}>
            <ThemedText style={styles.linkText}>전체보기</ThemedText>
          </Pressable>
        </View>

        <View style={styles.compactList}>
          {endingSoon.map((auction) => (
            <Pressable
              key={auction.id}
              style={styles.compactItem}
              onPress={() => router.push(`/auctions/${auction.id}`)}
            >
              <View style={styles.compactImageFrame}>
                <ThemedText style={styles.compactArtMark}>
                  {auction.cardName.slice(0, 1)}
                </ThemedText>
                <Image
                  source={{ uri: auction.imageUrl }}
                  style={styles.compactImage}
                  contentFit="contain"
                />
              </View>
              <View style={styles.compactBody}>
                <ThemedText style={styles.compactTitle} numberOfLines={1}>
                  {auction.cardName}
                </ThemedText>
                <ThemedText style={styles.compactMeta}>
                  {getCategoryMeta(auction.cardCategory).label} ·{' '}
                  {formatRemainingTime(auction.endAt)}
                </ThemedText>
              </View>
              <ThemedText style={styles.compactPrice}>
                {formatPrice(auction.currentPrice)}
              </ThemedText>
            </Pressable>
          ))}
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  eyebrow: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 36,
    marginTop: 4,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 18,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  welcomeBand: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    padding: 18,
  },
  welcomeCopy: {
    flex: 1,
    paddingRight: 16,
  },
  welcomeName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  welcomeText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
  },
  statPill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    minWidth: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statNumber: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  categoryRail: {
    gap: 10,
    paddingBottom: 18,
  },
  categoryCard: {
    borderRadius: 8,
    minWidth: 132,
    padding: 14,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 6,
  },
  categorySubtitle: {
    color: '#4B5563',
    fontSize: 12,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 22,
    overflow: 'hidden',
  },
  heroImageFrame: {
    alignItems: 'center',
    backgroundColor: '#EEF2F7',
    height: 230,
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  artMark: {
    color: '#CBD5E1',
    fontSize: 52,
    fontWeight: '900',
    position: 'relative',
    zIndex: 1,
  },
  heroImage: {
    height: '100%',
    position: 'absolute',
    width: '100%',
  },
  heroContent: {
    padding: 18,
  },
  heroTopline: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroBadge: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900',
  },
  heroTime: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
    marginBottom: 18,
  },
  heroFooter: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  muted: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 2,
  },
  heroPrice: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  bidBadge: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bidBadgeText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyBlock: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 22,
    padding: 24,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '900',
  },
  linkText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
  compactList: {
    gap: 10,
  },
  compactItem: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 12,
  },
  compactImageFrame: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    height: 56,
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
    width: 56,
  },
  compactArtMark: {
    color: '#CBD5E1',
    fontSize: 22,
    fontWeight: '900',
    position: 'relative',
    zIndex: 1,
  },
  compactImage: {
    height: '100%',
    position: 'absolute',
    width: '100%',
  },
  compactBody: {
    flex: 1,
    paddingRight: 8,
  },
  compactTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  compactMeta: {
    color: '#6B7280',
    fontSize: 12,
  },
  compactPrice: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
});
