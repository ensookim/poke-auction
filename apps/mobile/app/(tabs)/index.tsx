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
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AuctionCategoryKey,
  formatPrice,
  formatRemainingTime,
  getCategoryMeta,
  sortAuctions,
} from '@/constants/auction';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import { palette } from '@/constants/ui';
import auctionService, { AuctionResponse } from '@/services/auctionService';
import { BACKEND_URL } from '@/services/apiConfig';
import { getFriendlyErrorMessage } from '@/services/errorUtils';

const H_PADDING = 16;

const homeTabs: { label: string; category: AuctionCategoryKey }[] = [
  { label: '전체', category: 'ALL' },
  { label: '포켓몬', category: 'POKEMON' },
  { label: '유희왕', category: 'YUGIOH' },
  { label: '원피스', category: 'ONE_PIECE' },
  { label: '매직', category: 'ETC' },
];

const adBanners = [
  { id: 'ad-1', title: '안전결제 오픈', subtitle: '결제부터 구매확정까지 안전하게', bg: '#F3EDE5' },
  { id: 'ad-2', title: '마감 임박', subtitle: '오늘 끝나는 경매를 먼저 확인하세요', bg: '#E8EEF8' },
  { id: 'ad-3', title: '첫 거래 지원', subtitle: '배송지와 알림을 미리 설정해두세요', bg: '#E8F7F1' },
  { id: 'ad-4', title: '인기 카드 모음', subtitle: '찜과 입찰이 몰리는 상품', bg: '#F5EBF7' },
  { id: 'ad-5', title: '주말 경매', subtitle: '즉시구매 상품도 함께 둘러보기', bg: '#EDEDF0' },
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
        `${getFriendlyErrorMessage(error, '경매 목록을 불러오지 못했어요.')}\n\n요청 주소: ${BACKEND_URL}/api/auctions`,
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

    return () => subscription.remove();
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadAuctions(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadAuctions]);

  const selectedTab = homeTabs[activeHomeTab];
  const filteredAuctions = useMemo(() => {
    const sorted = sortAuctions(auctions, 'new');
    if (selectedTab.category === 'ALL') return sorted;
    return sorted.filter((auction) => auction.cardCategory === selectedTab.category);
  }, [auctions, selectedTab.category]);

  const hotAuctions = useMemo(
    () =>
      [...auctions]
        .sort((a, b) => {
          const aTimeScore = getEndingSoonScore(a.endAt);
          const bTimeScore = getEndingSoonScore(b.endAt);
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
    () =>
      auctions.filter((auction) => {
        const remaining = new Date(auction.endAt).getTime() - Date.now();
        return remaining > 0 && remaining <= 24 * 60 * 60 * 1000;
      }).length,
    [auctions],
  );

  const mostWishedAuctions = useMemo(
    () => [...auctions].sort((a, b) => (b.wishlistCount ?? 0) - (a.wishlistCount ?? 0)).slice(0, 6),
    [auctions],
  );

  const mostBidAuctions = useMemo(
    () => [...auctions].sort((a, b) => b.bidCount - a.bidCount).slice(0, 6),
    [auctions],
  );

  const allProducts = useMemo(() => filteredAuctions.slice(0, 8), [filteredAuctions]);

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
            <Pressable style={styles.iconButton} onPress={() => router.push('/cart')}>
              <Ionicons name="cart-outline" size={22} color={palette.ink} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          ref={adPagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => setActiveAd(Math.round(event.nativeEvent.contentOffset.x / contentWidth))}
        >
          {adBanners.map((banner) => (
            <Pressable
              key={banner.id}
              style={[styles.adCard, { width: contentWidth, backgroundColor: banner.bg }]}
            >
              <View style={styles.adCopy}>
                <ThemedText style={styles.adTitle}>{banner.title}</ThemedText>
                <ThemedText style={styles.adSubtitle}>{banner.subtitle}</ThemedText>
              </View>
              <ThemedText style={styles.adCount}>
                {activeAd + 1}/{adBanners.length}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.adDots}>
          {adBanners.map((banner, index) => (
            <View key={banner.id} style={[styles.dot, index === activeAd && styles.dotActive]} />
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
          {homeTabs.map((tab, index) => (
            <Pressable key={tab.category} style={styles.topTab} onPress={() => setActiveHomeTab(index)}>
              <ThemedText style={[styles.topTabText, index === activeHomeTab && styles.topTabTextActive]}>
                {tab.label}
              </ThemedText>
              {index === activeHomeTab ? <View style={styles.topTabUnderline} /> : null}
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

        <AuctionRail
          eyebrow="HOT"
          title="지금 핫한 카드"
          auctions={hotAuctions}
          badge={(index) => `HOT ${index + 1}`}
          metricIcon="flame"
          metric={(auction) => `${auction.bidCount}입찰 · ${auction.wishlistCount ?? 0}찜`}
        />

        <AuctionRail
          eyebrow="ENDING SOON"
          title="마감 임박"
          auctions={endingSoonAuctions}
          badge={() => '마감임박'}
          metricIcon="timer"
          metric={(auction) => formatRemainingTime(auction.endAt)}
          moreParams={{ sort: 'ending' }}
        />

        <AuctionRail
          eyebrow="WISHLIST"
          title="찜 많은 순"
          auctions={mostWishedAuctions}
          badge={(index) => `찜 ${index + 1}`}
          metricIcon="heart"
          metric={(auction) => `${auction.wishlistCount ?? 0}찜`}
        />

        <AuctionRail
          eyebrow="BIDS"
          title="입찰 많은 순"
          auctions={mostBidAuctions}
          badge={(index) => `입찰 ${index + 1}`}
          metricIcon="hammer"
          metric={(auction) => `${auction.bidCount}입찰`}
        />

        <SectionHeader
          eyebrow="ALL PRODUCTS"
          title={selectedTab.category === 'ALL' ? '전체 상품' : `${selectedTab.label} 상품`}
          onPress={() =>
            router.push({
              pathname: '/buy',
              params: selectedTab.category === 'ALL' ? undefined : { category: selectedTab.category },
            } as any)
          }
        />

        {allProducts.length === 0 ? (
          <EmptyBlock title="상품이 아직 없어요" text="다른 카테고리를 확인해보세요." />
        ) : (
          <View style={styles.grid}>
            {allProducts.map((auction) => (
              <GridAuctionCard key={auction.id} auction={auction} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getEndingSoonScore(endAt: string) {
  const hoursLeft = (new Date(endAt).getTime() - Date.now()) / 3600000;
  return Math.max(0, 24 - hoursLeft);
}

function SectionHeader({
  eyebrow,
  onPress,
  title,
}: {
  eyebrow: string;
  onPress?: () => void;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <ThemedText style={styles.sectionEyebrow}>{eyebrow}</ThemedText>
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      </View>
      {onPress ? (
        <Pressable style={styles.sectionMoreButton} onPress={onPress}>
          <ThemedText style={styles.linkText}>더보기</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

function AuctionRail({
  auctions,
  badge,
  eyebrow,
  metric,
  metricIcon,
  moreParams,
  title,
}: {
  auctions: AuctionResponse[];
  badge: (index: number, auction: AuctionResponse) => string;
  eyebrow: string;
  metric: (auction: AuctionResponse) => string;
  metricIcon: keyof typeof Ionicons.glyphMap;
  moreParams?: Record<string, string>;
  title: string;
}) {
  return (
    <>
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        onPress={() =>
          router.push({
            pathname: '/buy',
            params: moreParams,
          } as any)
        }
      />
      {auctions.length === 0 ? (
        <EmptyBlock title="보여줄 경매가 없어요" text="새 경매가 등록되면 여기에 표시됩니다." />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRail}>
          {auctions.map((auction, index) => (
            <RailAuctionCard
              key={auction.id}
              auction={auction}
              badge={badge(index, auction)}
              metric={metric(auction)}
              metricIcon={metricIcon}
            />
          ))}
        </ScrollView>
      )}
    </>
  );
}

function RailAuctionCard({
  auction,
  badge,
  metric,
  metricIcon,
}: {
  auction: AuctionResponse;
  badge: string;
  metric: string;
  metricIcon: keyof typeof Ionicons.glyphMap;
}) {
  const category = getCategoryMeta(auction.cardCategory);

  return (
    <Pressable style={styles.railCard} onPress={() => router.push(`/auctions/${auction.id}`)}>
      <View style={styles.railImageFrame}>
        <Image source={{ uri: auction.imageUrl }} style={styles.railImage} contentFit="cover" transition={160} />
        <View style={styles.railBadge}>
          <ThemedText style={styles.railBadgeText}>{badge}</ThemedText>
        </View>
      </View>
      <View style={styles.railBody}>
        <ThemedText style={[styles.railCategory, { color: category.tint }]}>{category.label}</ThemedText>
        <ThemedText style={styles.railTitle} numberOfLines={2}>
          {auction.cardName}
        </ThemedText>
        <ThemedText style={styles.railPrice}>{formatPrice(auction.currentPrice)}</ThemedText>
        <View style={styles.railMetric}>
          <Ionicons name={metricIcon} size={12} color="#EF4444" />
          <ThemedText style={styles.railMetricText}>{metric}</ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

function GridAuctionCard({ auction }: { auction: AuctionResponse }) {
  const category = getCategoryMeta(auction.cardCategory);

  return (
    <Pressable style={styles.gridCard} onPress={() => router.push(`/auctions/${auction.id}`)}>
      <View style={styles.gridImageFrame}>
        <Image source={{ uri: auction.imageUrl }} style={styles.gridImage} contentFit="cover" transition={160} />
      </View>
      <View style={styles.gridBody}>
        <View style={styles.gridMetaRow}>
          <ThemedText style={[styles.gridCategory, { color: category.tint }]}>{category.label}</ThemedText>
          <ThemedText style={styles.gridTime}>{formatRemainingTime(auction.endAt)}</ThemedText>
        </View>
        <ThemedText style={styles.gridTitle} numberOfLines={2}>
          {auction.cardName}
        </ThemedText>
        <View style={styles.gridFooter}>
          <ThemedText style={styles.gridPrice}>{formatPrice(auction.currentPrice)}</ThemedText>
          <ThemedText style={styles.gridBid}>{auction.bidCount}입찰</ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyBlock({ text, title }: { text: string; title: string }) {
  return (
    <View style={styles.emptyBlock}>
      <ThemedText style={styles.emptyTitle}>{title}</ThemedText>
      <ThemedText style={styles.emptyText}>{text}</ThemedText>
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
  adTitle: { color: '#6B7280', fontSize: 14, fontWeight: '800', lineHeight: 20 },
  adSubtitle: { color: '#374151', fontSize: 27, fontWeight: '900', lineHeight: 35 },
  adCount: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(17,24,39,0.25)',
    borderRadius: 999,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  adDots: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center', marginVertical: 12 },
  dot: { backgroundColor: '#D4D4D8', borderRadius: 999, height: 6, width: 6 },
  dotActive: { backgroundColor: '#111827', width: 16 },
  categoryRail: { gap: 14, paddingBottom: 10 },
  topTab: { paddingBottom: 8, paddingTop: 2 },
  topTabText: { color: '#6B7280', fontSize: 17, fontWeight: '800' },
  topTabTextActive: { color: '#111827', fontWeight: '900' },
  topTabUnderline: { backgroundColor: '#111827', borderRadius: 999, height: 4, marginTop: 8, width: '100%' },
  signalBand: {
    alignItems: 'center',
    backgroundColor: '#F3EDE5',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    padding: 15,
  },
  signalLabel: { color: '#9CA3AF', fontSize: 12, fontWeight: '800', lineHeight: 17, marginBottom: 3 },
  signalValue: { color: '#374151', fontSize: 21, fontWeight: '900', lineHeight: 27 },
  signalRight: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  signalText: { color: '#1F2937', fontSize: 12, fontWeight: '900' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 10, marginTop: 8, width: '100%' },
  sectionEyebrow: { color: palette.brand, fontSize: 12, fontWeight: '900', lineHeight: 16, marginBottom: 3 },
  sectionTitle: { color: '#111827', fontSize: 18, fontWeight: '900', lineHeight: 24 },
  sectionMoreButton: { alignSelf: 'flex-end', marginLeft: 'auto', paddingLeft: 12 },
  linkText: { color: palette.brand, fontSize: 13, fontWeight: '900' },
  cardRail: { gap: 10, paddingBottom: 14 },
  railCard: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    width: 162,
  },
  railImageFrame: { aspectRatio: 0.78, backgroundColor: '#E5E7EB', position: 'relative', width: '100%' },
  railImage: { height: '100%', width: '100%' },
  railBadge: {
    backgroundColor: '#111827',
    borderRadius: 6,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    position: 'absolute',
    top: 8,
  },
  railBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  railBody: { padding: 10 },
  railCategory: { fontSize: 11, fontWeight: '900', marginBottom: 5 },
  railTitle: { color: '#111827', fontSize: 14, fontWeight: '900', lineHeight: 19, minHeight: 38 },
  railPrice: { color: palette.ink, fontSize: 16, fontWeight: '900', lineHeight: 22, marginTop: 8 },
  railMetric: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1F2',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  railMetricText: { color: '#EF4444', fontSize: 11, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    width: '48.5%',
  },
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
  emptyBlock: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 24,
  },
  emptyTitle: { color: palette.ink, fontSize: 17, fontWeight: '900', lineHeight: 23, marginBottom: 6 },
  emptyText: { color: palette.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
