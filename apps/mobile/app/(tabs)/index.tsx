import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatPrice, formatRemainingTime, getCategoryMeta, sortAuctions } from '@/constants/auction';
import { palette } from '@/constants/ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import auctionService, { AuctionResponse } from '@/services/auctionService';
import { BACKEND_URL } from '@/services/apiConfig';
import { getFriendlyErrorMessage } from '@/services/errorUtils';

const homeTabs = ['전체', '포켓몬', '유희왕', '원피스', '매직'];
const H_PADDING = 16;

const adBanners = [
  { id: 'ad-1', title: '5월 신규 혜택', subtitle: '결제 | 할인 | 포인트', bg: '#F3EDE5' },
  { id: 'ad-2', title: '오늘의 특가', subtitle: '마감 임박 상품 모아보기', bg: '#E8EEF8' },
  { id: 'ad-3', title: '첫 거래 지원', subtitle: '수수료 혜택 확인하기', bg: '#E8F7F1' },
  { id: 'ad-4', title: '안심 거래 캠페인', subtitle: '검수 배지 상품 우선 노출', bg: '#F5EBF7' },
  { id: 'ad-5', title: '주말 번개 경매', subtitle: '즉시낙찰 프로모션 진행중', bg: '#EDEDF0' },
];

export default function HomeScreen() {
  const { user, isLoading, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [auctions, setAuctions] = useState<AuctionResponse[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeHomeTab, setActiveHomeTab] = useState(0);
  const [activeAd, setActiveAd] = useState(0);
  const tabPagerRef = useRef<ScrollView>(null);
  const adPagerRef = useRef<ScrollView>(null);
  const contentWidth = Math.max(width - H_PADDING * 2, 280);

  const loadAuctions = useCallback(async (silent = false) => {
    if (!silent) setIsFetching(true);
    try {
      const data = await auctionService.getAuctions({ sort: 'hot', activeOnly: true });
      setAuctions(data);
    } catch (error) {
      Alert.alert(
        '경매 목록 오류',
        `${getFriendlyErrorMessage(error, '경매 목록을 불러오지 못했습니다.')}\n\n요청 주소: ${BACKEND_URL}/api/auctions`,
      );
    } finally {
      if (!silent) setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    loadAuctions();
  }, [loadAuctions]);

  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) loadAuctions(true);
    }, [isSignedIn, loadAuctions]),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAd((prev) => {
        const next = (prev + 1) % adBanners.length;
        adPagerRef.current?.scrollTo({ x: next * contentWidth, animated: true });
        return next;
      });
    }, 2800);
    return () => clearInterval(timer);
  }, [contentWidth]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadAuctions(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadAuctions]);

  const auctionsByTab = useMemo(() => {
    const sorted = sortAuctions(auctions, 'hot');
    return {
      전체: sorted,
      포켓몬: sorted.filter((a) => a.cardName.includes('포켓몬') || a.cardDescription.includes('포켓몬')),
      유희왕: sorted.filter((a) => a.cardName.includes('유희왕') || a.cardDescription.includes('유희왕')),
      원피스: sorted.filter((a) => a.cardName.includes('원피스') || a.cardDescription.includes('원피스')),
      매직: sorted.filter((a) => a.cardName.includes('매직') || a.cardDescription.includes('매직')),
    };
  }, [auctions]);

  const endingSoonCount = useMemo(
    () => auctions.filter((a) => new Date(a.endAt).getTime() - Date.now() <= 24 * 60 * 60 * 1000).length,
    [auctions],
  );

  if (isLoading || isFetching) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.brand} />
      </ThemedView>
    );
  }

  if (!isSignedIn || !user) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 38 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.logoText}>CardPick</ThemedText>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} onPress={() => router.push('/(tabs)/my')}>
              <Ionicons name="heart-outline" size={22} color={palette.ink} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => router.push('/buy')}>
              <Ionicons name="search-outline" size={22} color={palette.ink} />
            </Pressable>
            <Pressable
              style={styles.iconButton}
              onPress={() => router.push('/cart')}
            >
              <Ionicons name="cart-outline" size={22} color={palette.ink} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          ref={adPagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setActiveAd(Math.round(e.nativeEvent.contentOffset.x / contentWidth))}
        >
          {adBanners.map((banner) => (
            <Pressable key={banner.id} style={[styles.adCard, { width: contentWidth, backgroundColor: banner.bg }]}>
              <View style={styles.adCopy}>
                <ThemedText style={styles.adTitle}>{banner.title}</ThemedText>
                <ThemedText style={styles.adSubtitle}>{banner.subtitle}</ThemedText>
              </View>
              <ThemedText style={styles.adCount}>{activeAd + 1}/{adBanners.length}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.adDots}>
          {adBanners.map((banner, idx) => <View key={banner.id} style={[styles.dot, idx === activeAd && styles.dotActive]} />)}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
          {homeTabs.map((tab, idx) => (
            <Pressable
              key={tab}
              style={styles.topTab}
              onPress={() => {
                setActiveHomeTab(idx);
                tabPagerRef.current?.scrollTo({ x: idx * contentWidth, animated: true });
              }}
            >
              <ThemedText style={[styles.topTabText, idx === activeHomeTab && styles.topTabTextActive]}>{tab}</ThemedText>
              {idx === activeHomeTab ? <View style={styles.topTabUnderline} /> : null}
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.signalBand}>
          <View>
            <ThemedText style={styles.signalLabel}>실시간 경매 현황</ThemedText>
            <ThemedText style={styles.signalValue}>{auctions.length}건 진행중</ThemedText>
          </View>
          <View style={styles.signalRight}>
            <Ionicons name="timer" size={16} color={palette.warning} />
            <ThemedText style={styles.signalText}>24시간 내 {endingSoonCount}건</ThemedText>
          </View>
        </View>

        <ScrollView
          ref={tabPagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setActiveHomeTab(Math.round(e.nativeEvent.contentOffset.x / contentWidth))}
        >
          {homeTabs.map((tab) => {
            const data = auctionsByTab[tab as keyof typeof auctionsByTab].slice(0, 8);
            return (
              <View key={tab} style={{ width: contentWidth }}>
                <View style={styles.sectionHeader}>
                  <ThemedText style={styles.sectionTitle}>{tab} 상품</ThemedText>
                  <Pressable style={styles.sectionMoreButton} onPress={() => router.push('/buy')}>
                    <ThemedText style={styles.linkText}>전체보기</ThemedText>
                  </Pressable>
                </View>
                {data.length === 0 ? (
                  <View style={styles.emptyBlock}>
                    <ThemedText style={styles.emptyTitle}>상품이 아직 없어요</ThemedText>
                    <ThemedText style={styles.emptyText}>다른 탭을 확인해보세요.</ThemedText>
                  </View>
                ) : (
                  <View style={styles.grid}>
                    {data.map((auction) => {
                      const category = getCategoryMeta(auction.cardCategory);
                      return (
                        <Pressable key={auction.id} style={styles.gridCard} onPress={() => router.push(`/auctions/${auction.id}`)}>
                          <View style={styles.gridImageFrame}>
                            <Image source={{ uri: auction.imageUrl }} style={styles.gridImage} contentFit="cover" transition={160} />
                          </View>
                          <View style={styles.gridBody}>
                            <View style={styles.gridMetaRow}>
                              <ThemedText style={[styles.gridCategory, { color: category.tint }]}>{category.label}</ThemedText>
                              <ThemedText style={styles.gridTime}>{formatRemainingTime(auction.endAt)}</ThemedText>
                            </View>
                            <ThemedText style={styles.gridTitle} numberOfLines={2}>{auction.cardName}</ThemedText>
                            <View style={styles.gridFooter}>
                              <ThemedText style={styles.gridPrice}>{formatPrice(auction.currentPrice)}</ThemedText>
                              <ThemedText style={styles.gridBid}>{auction.bidCount}입찰</ThemedText>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.canvas },
  scroller: { alignSelf: 'center', maxWidth: 560, width: '100%' },
  scrollContent: { paddingHorizontal: H_PADDING, paddingTop: 4 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  logoText: { color: palette.ink, flexShrink: 1, fontSize: 21, fontWeight: '800', lineHeight: 26 },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconButton: { alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  adCard: { borderRadius: 8, minHeight: 148, paddingHorizontal: 16, paddingVertical: 14, justifyContent: 'space-between' },
  adCopy: { gap: 6 },
  adTitle: { color: '#6B7280', fontSize: 14, fontWeight: '800' },
  adSubtitle: { color: '#374151', fontSize: 30, fontWeight: '900', lineHeight: 38 },
  adCount: { alignSelf: 'flex-end', backgroundColor: 'rgba(17,24,39,0.25)', borderRadius: 999, color: '#FFFFFF', fontSize: 12, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 5 },
  adDots: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center', marginVertical: 12 },
  dot: { backgroundColor: '#D4D4D8', borderRadius: 999, height: 6, width: 6 },
  dotActive: { backgroundColor: '#111827', width: 16 },
  categoryRail: { gap: 14, paddingBottom: 10 },
  topTab: { paddingBottom: 8, paddingTop: 2 },
  topTabText: { color: '#6B7280', fontSize: 17, fontWeight: '800' },
  topTabTextActive: { color: '#111827', fontWeight: '900' },
  topTabUnderline: { backgroundColor: '#111827', borderRadius: 999, height: 4, marginTop: 8, width: '100%' },
  signalBand: { alignItems: 'center', backgroundColor: '#F3EDE5', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, padding: 15 },
  signalLabel: { color: '#9CA3AF', fontSize: 12, fontWeight: '800', marginBottom: 3 },
  signalValue: { color: '#374151', fontSize: 21, fontWeight: '900' },
  signalRight: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 999, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 8 },
  signalText: { color: '#1F2937', fontSize: 12, fontWeight: '900' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 10, marginTop: 6, width: '100%' },
  sectionTitle: { color: '#111827', fontSize: 18, fontWeight: '900' },
  sectionMoreButton: { marginLeft: 'auto', paddingLeft: 12, alignSelf: 'flex-end' },
  linkText: { color: palette.brand, fontSize: 13, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: { backgroundColor: palette.surface, borderColor: palette.line, borderRadius: 8, borderWidth: 1, overflow: 'hidden', width: '48.5%' },
  gridImageFrame: { aspectRatio: 0.72, backgroundColor: '#E5E7EB', position: 'relative', width: '100%' },
  gridImage: { height: '100%', width: '100%' },
  gridBody: { padding: 11 },
  gridMetaRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  gridCategory: { fontSize: 11, fontWeight: '900' },
  gridTime: { color: palette.muted, fontSize: 11, fontWeight: '800' },
  gridTitle: { color: palette.ink, fontSize: 15, fontWeight: '900', lineHeight: 20, minHeight: 40 },
  gridFooter: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  gridPrice: { color: palette.ink, fontSize: 16, fontWeight: '900' },
  gridBid: { color: palette.muted, fontSize: 11, fontWeight: '800' },
  emptyBlock: { alignItems: 'center', backgroundColor: palette.surface, borderColor: palette.line, borderRadius: 8, borderWidth: 1, padding: 24 },
  emptyTitle: { color: palette.ink, fontSize: 17, fontWeight: '900', marginBottom: 6 },
  emptyText: { color: palette.muted, fontSize: 13 },
});
