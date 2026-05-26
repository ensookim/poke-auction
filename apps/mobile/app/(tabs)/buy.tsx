import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AUCTION_CATEGORIES,
  AuctionCategoryKey,
  AuctionSortKey,
  EDITION_OPTIONS,
  GRADING_COMPANIES,
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
import { palette, shadow, typography } from '@/constants/ui';
import { getFriendlyErrorMessage } from '@/services/errorUtils';

export default function BuyScreen() {
  const params = useLocalSearchParams<{ category?: AuctionCategoryKey; q?: string }>();
  const { isLoading, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [auctions, setAuctions] = useState<AuctionResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AuctionCategoryKey>(params.category ?? 'ALL');
  const [sort, setSort] = useState<AuctionSortKey>('hot');
  const [query, setQuery] = useState(params.q ?? '');
  const [selectedEdition, setSelectedEdition] = useState<'ALL' | (typeof EDITION_OPTIONS)[number]>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<'ALL' | (typeof GRADING_COMPANIES)[number]>('ALL');
  const [buyNowOnly, setBuyNowOnly] = useState(false);
  const [endingTodayOnly, setEndingTodayOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAuctions = useCallback(async (silent = false) => {
    if (!silent) setIsFetching(true);
    try {
      const data = await auctionService.getAuctions({ category: selectedCategory, sort, activeOnly: true });
      setAuctions(data);
    } catch (error) {
      Alert.alert('경매 목록 오류', getFriendlyErrorMessage(error, '경매 목록을 불러오지 못했습니다.'));
    } finally {
      if (!silent) setIsFetching(false);
    }
  }, [selectedCategory, sort]);

  useEffect(() => {
    loadAuctions();
  }, [loadAuctions]);

  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) loadAuctions(true);
    }, [isSignedIn, loadAuctions]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadAuctions(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadAuctions]);

  useEffect(() => {
    if (params.category) setSelectedCategory(params.category);
    if (typeof params.q === 'string') setQuery(params.q);
  }, [params.category, params.q]);

  const visibleAuctions = useMemo(() => {
    const searched = auctions.filter((auction) => {
      const keyword = query.trim().toLowerCase();
      const attributes = auction.cardRarity?.toLowerCase() ?? '';
      const matchesEdition = selectedEdition === 'ALL' || attributes.includes(selectedEdition.toLowerCase());
      const matchesGrade = selectedGrade === 'ALL' || attributes.includes(selectedGrade.toLowerCase());
      const matchesAttributes = matchesEdition && matchesGrade;
      if (buyNowOnly && !auction.buyNowPrice) return false;
      if (endingTodayOnly && new Date(auction.endAt).getTime() - Date.now() > 24 * 60 * 60 * 1000) return false;
      if (!keyword) return matchesAttributes;
      return matchesAttributes && [auction.cardName, auction.cardRarity, auction.cardDescription].filter(Boolean).some((text) => text.toLowerCase().includes(keyword));
    });
    return sortAuctions(searched, sort);
  }, [auctions, buyNowOnly, endingTodayOnly, query, selectedEdition, selectedGrade, sort]);

  if (isLoading || isFetching) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#EF4444" />
      </ThemedView>
    );
  }
  if (!isSignedIn) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[styles.content, { paddingBottom: 36 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.eyebrow}>SEARCH</ThemedText>
          <ThemedText type="title" style={styles.title}>검색</ThemedText>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={19} color="#9CA3AF" />
          <TextInput value={query} onChangeText={setQuery} placeholder="카드명, 희귀도, 설명 검색" placeholderTextColor="#9CA3AF" style={styles.searchInput} />
          <Pressable style={styles.filterToggle} onPress={() => setShowFilters((v) => !v)}>
            <Ionicons name="options-outline" size={15} color="#FFFFFF" />
            <ThemedText style={styles.filterToggleText}>조건설정</ThemedText>
          </Pressable>
        </View>

        {showFilters ? (
          <View style={styles.filterPanel}>
            <View style={styles.filterCards}>
              <Pressable style={[styles.filterCard, buyNowOnly && styles.filterCardActive]} onPress={() => setBuyNowOnly((v) => !v)}>
                <Ionicons name="flash" size={18} color={buyNowOnly ? '#FFFFFF' : palette.brand} />
                <ThemedText style={[styles.filterTitle, buyNowOnly && styles.filterTitleActive]}>즉시낙찰</ThemedText>
              </Pressable>
              <Pressable style={[styles.filterCard, endingTodayOnly && styles.filterCardActive]} onPress={() => setEndingTodayOnly((v) => !v)}>
                <Ionicons name="timer" size={18} color={endingTodayOnly ? '#FFFFFF' : palette.brand} />
                <ThemedText style={[styles.filterTitle, endingTodayOnly && styles.filterTitleActive]}>24시간 내 마감</ThemedText>
              </Pressable>
            </View>

            <ThemedText style={styles.attributeLabel}>에디션</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attributeRail}>
              {(['ALL', ...EDITION_OPTIONS] as const).map((option) => (
                <Pressable key={option} style={[styles.attributeChip, selectedEdition === option && styles.attributeChipActive]} onPress={() => setSelectedEdition(option)}>
                  <ThemedText style={[styles.attributeChipText, selectedEdition === option && styles.attributeChipTextActive]}>{option === 'ALL' ? '전체' : option}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            <ThemedText style={styles.attributeLabel}>감정사</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attributeRail}>
              {(['ALL', ...GRADING_COMPANIES] as const).map((option) => (
                <Pressable key={option} style={[styles.attributeChip, selectedGrade === option && styles.attributeChipActive]} onPress={() => setSelectedGrade(option)}>
                  <ThemedText style={[styles.attributeChipText, selectedGrade === option && styles.attributeChipTextActive]}>{option === 'ALL' ? '전체' : option}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
          {AUCTION_CATEGORIES.map((category) => {
            const active = selectedCategory === category.key;
            return (
              <Pressable key={category.key} onPress={() => setSelectedCategory(category.key)} style={[styles.categoryChip, active && { backgroundColor: category.tint, borderColor: category.tint }]}>
                <ThemedText style={[styles.categoryChipText, active && styles.activeChipText]}>{category.label}</ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((option) => (
            <Pressable key={option.key} onPress={() => setSort(option.key)} style={[styles.sortChip, sort === option.key && styles.sortChipActive]}>
              <ThemedText style={[styles.sortChipText, sort === option.key && styles.sortChipTextActive]}>{option.label}</ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.resultHeader}>
          <ThemedText style={styles.resultTitle}>{visibleAuctions.length}개 경매</ThemedText>
          <ThemedText style={styles.resultMeta}>실시간 진행중</ThemedText>
        </View>

        {visibleAuctions.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyTitle}>조건에 맞는 경매가 없어요</ThemedText>
            <ThemedText style={styles.emptyText}>필터를 조정해 다시 찾아보세요.</ThemedText>
          </View>
        ) : (
          <View style={styles.cardList}>
            {visibleAuctions.map((auction) => {
              const category = getCategoryMeta(auction.cardCategory);
              return (
                <Pressable key={auction.id} style={styles.auctionCard} onPress={() => router.push(`/auctions/${auction.id}`)}>
                  <View style={styles.auctionImageFrame}>
                    <Image source={{ uri: auction.imageUrl }} style={styles.auctionImage} contentFit="cover" transition={150} />
                  </View>
                  <View style={styles.auctionBody}>
                    <View style={styles.cardTopline}>
                      <ThemedText style={[styles.cardCategory, { color: category.tint }]}>{category.label}</ThemedText>
                      <ThemedText style={styles.cardTime}>{formatRemainingTime(auction.endAt)}</ThemedText>
                    </View>
                    <ThemedText style={styles.cardTitle} numberOfLines={1}>{auction.cardName}</ThemedText>
                    <ThemedText style={styles.cardDescription} numberOfLines={2}>{auction.cardDescription || '상세 설명이 없습니다.'}</ThemedText>
                    <View style={styles.cardFooter}>
                      <View>
                        <ThemedText style={styles.priceLabel}>현재가</ThemedText>
                        <ThemedText style={styles.cardPrice}>{formatPrice(auction.currentPrice)}</ThemedText>
                      </View>
                      <View style={styles.bidCount}>
                        <Ionicons name="people" size={14} color="#4B5563" />
                        <ThemedText style={styles.bidCountText}>{auction.bidCount}</ThemedText>
                      </View>
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
  container: { flex: 1, backgroundColor: palette.canvas },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F7F9' },
  scroller: { alignSelf: 'center', maxWidth: 520, width: '100%' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36 },
  header: { marginBottom: 12 },
  eyebrow: { color: palette.brand, fontSize: 12, fontWeight: '900', marginBottom: 4 },
  title: { color: '#111827', fontSize: 30, fontWeight: '900', lineHeight: 36 },
  searchBox: { alignItems: 'center', backgroundColor: palette.surface, borderColor: palette.line, borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 12, paddingHorizontal: 14 },
  searchInput: { color: '#111827', flex: 1, fontFamily: typography.family, fontSize: 15, height: 48 },
  filterToggle: { alignItems: 'center', backgroundColor: '#111827', borderRadius: 8, flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 8 },
  filterToggleText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  filterPanel: { backgroundColor: '#FFFFFF', borderColor: palette.line, borderRadius: 8, borderWidth: 1, marginBottom: 12, padding: 12, ...shadow },
  filterCards: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  filterCard: { alignItems: 'center', backgroundColor: '#F8FAFC', borderColor: palette.line, borderRadius: 8, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 8, padding: 11 },
  filterCardActive: { backgroundColor: palette.ink, borderColor: palette.ink },
  filterTitle: { color: palette.ink, fontSize: 12, fontWeight: '900' },
  filterTitleActive: { color: '#FFFFFF' },
  attributeLabel: { color: palette.muted, fontSize: 12, fontWeight: '900', marginBottom: 6, marginTop: 4 },
  attributeRail: { gap: 8, paddingBottom: 2 },
  attributeChip: { backgroundColor: '#FFFFFF', borderColor: palette.line, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  attributeChipActive: { backgroundColor: palette.ink, borderColor: palette.ink },
  attributeChipText: { color: palette.muted, fontSize: 12, fontWeight: '900' },
  attributeChipTextActive: { color: '#FFFFFF' },
  categoryRail: { gap: 8, paddingBottom: 12 },
  categoryChip: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  categoryChipText: { color: '#4B5563', fontSize: 13, fontWeight: '800' },
  activeChipText: { color: '#FFFFFF' },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  sortChip: { backgroundColor: '#EDEFF3', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  sortChipActive: { backgroundColor: '#111827' },
  sortChipText: { color: '#4B5563', fontSize: 12, fontWeight: '800' },
  sortChipTextActive: { color: '#FFFFFF' },
  resultHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  resultTitle: { color: '#111827', fontSize: 18, fontWeight: '900' },
  resultMeta: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  cardList: { gap: 12 },
  auctionCard: { backgroundColor: palette.surface, borderColor: palette.line, borderRadius: 8, borderWidth: 1, flexDirection: 'row', overflow: 'hidden', ...shadow },
  auctionImageFrame: { backgroundColor: '#F3F4F6', aspectRatio: 0.72, overflow: 'hidden', position: 'relative', width: 132 },
  auctionImage: { height: '100%', position: 'absolute', width: '100%' },
  auctionBody: { flex: 1, padding: 14 },
  cardTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardCategory: { fontSize: 12, fontWeight: '900' },
  cardTime: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  cardTitle: { color: '#111827', fontSize: 18, fontWeight: '900', marginBottom: 6 },
  cardDescription: { color: '#6B7280', fontSize: 13, lineHeight: 18, minHeight: 36 },
  cardFooter: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  priceLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  cardPrice: { color: '#111827', fontSize: 18, fontWeight: '900' },
  bidCount: { alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, flexDirection: 'row', gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  bidCountText: { color: '#4B5563', fontSize: 12, fontWeight: '800' },
  emptyState: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 8, borderWidth: 1, padding: 28 },
  emptyTitle: { color: '#111827', fontSize: 17, fontWeight: '900', marginBottom: 6 },
  emptyText: { color: '#6B7280', fontSize: 13 },
});
