import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  AUCTION_CATEGORIES,
  AuctionCategoryKey,
  AuctionSortKey,
  SORT_OPTIONS,
  formatPrice,
  formatRemainingTime,
  getCategoryMeta,
  sortAuctions,
} from '@/constants/auction';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import auctionService, { AuctionResponse } from '@/services/auctionService';

export default function BuyScreen() {
  const params = useLocalSearchParams<{ category?: AuctionCategoryKey }>();
  const { isLoading, isSignedIn } = useAuth();
  const [auctions, setAuctions] = useState<AuctionResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AuctionCategoryKey>(
    params.category ?? 'ALL',
  );
  const [sort, setSort] = useState<AuctionSortKey>('hot');
  const [query, setQuery] = useState('');
  const [isFetching, setIsFetching] = useState(true);

  const loadAuctions = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await auctionService.getAuctions({
        category: selectedCategory,
        sort,
        activeOnly: true,
      });
      setAuctions(data);
    } catch (error) {
      Alert.alert(
        '경매 목록 오류',
        error instanceof Error
          ? error.message
          : '경매 목록을 불러오지 못했습니다.',
      );
    } finally {
      setIsFetching(false);
    }
  }, [selectedCategory, sort]);

  useEffect(() => {
    loadAuctions();
  }, [loadAuctions]);

  useEffect(() => {
    if (params.category) {
      setSelectedCategory(params.category);
    }
  }, [params.category]);

  const visibleAuctions = useMemo(() => {
    const searched = auctions.filter((auction) => {
      const keyword = query.trim().toLowerCase();
      if (!keyword) {
        return true;
      }

      return [auction.cardName, auction.cardRarity, auction.cardDescription]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(keyword));
    });

    return sortAuctions(searched, sort);
  }, [auctions, query, sort]);

  if (isLoading || isFetching) {
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
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.eyebrow}>MARKET</ThemedText>
          <ThemedText type="title" style={styles.title}>
            카드 찾기
          </ThemedText>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={19} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="카드명, 희귀도, 설명 검색"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRail}
        >
          {AUCTION_CATEGORIES.map((category) => {
            const active = selectedCategory === category.key;
            return (
              <Pressable
                key={category.key}
                onPress={() => setSelectedCategory(category.key)}
                style={[
                  styles.categoryChip,
                  active && {
                    backgroundColor: category.tint,
                    borderColor: category.tint,
                  },
                ]}
              >
                <ThemedText
                  style={[styles.categoryChipText, active && styles.activeChipText]}
                >
                  {category.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setSort(option.key)}
              style={[styles.sortChip, sort === option.key && styles.sortChipActive]}
            >
              <ThemedText
                style={[
                  styles.sortChipText,
                  sort === option.key && styles.sortChipTextActive,
                ]}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.resultHeader}>
          <ThemedText style={styles.resultTitle}>
            {visibleAuctions.length}개 경매
          </ThemedText>
          <ThemedText style={styles.resultMeta}>실시간 진행중</ThemedText>
        </View>

        {visibleAuctions.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyTitle}>조건에 맞는 경매가 없어요</ThemedText>
            <ThemedText style={styles.emptyText}>
              다른 카테고리나 검색어로 다시 찾아보세요.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.cardList}>
            {visibleAuctions.map((auction) => {
              const category = getCategoryMeta(auction.cardCategory);
              return (
                <Pressable
                  key={auction.id}
                  style={styles.auctionCard}
                  onPress={() => router.push(`/auctions/${auction.id}`)}
                >
                  <View style={styles.auctionImageFrame}>
                    <ThemedText style={styles.artMark}>
                      {auction.cardName.slice(0, 1)}
                    </ThemedText>
                    <Image
                      source={{ uri: auction.imageUrl }}
                      style={styles.auctionImage}
                      contentFit="contain"
                      transition={150}
                    />
                  </View>
                  <View style={styles.auctionBody}>
                    <View style={styles.cardTopline}>
                      <ThemedText style={[styles.cardCategory, { color: category.tint }]}>
                        {category.label}
                      </ThemedText>
                      <ThemedText style={styles.cardTime}>
                        {formatRemainingTime(auction.endAt)}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.cardTitle} numberOfLines={1}>
                      {auction.cardName}
                    </ThemedText>
                    <ThemedText style={styles.cardDescription} numberOfLines={2}>
                      {auction.cardDescription || '상세 설명이 없습니다.'}
                    </ThemedText>
                    <View style={styles.cardFooter}>
                      <View>
                        <ThemedText style={styles.priceLabel}>현재가</ThemedText>
                        <ThemedText style={styles.cardPrice}>
                          {formatPrice(auction.currentPrice)}
                        </ThemedText>
                      </View>
                      <View style={styles.bidCount}>
                        <Ionicons name="people" size={14} color="#4B5563" />
                        <ThemedText style={styles.bidCountText}>
                          {auction.bidCount}
                        </ThemedText>
                      </View>
                    </View>
                    {auction.buyNowPrice ? (
                      <ThemedText style={styles.buyNowText}>
                        즉시 낙찰 {formatPrice(auction.buyNowPrice)}
                      </ThemedText>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
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
  content: {
    padding: 20,
    paddingBottom: 36,
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
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: '#111827',
    flex: 1,
    fontSize: 15,
    height: 48,
  },
  categoryRail: {
    gap: 8,
    paddingBottom: 12,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  categoryChipText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '800',
  },
  activeChipText: {
    color: '#FFFFFF',
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  sortChip: {
    backgroundColor: '#EDEFF3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortChipActive: {
    backgroundColor: '#111827',
  },
  sortChipText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '800',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
  },
  resultHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  resultMeta: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  cardList: {
    gap: 12,
  },
  auctionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  auctionImageFrame: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    minHeight: 180,
    overflow: 'hidden',
    position: 'relative',
    width: 132,
  },
  artMark: {
    color: '#CBD5E1',
    fontSize: 42,
    fontWeight: '900',
    position: 'relative',
    zIndex: 1,
  },
  auctionImage: {
    height: '100%',
    position: 'absolute',
    width: '100%',
  },
  auctionBody: {
    flex: 1,
    padding: 14,
  },
  cardTopline: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardCategory: {
    fontSize: 12,
    fontWeight: '900',
  },
  cardTime: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardDescription: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
    minHeight: 36,
  },
  cardFooter: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  priceLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardPrice: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  bidCount: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  bidCountText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '800',
  },
  buyNowText: {
    color: '#BE123C',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 10,
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
  },
});
