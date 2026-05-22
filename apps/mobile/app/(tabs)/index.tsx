import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AUCTION_CATEGORIES,
  AuctionCategoryKey,
  formatPrice,
  formatRemainingTime,
  getCategoryMeta,
  sortAuctions,
} from '@/constants/auction';
import { palette, shadow, typography } from '@/constants/ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import auctionService, { AuctionResponse } from '@/services/auctionService';

const visibleCategories = AUCTION_CATEGORIES.filter(
  (category) => category.key !== 'ALL',
);

export default function HomeScreen() {
  const { user, isLoading, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [auctions, setAuctions] = useState<AuctionResponse[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<AuctionCategoryKey>('ALL');

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

  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) {
        loadAuctions();
      }
    }, [isSignedIn, loadAuctions]),
  );

  const filteredAuctions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const filtered = auctions.filter((auction) => {
      if (
        selectedCategory !== 'ALL' &&
        auction.cardCategory !== selectedCategory
      ) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [auction.cardName, auction.cardRarity, auction.cardDescription]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(keyword));
    });

    return sortAuctions(filtered, 'hot').slice(0, 8);
  }, [auctions, query, selectedCategory]);

  const endingSoonCount = useMemo(
    () =>
      auctions.filter(
        (auction) =>
          new Date(auction.endAt).getTime() - Date.now() <= 24 * 60 * 60 * 1000,
      ).length,
    [auctions],
  );

  const handleSubmitSearch = () => {
    router.push({
      pathname: '/buy',
      params: { q: query, category: selectedCategory },
    } as any);
  };

  if (isLoading || isFetching) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.brand} />
      </ThemedView>
    );
  }

  if (!isSignedIn || !user) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 38 + insets.bottom },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.brand}>CARDBID</ThemedText>
            <ThemedText style={styles.greeting}>{user.nickname}님</ThemedText>
          </View>
          <View style={styles.headerActions}>
          <Pressable style={styles.iconButton} onPress={() => router.push('/messages')}>
              <Ionicons name="chatbubble-ellipses-outline" size={21} color={palette.ink} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => router.push('/sell')}>
              <Ionicons name="camera-outline" size={22} color={palette.ink} />
            </Pressable>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={palette.subtle} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmitSearch}
            placeholder="카드명, 브랜드, 등급 검색"
            placeholderTextColor={palette.subtle}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={19} color={palette.subtle} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.quickRow}>
          <Pressable style={styles.quickCard} onPress={() => router.push('/buy')}>
            <Ionicons name="search-outline" size={19} color={palette.brand} />
            <View style={styles.quickCopy}>
              <ThemedText style={styles.quickTitle}>검색</ThemedText>
              <ThemedText style={styles.quickMeta}>필터로 찾기</ThemedText>
            </View>
          </Pressable>
          <Pressable style={styles.quickCard} onPress={() => router.push('/sell')}>
            <Ionicons name="camera-outline" size={19} color={palette.brand} />
            <View style={styles.quickCopy}>
              <ThemedText style={styles.quickTitle}>등록</ThemedText>
              <ThemedText style={styles.quickMeta}>경매 열기</ThemedText>
            </View>
          </Pressable>
          <Pressable style={styles.quickCard} onPress={() => router.push('/my' as any)}>
            <Ionicons name="person-outline" size={19} color={palette.brand} />
            <View style={styles.quickCopy}>
              <ThemedText style={styles.quickTitle}>MY</ThemedText>
              <ThemedText style={styles.quickMeta}>활동관리</ThemedText>
            </View>
          </Pressable>
        </View>

        <View style={styles.signalBand}>
          <View>
            <ThemedText style={styles.signalLabel}>실시간 경매</ThemedText>
            <ThemedText style={styles.signalValue}>{auctions.length}개 진행중</ThemedText>
          </View>
          <View style={styles.signalRight}>
            <Ionicons name="timer" size={16} color={palette.warning} />
            <ThemedText style={styles.signalText}>24시간 내 {endingSoonCount}개</ThemedText>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRail}
        >
          <Pressable
            style={[
              styles.categoryChip,
              selectedCategory === 'ALL' && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory('ALL')}
          >
            <ThemedText
              style={[
                styles.categoryChipText,
                selectedCategory === 'ALL' && styles.categoryChipTextActive,
              ]}
            >
              전체
            </ThemedText>
          </Pressable>
          {visibleCategories.map((category) => {
            const active = selectedCategory === category.key;
            return (
              <Pressable
                key={category.key}
                style={[
                  styles.categoryChip,
                  active && {
                    backgroundColor: category.tint,
                    borderColor: category.tint,
                  },
                ]}
                onPress={() => setSelectedCategory(category.key)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={14}
                  color={active ? '#FFFFFF' : category.tint}
                />
                <ThemedText
                  style={[styles.categoryChipText, active && styles.categoryChipTextActive]}
                >
                  {category.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>진행중인 카드</ThemedText>
          <Pressable onPress={() => router.push('/buy')}>
            <ThemedText style={styles.linkText}>전체보기</ThemedText>
          </Pressable>
        </View>

        {filteredAuctions.length === 0 ? (
          <View style={styles.emptyBlock}>
            <ThemedText style={styles.emptyTitle}>검색 결과가 없어요</ThemedText>
            <ThemedText style={styles.emptyText}>다른 카드명이나 카테고리로 찾아보세요.</ThemedText>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredAuctions.map((auction) => {
              const category = getCategoryMeta(auction.cardCategory);
              return (
                <Pressable
                  key={auction.id}
                  style={styles.gridCard}
                  onPress={() => router.push(`/auctions/${auction.id}`)}
                >
                  <View style={styles.gridImageFrame}>
                    <ThemedText style={styles.artMark}>
                      {auction.cardName.slice(0, 1)}
                    </ThemedText>
                    <Image
                      source={{ uri: auction.imageUrl }}
                      style={styles.gridImage}
                      contentFit="cover"
                      transition={150}
                    />
                    {auction.buyNowPrice ? (
                      <View style={styles.buyNowBadge}>
                        <Ionicons name="flash" size={12} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.gridBody}>
                    <View style={styles.gridMetaRow}>
                      <ThemedText style={[styles.gridCategory, { color: category.tint }]}>
                        {category.label}
                      </ThemedText>
                      <ThemedText style={styles.gridTime}>
                        {formatRemainingTime(auction.endAt)}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.gridTitle} numberOfLines={2}>
                      {auction.cardName}
                    </ThemedText>
                    <View style={styles.gridFooter}>
                      <ThemedText style={styles.gridPrice}>
                        {formatPrice(auction.currentPrice)}
                      </ThemedText>
                      <ThemedText style={styles.gridBid}>{auction.bidCount}입찰</ThemedText>
                    </View>
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
    backgroundColor: palette.canvas,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.canvas,
  },
  scroller: {
    alignSelf: 'center',
    maxWidth: 560,
    width: '100%',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 38,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  brand: {
    color: palette.brand,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  greeting: {
    color: palette.ink,
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 29,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 14,
    ...shadow,
  },
  searchInput: {
    color: palette.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: '700',
    height: 50,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 58,
    paddingHorizontal: 10,
  },
  quickCopy: {
    flex: 1,
  },
  quickTitle: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 2,
  },
  quickMeta: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  signalBand: {
    alignItems: 'center',
    backgroundColor: palette.night,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    padding: 15,
  },
  signalLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 3,
  },
  signalValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  signalRight: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  signalText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  categoryRail: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  categoryChipActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  categoryChipText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '900',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  linkText: {
    color: palette.brand,
    fontSize: 13,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    width: '48.5%',
  },
  gridImageFrame: {
    alignItems: 'center',
    aspectRatio: 0.72,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  artMark: {
    color: '#CBD5E1',
    fontSize: 36,
    fontWeight: '900',
    position: 'relative',
    zIndex: 1,
  },
  gridImage: {
    height: '100%',
    position: 'absolute',
    width: '100%',
  },
  buyNowBadge: {
    alignItems: 'center',
    backgroundColor: palette.brand,
    borderRadius: 6,
    height: 25,
    justifyContent: 'center',
    position: 'absolute',
    right: 9,
    top: 9,
    width: 25,
    zIndex: 3,
  },
  gridBody: {
    padding: 11,
  },
  gridMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  gridCategory: {
    fontSize: 11,
    fontWeight: '900',
  },
  gridTime: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  gridTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
    minHeight: 40,
  },
  gridFooter: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  gridPrice: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  gridBid: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyBlock: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptyText: {
    color: palette.muted,
    fontSize: 13,
  },
});
