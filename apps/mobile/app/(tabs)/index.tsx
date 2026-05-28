import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
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

import { AuctionCategoryKey, formatPrice, formatRemainingTime, getCategoryMeta, sortAuctions } from '@/constants/auction';
import { palette } from '@/constants/ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import auctionService, { AuctionResponse } from '@/services/auctionService';
import { BACKEND_URL } from '@/services/apiConfig';
import { getFriendlyErrorMessage } from '@/services/errorUtils';

const homeTabs: { label: string; category: AuctionCategoryKey }[] = [
  { label: '전체', category: 'ALL' },
  { label: '포켓몬', category: 'POKEMON' },
  { label: '유희왕', category: 'YUGIOH' },
  { label: '원피스', category: 'ONE_PIECE' },
  { label: '매직', category: 'ETC' },
];
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
  const mainScrollRef = useRef<ScrollView>(null);
  const tabPagerRef = useRef<ScrollView>(null);
  const adPagerRef = useRef<ScrollView>(null);
  const contentWidth = Math.max(width - H_PADDING * 2, 280);

  const loadAuctions = useCallback(async (silent = false) => {
    if (!silent) setIsFetching(true);
    try {
      const data = await auctionService.getAuctions({ sort: 'new', activeOnly: true });
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

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('homeTabDoublePress', () => {
      mainScrollRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadAuctions(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadAuctions]);

  const auctionsByTab = useMemo(() => {
    const sorted = sortAuctions(auctions, 'new');
    return homeTabs.reduce<Record<string, AuctionResponse[]>>((acc, tab) => {
      acc[tab.label] =
        tab.category === 'ALL'
          ? sorted
          : sorted.filter((auction) => auction.cardCategory === tab.category);
      return acc;
    }, {});
  }, [auctions]);

  const recentAuctions = useMemo(
    () => sortAuctions(auctions, 'new').slice(0, 8),
    [auctions],
  );

  const mostBidAuctions = useMemo(
    () => [...auctions].sort((a, b) => b.bidCount - a.bidCount).slice(0, 5),
    [auctions],
  );

  const mostWishedAuctions = useMemo(
    () =>
      [...auctions]
        .sort((a, b) => (b.wishlistCount ?? 0) - (a.wishlistCount ?? 0))
        .slice(0, 5),
    [auctions],
  );

  const hotAuctions = useMemo(
    () =>
      [...auctions]
        .sort((a, b) => {
          const aTimeScore = Math.max(
            0,
            24 - (new Date(a.endAt).getTime() - Date.now()) / 3600000,
          );
          const bTimeScore = Math.max(
            0,
            24 - (new Date(b.endAt).getTime() - Date.now()) / 3600000,
          );
          const aScore = a.bidCount * 3 + (a.wishlistCount ?? 0) * 2 + aTimeScore;
          const bScore = b.bidCount * 3 + (b.wishlistCount ?? 0) * 2 + bTimeScore;
          return bScore - aScore;
        })
        .slice(0, 6),
    [auctions],
  );

  const endingSoonAuctions = useMemo(
    () =>
      auctions
        .filter((auction) => {
          const remaining = new Date(auction.endAt).getTime() - Date.now();
          return remaining > 0 && remaining <= 24 * 60 * 60 * 1000;
        })
        .sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime())
        .slice(0, 6),
    [auctions],
  );

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
        ref={mainScrollRef}
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
              key={tab.category}
              style={styles.topTab}
              onPress={() => {
                setActiveHomeTab(idx);
                tabPagerRef.current?.scrollTo({ x: idx * contentWidth, animated: true });
              }}
            >
              <ThemedText style={[styles.topTabText, idx === activeHomeTab && styles.topTabTextActive]}>{tab.label}</ThemedText>
              {idx === activeHomeTab ? <View style={styles.topTabUnderline} /> : null}
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.signalBand}>
          <View>
            <ThemedText style={styles.signalLabel}>실시간 경매 현황</ThemedText>
            <ThemedText style={styles.signalValue}>{auctions.length}건 진행중</ThemedText>
          </View>
          <Pressable
            style={styles.signalRight}
            onPress={() =>
              router.push({
                pathname: '/buy',
                params: { sort: 'ending' },
              } as any)
            }
          >
            <Ionicons name="timer" size={16} color={palette.warning} />
            <ThemedText style={styles.signalText}>24시간 내 {endingSoonCount}건</ThemedText>
          </Pressable>
        </View>


        <View style={styles.sectionHeader}>
          <View>
            <ThemedText style={styles.sectionEyebrow}>HOT</ThemedText>
            <ThemedText style={styles.sectionTitle}>지금 핫한 카드</ThemedText>
          </View>
          <Pressable style={styles.sectionMoreButton} onPress={() => router.push('/buy')}>
            <ThemedText style={styles.linkText}>더보기</ThemedText>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hotRail}
        >
          {hotAuctions.map((auction, index) => {
            const category = getCategoryMeta(auction.cardCategory);
            return (
              <Pressable
                key={auction.id}
                style={styles.hotCard}
                onPress={() => router.push(`/auctions/${auction.id}`)}
              >
                <View style={styles.hotImageFrame}>
                  <Image source={{ uri: auction.imageUrl }} style={styles.hotImage} contentFit="cover" transition={160} />
                  <View style={styles.hotRankBadge}>
                    <ThemedText style={styles.hotRankText}>HOT {index + 1}</ThemedText>
                  </View>
                </View>
                <View style={styles.hotBody}>
                  <ThemedText style={[styles.hotCategory, { color: category.tint }]}>
                    {category.label}
                  </ThemedText>
                  <ThemedText style={styles.hotTitle} numberOfLines={2}>
                    {auction.cardName}
                  </ThemedText>
                  <View style={styles.hotSignals}>
                    <View style={styles.hotSignal}>
                      <Ionicons name="hammer-outline" size={12} color="#EF4444" />
                      <ThemedText style={styles.hotSignalText}>{auction.bidCount}</ThemedText>
                    </View>
                    <View style={styles.hotSignal}>
                      <Ionicons name="heart-outline" size={12} color="#EF4444" />
                      <ThemedText style={styles.hotSignalText}>{auction.wishlistCount ?? 0}</ThemedText>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <View>
            <ThemedText style={styles.sectionEyebrow}>NEW ARRIVALS</ThemedText>
            <ThemedText style={styles.sectionTitle}>전체 상품</ThemedText>
          </View>
          <Pressable style={styles.sectionMoreButton} onPress={() => router.push('/buy')}>
            <ThemedText style={styles.linkText}>더보기</ThemedText>
          </Pressable>
        </View>

        {recentAuctions.length === 0 ? (
          <View style={styles.emptyBlock}>
            <ThemedText style={styles.emptyTitle}>상품이 아직 없어요</ThemedText>
            <ThemedText style={styles.emptyText}>첫 경매를 등록해보세요.</ThemedText>
          </View>
        ) : (
          <View style={styles.grid}>
            {recentAuctions.map((auction) => {
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

        {endingSoonAuctions.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <ThemedText style={styles.sectionEyebrow}>ENDING SOON</ThemedText>
                <ThemedText style={styles.sectionTitle}>마감이 얼마 안 남았어요!</ThemedText>
              </View>
              <Pressable
                style={styles.sectionMoreButton}
                onPress={() =>
                  router.push({
                    pathname: '/buy',
                    params: { sort: 'ending' },
                  } as any)
                }
              >
                <ThemedText style={styles.linkText}>더보기</ThemedText>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.endingRail}
            >
              {endingSoonAuctions.map((auction) => {
                const category = getCategoryMeta(auction.cardCategory);
                return (
                  <Pressable
                    key={auction.id}
                    style={styles.endingCard}
                    onPress={() => router.push(`/auctions/${auction.id}`)}
                  >
                    <View style={styles.endingImageFrame}>
                      <Image source={{ uri: auction.imageUrl }} style={styles.endingImage} contentFit="cover" transition={160} />
                      <View style={styles.endingTimePill}>
                        <Ionicons name="timer" size={12} color="#FFFFFF" />
                        <ThemedText style={styles.endingTimeText}>
                          {formatRemainingTime(auction.endAt)}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.endingBody}>
                      <ThemedText style={[styles.endingCategory, { color: category.tint }]}>
                        {category.label}
                      </ThemedText>
                      <ThemedText style={styles.endingTitle} numberOfLines={2}>
                        {auction.cardName}
                      </ThemedText>
                      <ThemedText style={styles.endingPrice}>
                        {formatPrice(auction.currentPrice)}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}
        <ScrollView
          ref={tabPagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setActiveHomeTab(Math.round(e.nativeEvent.contentOffset.x / contentWidth))}
        >
          {homeTabs.map((tab) => {
            const data = (auctionsByTab[tab.label] ?? []).slice(0, 8);
            return (
              <View key={tab.category} style={{ width: contentWidth }}>
                <View style={styles.sectionHeader}>
                  <ThemedText style={styles.sectionTitle}>{tab.label} 상품</ThemedText>
                  <Pressable
                    style={styles.sectionMoreButton}
                    onPress={() =>
                      router.push({
                        pathname: '/buy',
                        params: tab.category === 'ALL' ? undefined : { category: tab.category },
                      } as any)
                    }
                  >
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
        <View style={styles.trendGrid}>
          <TrendPanel
            icon="flame"
            title="입찰 많은 순"
            subtitle="많은 사람들이 경매에 참여중이에요"
            auctions={mostBidAuctions}
            metric={(auction) => `${auction.bidCount}명 참여`}
          />
          <TrendPanel
            icon="heart"
            title="찜 많은 순"
            subtitle="컬렉터들이 많이 찜했어요"
            auctions={mostWishedAuctions}
            metric={(auction) => `${auction.wishlistCount ?? 0}찜`}
          />
        </View>


      </ScrollView>
    </SafeAreaView>
  );
}

function TrendPanel({
  auctions,
  icon,
  metric,
  subtitle,
  title,
}: {
  auctions: AuctionResponse[];
  icon: keyof typeof Ionicons.glyphMap;
  metric: (auction: AuctionResponse) => string;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.trendPanel}>
      <View style={styles.trendHeader}>
        <View style={styles.trendIcon}>
          <Ionicons name={icon} size={15} color="#FFFFFF" />
        </View>
        <View style={styles.trendCopy}>
          <ThemedText style={styles.trendTitle}>{title}</ThemedText>
          <ThemedText style={styles.trendSubtitle}>{subtitle}</ThemedText>
        </View>
      </View>

      <View style={styles.trendList}>
        {auctions.slice(0, 3).map((auction, index) => (
          <Pressable
            key={auction.id}
            style={styles.trendItem}
            onPress={() => router.push(`/auctions/${auction.id}`)}
          >
            <ThemedText style={styles.trendRank}>{index + 1}</ThemedText>
            <View style={styles.trendItemBody}>
              <ThemedText style={styles.trendItemTitle} numberOfLines={1}>
                {auction.cardName}
              </ThemedText>
              <ThemedText style={styles.trendItemMetric}>
                {metric(auction)}
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
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
  sectionEyebrow: { color: palette.brand, fontSize: 12, fontWeight: '900', marginBottom: 3 },
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
  trendGrid: { gap: 10, marginBottom: 14, marginTop: 14 },
  trendPanel: { backgroundColor: '#FFFFFF', borderColor: palette.line, borderRadius: 8, borderWidth: 1, padding: 13 },
  trendHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 10 },
  trendIcon: { alignItems: 'center', backgroundColor: '#111827', borderRadius: 8, height: 32, justifyContent: 'center', width: 32 },
  trendCopy: { flex: 1 },
  trendTitle: { color: '#111827', fontSize: 15, fontWeight: '900' },
  trendSubtitle: { color: '#667085', fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 2 },
  trendList: { gap: 6 },
  trendItem: { alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, flexDirection: 'row', gap: 9, minHeight: 44, paddingHorizontal: 9 },
  trendRank: { color: '#EF4444', fontSize: 14, fontWeight: '900', width: 18 },
  trendItemBody: { flex: 1, minWidth: 0 },
  trendItemTitle: { color: '#111827', fontSize: 13, fontWeight: '900' },
  trendItemMetric: { color: '#667085', fontSize: 11, fontWeight: '800', marginTop: 2 },
  hotRail: { gap: 10, paddingBottom: 14 },
  hotCard: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    width: 152,
  },
  hotImageFrame: { aspectRatio: 0.78, backgroundColor: '#E5E7EB', position: 'relative', width: '100%' },
  hotImage: { height: '100%', width: '100%' },
  hotRankBadge: {
    backgroundColor: '#111827',
    borderRadius: 6,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    position: 'absolute',
    top: 8,
  },
  hotRankText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  hotBody: { padding: 10 },
  hotCategory: { fontSize: 11, fontWeight: '900', marginBottom: 5 },
  hotTitle: { color: '#111827', fontSize: 14, fontWeight: '900', lineHeight: 19, minHeight: 38 },
  hotSignals: { flexDirection: 'row', gap: 6, marginTop: 9 },
  hotSignal: { alignItems: 'center', backgroundColor: '#FFF1F2', borderRadius: 999, flexDirection: 'row', gap: 3, paddingHorizontal: 7, paddingVertical: 5 },
  hotSignalText: { color: '#EF4444', fontSize: 11, fontWeight: '900' },
  endingRail: { gap: 10, paddingBottom: 14 },
  endingCard: {
    backgroundColor: '#111827',
    borderRadius: 8,
    overflow: 'hidden',
    width: 172,
  },
  endingImageFrame: { aspectRatio: 1.04, backgroundColor: '#1F2937', position: 'relative', width: '100%' },
  endingImage: { height: '100%', width: '100%' },
  endingTimePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.92)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    position: 'absolute',
    top: 8,
  },
  endingTimeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  endingBody: { padding: 11 },
  endingCategory: { fontSize: 11, fontWeight: '900', marginBottom: 5 },
  endingTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', lineHeight: 19, minHeight: 38 },
  endingPrice: { color: '#FEE500', fontSize: 16, fontWeight: '900', marginTop: 9 },
  emptyBlock: { alignItems: 'center', backgroundColor: palette.surface, borderColor: palette.line, borderRadius: 8, borderWidth: 1, padding: 24 },
  emptyTitle: { color: palette.ink, fontSize: 17, fontWeight: '900', marginBottom: 6 },
  emptyText: { color: palette.muted, fontSize: 13 },
});
