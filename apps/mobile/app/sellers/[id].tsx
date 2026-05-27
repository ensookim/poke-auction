import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatPrice, formatRemainingTime } from '@/constants/auction';
import auctionService, { AuctionResponse } from '@/services/auctionService';
import followService, { FollowStats, FollowStatus } from '@/services/followService';
import { useAuth } from '@/context/AuthContext';

export default function SellerStoreScreen() {
  const params = useLocalSearchParams<{ id?: string; nickname?: string }>();
  const sellerId = Number(params.id);
  const fallbackNickname = typeof params.nickname === 'string' ? params.nickname : '판매자';
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topSafeOffset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );
  const [listings, setListings] = useState<AuctionResponse[]>([]);
  const [followStats, setFollowStats] = useState<FollowStats>({
    followerCount: 0,
    followingCount: 0,
  });
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowingBusy, setIsFollowingBusy] = useState(false);

  const sellerName = listings[0]?.creatorNickname || fallbackNickname;
  const activeListings = useMemo(
    () => listings.filter((item) => item.active).length,
    [listings],
  );
  const soldListings = Math.max(0, listings.length - activeListings);
  const isMe = user?.id === sellerId;

  const loadStore = useCallback(async () => {
    if (!sellerId) {
      return;
    }

    setLoading(true);
    try {
      const [listingData, statsData, statusData] = await Promise.all([
        auctionService.getSellerListings(sellerId),
        followService.getUserStats(sellerId),
        isMe ? Promise.resolve(null) : followService.getStatus(sellerId),
      ]);
      setListings(listingData);
      setFollowStats(statsData);
      setFollowStatus(statusData);
    } catch (error) {
      Alert.alert(
        '상점 오류',
        error instanceof Error ? error.message : '판매자 상점을 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, [isMe, sellerId]);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  const toggleFollow = async () => {
    if (isMe || isFollowingBusy) {
      return;
    }

    try {
      setIsFollowingBusy(true);
      const nextStatus = followStatus?.following
        ? await followService.unfollow(sellerId)
        : await followService.follow(sellerId);
      setFollowStatus(nextStatus);
      setFollowStats((prev) => ({
        ...prev,
        followerCount: Math.max(
          0,
          prev.followerCount + (nextStatus.following ? 1 : -1),
        ),
      }));
    } catch (error) {
      Alert.alert(
        '팔로우 오류',
        error instanceof Error ? error.message : '팔로우 상태를 바꾸지 못했습니다.',
      );
    } finally {
      setIsFollowingBusy(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: 28 + insets.bottom,
            paddingTop: topSafeOffset + 12,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroTopline}>
            <View style={styles.storeBadge}>
              <Ionicons name="storefront-outline" size={13} color="#111827" />
              <ThemedText style={styles.storeBadgeText}>
                {isMe ? 'MY STORE' : 'SELLER STORE'}
              </ThemedText>
            </View>
            <View style={styles.reliabilityBadge}>
              <Ionicons name="sparkles" size={13} color="#FEE500" />
              <ThemedText style={styles.reliabilityText}>LIVE</ThemedText>
            </View>
          </View>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>{sellerName.slice(0, 1)}</ThemedText>
            </View>
            <View style={styles.profileCopy}>
              <ThemedText style={styles.storeName}>{sellerName}</ThemedText>
              <ThemedText style={styles.storeMeta}>
                판매 중 {activeListings}개 · 거래 완료 {soldListings}개
              </ThemedText>
            </View>
          </View>

          <View style={styles.storeActions}>
            {isMe ? (
              <Pressable style={styles.primaryAction} onPress={() => router.push('/sell')}>
                <Ionicons name="add-circle" size={18} color="#111827" />
                <ThemedText style={styles.primaryActionText}>새 경매 열기</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.primaryAction,
                  followStatus?.following && styles.secondaryAction,
                  isFollowingBusy && styles.disabled,
                ]}
                onPress={toggleFollow}
                disabled={isFollowingBusy}
              >
                <Ionicons
                  name={followStatus?.following ? 'checkmark' : 'add'}
                  size={18}
                  color="#111827"
                />
                <ThemedText style={styles.primaryActionText}>
                  {followStatus?.following ? '팔로잉' : '팔로우'}
                </ThemedText>
              </Pressable>
            )}
          </View>

          <View style={styles.statsRow}>
            <StatBox label="팔로워" value={followStats.followerCount} />
            <StatBox label="팔로잉" value={followStats.followingCount} />
            <StatBox label="상품" value={listings.length} />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <ThemedText style={styles.sectionTitle}>판매 상품</ThemedText>
            <ThemedText style={styles.sectionSubcopy}>최근 올라온 경매를 확인해보세요.</ThemedText>
          </View>
          <ThemedText style={styles.sectionMeta}>{listings.length}개</ThemedText>
        </View>

        {listings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="albums-outline" size={34} color="#98A2B3" />
            <ThemedText style={styles.emptyTitle}>아직 판매 상품이 없어요</ThemedText>
            <ThemedText style={styles.emptyText}>
              이 판매자의 새 경매가 올라오면 다시 확인해보세요.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.grid}>
            {listings.map((auction) => (
              <Pressable
                key={auction.id}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                onPress={() => router.push(`/auctions/${auction.id}`)}
              >
                <View style={styles.imageWrap}>
                  <Image source={{ uri: auction.imageUrl }} style={styles.image} contentFit="cover" />
                  <View style={[styles.statusPill, !auction.active && styles.closedPill]}>
                    <ThemedText style={styles.statusText}>
                      {auction.active ? 'LIVE' : 'CLOSED'}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <ThemedText style={styles.cardTitle} numberOfLines={2}>
                    {auction.cardName}
                  </ThemedText>
                  <ThemedText style={styles.cardPrice}>
                    {formatPrice(auction.currentPrice)}
                  </ThemedText>
                  <View style={styles.cardMetaRow}>
                    <ThemedText style={styles.cardMeta} numberOfLines={1}>
                      입찰 {auction.bidCount}
                    </ThemedText>
                    <ThemedText style={styles.cardMeta} numberOfLines={1}>
                      {formatRemainingTime(auction.endAt)}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBox}>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F8FA' },
  scroller: { alignSelf: 'center', maxWidth: 520, width: '100%' },
  content: { paddingHorizontal: 18, paddingBottom: 18 },
  hero: {
    backgroundColor: '#111827',
    borderRadius: 8,
    overflow: 'visible',
    padding: 18,
  },
  heroTopline: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  storeBadge: {
    alignItems: 'center',
    backgroundColor: '#FEE500',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  storeBadgeText: { color: '#111827', fontSize: 11, fontWeight: '900' },
  reliabilityBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  reliabilityText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  heroGlow: {
    backgroundColor: 'rgba(254, 229, 0, 0.18)',
    borderRadius: 120,
    height: 220,
    position: 'absolute',
    right: -92,
    top: -110,
    width: 220,
  },
  profileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 74,
    paddingVertical: 4,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#FEE500',
    borderRadius: 8,
    height: 66,
    justifyContent: 'center',
    marginRight: 14,
    width: 66,
  },
  avatarText: {
    color: '#111827',
    fontSize: 27,
    fontWeight: '900',
    includeFontPadding: true,
    lineHeight: 36,
    textAlignVertical: 'center',
  },
  profileCopy: { flex: 1, justifyContent: 'center', minHeight: 66 },
  storeLabel: { color: '#FEE500', fontSize: 11, fontWeight: '900', marginBottom: 5 },
  storeName: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    includeFontPadding: true,
    lineHeight: 34,
  },
  storeMeta: { color: '#CBD5E1', fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 3 },
  storeActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#FEE500',
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    height: 46,
    justifyContent: 'center',
  },
  secondaryAction: { backgroundColor: '#FFFFFF' },
  primaryActionText: { color: '#111827', fontSize: 14, fontWeight: '900' },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 12,
  },
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  statLabel: { color: '#CBD5E1', fontSize: 11, fontWeight: '800', marginTop: 3, textAlign: 'center' },
  followButton: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 7,
    height: 48,
    justifyContent: 'center',
    marginTop: 14,
  },
  followingButton: { backgroundColor: '#FFFFFF' },
  followButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  followingButtonText: { color: '#111827' },
  disabled: { opacity: 0.55 },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 22,
  },
  sectionTitle: { color: '#111827', fontSize: 19, fontWeight: '900' },
  sectionSubcopy: { color: '#667085', fontSize: 12, fontWeight: '700', marginTop: 3 },
  sectionMeta: { color: '#667085', fontSize: 13, fontWeight: '800' },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    padding: 34,
  },
  emptyTitle: { color: '#111827', fontSize: 17, fontWeight: '900', marginBottom: 7, marginTop: 12 },
  emptyText: { color: '#667085', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    width: '48.5%',
  },
  imageWrap: { aspectRatio: 0.76, backgroundColor: '#EEF0F4', position: 'relative' },
  image: { height: '100%', width: '100%' },
  statusPill: {
    backgroundColor: '#EF4444',
    borderRadius: 6,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    position: 'absolute',
    top: 8,
  },
  closedPill: { backgroundColor: '#475467' },
  statusText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  cardBody: { padding: 10 },
  cardTitle: { color: '#111827', fontSize: 14, fontWeight: '900', lineHeight: 19, minHeight: 38 },
  cardPrice: { color: '#EF4444', fontSize: 16, fontWeight: '900', marginTop: 7 },
  cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  cardMeta: { color: '#667085', fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.72 },
});
