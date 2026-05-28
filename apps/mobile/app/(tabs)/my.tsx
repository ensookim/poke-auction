import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Redirect,
  router,
  useFocusEffect,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatPrice, formatRemainingTime, getCategoryMeta } from '@/constants/auction';
import { palette, shadow } from '@/constants/ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import auctionService, { AuctionResponse } from '@/services/auctionService';
import { isAuthSessionExpiredError } from '@/services/apiClient';
import { getFriendlyErrorMessage } from '@/services/errorUtils';
import commerceService, { CollectionItemResponse } from '@/services/commerceService';
import followService, { FollowStats } from '@/services/followService';

type MyTab = 'listings' | 'bids' | 'won' | 'wishlist' | 'profile';

const tabDefs: { key: MyTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'listings', label: '판매중', icon: 'pricetag-outline' },
  { key: 'bids', label: '입찰', icon: 'hammer-outline' },
  { key: 'won', label: '낙찰', icon: 'trophy-outline' },
  { key: 'wishlist', label: '관심', icon: 'heart-outline' },
  { key: 'profile', label: '내정보', icon: 'person-outline' },
];

export default function MyScreen() {
  const { isLoading, isSignedIn, user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<MyTab>('listings');
  const [bids, setBids] = useState<AuctionResponse[]>([]);
  const [listings, setListings] = useState<AuctionResponse[]>([]);
  const [wishlist, setWishlist] = useState<CollectionItemResponse[]>([]);
  const [followStats, setFollowStats] = useState<FollowStats>({
    followerCount: 0,
    followingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMyPage = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [bidData, listingData, wishlistData, followData] = await Promise.all([
        auctionService.getAuctionsByBidder(),
        auctionService.getMyListings(),
        commerceService.getWishlist(),
        followService.getStats(),
      ]);
      setBids(bidData);
      setListings(listingData);
      setWishlist(wishlistData);
      setFollowStats(followData);
    } catch (error) {
      if (isAuthSessionExpiredError(error)) {
        await logout();
        Alert.alert('로그인 만료', '다시 로그인해 주세요.');
        router.replace('/login');
        return;
      }
      Alert.alert('MY 조회 오류', getFriendlyErrorMessage(error, '데이터를 불러오지 못했습니다.'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (isSignedIn) loadMyPage();
  }, [isSignedIn, loadMyPage]);

  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) loadMyPage(true);
    }, [isSignedIn, loadMyPage]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadMyPage(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadMyPage]);

  const stats = useMemo(
    () => ({
      activeBids: bids.filter((auction) => auction.active).length,
      won: bids.filter((auction) => auction.winnerId === user?.id).length,
      activeListings: listings.filter((auction) => auction.active).length,
    }),
    [bids, listings, user?.id],
  );

  const handleDeleteListing = async (auctionId: number) => {
    try {
      await auctionService.deleteAuction(auctionId);
      setListings((prev) => prev.filter((item) => item.id !== auctionId));
      await loadMyPage(true);
    } catch (error) {
      Alert.alert('삭제 실패', error instanceof Error ? error.message : '상품을 삭제하지 못했습니다.');
    }
  };

  if (isLoading || loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.brand} />
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
          <View>
            <ThemedText style={styles.eyebrow}>MY</ThemedText>
            <ThemedText type="title" style={styles.title}>내 정보</ThemedText>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>{(user?.nickname ?? 'U').slice(0, 1)}</ThemedText>
          </View>
          <View style={styles.profileCopy}>
            <ThemedText style={styles.nickname}>{user?.nickname}</ThemedText>
            <ThemedText style={styles.profileMeta}>안전 거래 이용중</ThemedText>
            <View style={styles.followInlineRow}>
              <Pressable style={styles.followInlineItem} onPress={() => router.push('/following')}>
                <ThemedText style={styles.followInlineText}>팔로잉 {followStats.followingCount}</ThemedText>
              </Pressable>
              <Pressable style={styles.followInlineItem} onPress={() => router.push('/following')}>
                <ThemedText style={styles.followInlineText}>팔로워 {followStats.followerCount}</ThemedText>
              </Pressable>
            </View>
          </View>
          <View style={styles.profileActions}>
            <Pressable
              style={styles.storeQuick}
              onPress={() => {
                if (!user?.id) return;
                router.push({
                  pathname: '/sellers/[id]',
                  params: {
                    id: String(user.id),
                    nickname: user.nickname ?? '내 상점',
                  },
                } as any);
              }}
            >
              <Ionicons name="storefront-outline" size={16} color="#111827" />
            </Pressable>
            <Pressable style={styles.logoutQuick} onPress={logout}>
              <Ionicons name="log-out-outline" size={16} color="#9F1239" />
            </Pressable>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <Pressable style={styles.kpiCard} onPress={() => setActiveTab('bids')}>
            <ThemedText style={styles.kpiValue}>{stats.activeBids}</ThemedText>
            <ThemedText style={styles.kpiLabel}>입찰</ThemedText>
          </Pressable>
          <Pressable style={styles.kpiCard} onPress={() => setActiveTab('listings')}>
            <ThemedText style={styles.kpiValue}>{stats.activeListings}</ThemedText>
            <ThemedText style={styles.kpiLabel}>판매중</ThemedText>
          </Pressable>
          <Pressable style={styles.kpiCard} onPress={() => setActiveTab('won')}>
            <ThemedText style={styles.kpiValue}>{stats.won}</ThemedText>
            <ThemedText style={styles.kpiLabel}>낙찰</ThemedText>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRail}>
          {tabDefs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable key={tab.key} style={[styles.tabChip, active && styles.tabChipActive]} onPress={() => setActiveTab(tab.key)}>
                <Ionicons name={tab.icon} size={14} color={active ? '#FFFFFF' : '#4B5563'} />
                <ThemedText style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {activeTab === 'bids' && <AuctionList auctions={bids} emptyTitle="입찰 내역이 없어요" emptyAction="경매 보러가기" onEmptyPress={() => router.push('/buy')} />}
        {activeTab === 'won' && <AuctionList auctions={bids.filter((auction) => auction.winnerId === user?.id)} emptyTitle="낙찰 내역이 없어요" emptyAction="경매 보러가기" onEmptyPress={() => router.push('/buy')} />}
        {activeTab === 'listings' && <AuctionList auctions={listings} emptyTitle="판매글이 없어요" emptyAction="경매 등록하기" onEmptyPress={() => router.push('/sell')} onDelete={handleDeleteListing} />}
        {activeTab === 'wishlist' && <AuctionList auctions={wishlist.map((item) => item.auction)} emptyTitle="관심 상품이 없어요" emptyAction="상품 보러가기" onEmptyPress={() => router.push('/buy')} />}

        {activeTab === 'profile' && (
          <View style={styles.profilePanel}>
            <InfoRow icon="person" label="닉네임" value={user?.nickname ?? '-'} />
            <InfoRow icon="card" label="회원번호" value={`#${user?.id ?? '-'}`} />
            <InfoRow icon="chatbubble-ellipses-outline" label="거래 문의" value="판매자 1:1 메시지" />
            <Pressable style={styles.settingLink} onPress={() => router.push('/settings' as any)}>
              <View style={styles.settingIcon}>
                <Ionicons name="settings-outline" size={17} color={palette.muted} />
              </View>
              <View style={styles.settingCopy}>
                <ThemedText style={styles.settingTitle}>설정</ThemedText>
                <ThemedText style={styles.settingText}>
                  알림 종류와 앱 표시 방식을 관리해요
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={17} color={palette.muted} />
            </Pressable>
            <Pressable style={styles.noticeButton} onPress={() => router.push('/legal-notice')}>
              <Ionicons name="shield-checkmark-outline" size={18} color={palette.ink} />
              <View style={styles.noticeButtonCopy}>
                <ThemedText style={styles.noticeButtonTitle}>안전거래 및 중개자 고지</ThemedText>
                <ThemedText style={styles.noticeButtonText}>거래 전 책임 범위와 신고 기준 확인</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={17} color={palette.muted} />
            </Pressable>
            <Pressable style={styles.logoutButton} onPress={logout}>
              <Ionicons name="log-out-outline" size={18} color={palette.brandDark} />
              <ThemedText style={styles.logoutText}>로그아웃</ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AuctionList({
  auctions,
  emptyTitle,
  emptyAction,
  onEmptyPress,
  onDelete,
}: {
  auctions: AuctionResponse[];
  emptyTitle: string;
  emptyAction: string;
  onEmptyPress: () => void;
  onDelete?: (auctionId: number) => void;
}) {
  if (auctions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="albums" size={24} color={palette.subtle} />
        <ThemedText style={styles.emptyTitle}>{emptyTitle}</ThemedText>
        <Pressable style={styles.emptyButton} onPress={onEmptyPress}>
          <ThemedText style={styles.emptyButtonText}>{emptyAction}</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {auctions.map((auction) => {
        const category = getCategoryMeta(auction.cardCategory);
        return (
          <Pressable key={auction.id} style={styles.item} onPress={() => router.push(`/auctions/${auction.id}`)}>
            <View style={styles.imageFrame}>
              <Image source={{ uri: auction.imageUrl }} style={styles.image} contentFit="cover" />
            </View>
            <View style={styles.itemBody}>
              <View style={styles.itemTop}>
                <ThemedText style={[styles.category, { color: category.tint }]}>{category.label}</ThemedText>
                <ThemedText style={styles.status}>{auction.active ? '진행중' : '종료'}</ThemedText>
              </View>
              <ThemedText style={styles.itemTitle} numberOfLines={1}>{auction.cardName}</ThemedText>
              <ThemedText style={styles.itemMeta}>{formatRemainingTime(auction.endAt)} · 입찰 {auction.bidCount}회</ThemedText>
              <ThemedText style={styles.itemPrice}>{formatPrice(auction.currentPrice)}</ThemedText>
              {onDelete ? (
                <Pressable style={styles.deleteButton} onPress={() => onDelete(auction.id)}>
                  <Ionicons name="trash-outline" size={14} color={palette.brandDark} />
                  <ThemedText style={styles.deleteButtonText}>삭제</ThemedText>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={17} color={palette.muted} />
      </View>
      <ThemedText style={styles.infoLabel}>{label}</ThemedText>
      <ThemedText style={styles.infoValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.canvas },
  scroller: { alignSelf: 'center', maxWidth: 520, width: '100%' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36 },
  header: { marginBottom: 12 },
  eyebrow: { color: palette.brand, fontSize: 12, fontWeight: '900', marginBottom: 4 },
  title: { color: palette.ink, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  profileCard: { alignItems: 'center', backgroundColor: palette.night, borderRadius: 8, flexDirection: 'row', marginBottom: 10, padding: 14, ...shadow },
  avatar: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, height: 48, justifyContent: 'center', marginRight: 12, width: 48 },
  avatarText: { color: palette.ink, fontSize: 20, fontWeight: '900' },
  profileCopy: { flex: 1 },
  nickname: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginBottom: 3 },
  profileMeta: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
  followInlineRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  followInlineItem: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  followInlineText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  profileActions: { gap: 8 },
  storeQuick: { alignItems: 'center', backgroundColor: '#FEE500', borderRadius: 8, height: 32, justifyContent: 'center', width: 32 },
  logoutQuick: { alignItems: 'center', backgroundColor: '#FFF1F2', borderRadius: 8, height: 32, justifyContent: 'center', width: 32 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  kpiCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: palette.line, borderRadius: 8, borderWidth: 1, flex: 1, minHeight: 86, justifyContent: 'center', paddingVertical: 10 },
  kpiValue: { color: palette.ink, fontSize: 26, fontWeight: '900', lineHeight: 30 },
  kpiLabel: { color: '#4B5563', fontSize: 13, fontWeight: '800', marginTop: 4 },
  tabRail: { gap: 8, marginBottom: 12, paddingRight: 8 },
  tabChip: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: palette.line, borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 6, minHeight: 40, paddingHorizontal: 12 },
  tabChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  tabText: { color: '#4B5563', fontSize: 12, fontWeight: '900' },
  tabTextActive: { color: '#FFFFFF' },
  list: { gap: 10 },
  item: { backgroundColor: '#FFFFFF', borderColor: palette.line, borderRadius: 8, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  imageFrame: { backgroundColor: '#F3F4F6', aspectRatio: 0.72, overflow: 'hidden', position: 'relative', width: 104 },
  image: { height: '100%', position: 'absolute', width: '100%' },
  itemBody: { flex: 1, padding: 12 },
  itemTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  category: { fontSize: 12, fontWeight: '900' },
  status: { color: palette.muted, fontSize: 12, fontWeight: '800' },
  itemTitle: { color: palette.ink, fontSize: 16, fontWeight: '900', marginBottom: 5 },
  itemMeta: { color: palette.muted, fontSize: 12, marginBottom: 8 },
  itemPrice: { color: palette.ink, fontSize: 17, fontWeight: '900' },
  deleteButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#FFF1F2', borderRadius: 8, flexDirection: 'row', gap: 5, marginTop: 8, paddingHorizontal: 10, paddingVertical: 7 },
  deleteButtonText: { color: palette.brandDark, fontSize: 12, fontWeight: '900' },
  emptyState: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: palette.line, borderRadius: 8, borderWidth: 1, gap: 10, padding: 24 },
  emptyTitle: { color: palette.ink, fontSize: 16, fontWeight: '900' },
  emptyButton: { backgroundColor: palette.ink, borderRadius: 8, paddingHorizontal: 15, paddingVertical: 10 },
  emptyButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  profilePanel: { backgroundColor: '#FFFFFF', borderColor: palette.line, borderRadius: 8, borderWidth: 1, padding: 12 },
  infoRow: { alignItems: 'center', borderBottomColor: '#F3F4F6', borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 12 },
  infoIcon: { alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 7, height: 30, justifyContent: 'center', marginRight: 10, width: 30 },
  infoLabel: { color: palette.muted, flex: 1, fontSize: 13, fontWeight: '800' },
  infoValue: { color: palette.ink, fontSize: 13, fontWeight: '900' },
  settingLink: { alignItems: 'center', borderBottomColor: '#F3F4F6', borderBottomWidth: 1, flexDirection: 'row', gap: 10, paddingVertical: 12 },
  settingIcon: { alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 7, height: 30, justifyContent: 'center', width: 30 },
  settingCopy: { flex: 1 },
  settingTitle: { color: palette.ink, fontSize: 13, fontWeight: '900' },
  settingText: { color: palette.muted, fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 2 },
  noticeButton: { alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, flexDirection: 'row', gap: 10, marginTop: 12, padding: 12 },
  noticeButtonCopy: { flex: 1 },
  noticeButtonTitle: { color: palette.ink, fontSize: 13, fontWeight: '900' },
  noticeButtonText: { color: palette.muted, fontSize: 12, fontWeight: '700', marginTop: 3 },
  logoutButton: { alignItems: 'center', backgroundColor: '#FFF1F2', borderRadius: 8, flexDirection: 'row', gap: 7, justifyContent: 'center', marginTop: 12, paddingVertical: 12 },
  logoutText: { color: palette.brandDark, fontSize: 14, fontWeight: '900' },
});
