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
import sellerReviewService, {
  SellerReview,
  SellerReviewSummary,
} from '@/services/sellerReviewService';
import safetyService, { SafetyReportReason } from '@/services/safetyService';
import { useAuth } from '@/context/AuthContext';

const reportReasons: { label: string; value: SafetyReportReason }[] = [
  { label: '사기 의심', value: 'FRAUD' },
  { label: '미발송', value: 'NO_SHIPPING' },
  { label: '허위 사진', value: 'FAKE_PHOTO' },
  { label: '외부거래 유도', value: 'OFF_PLATFORM' },
  { label: '기타', value: 'OTHER' },
];

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
  const [reviewSummary, setReviewSummary] = useState<SellerReviewSummary>({
    sellerId: 0,
    averageRating: 0,
    reviewCount: 0,
  });
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowingBusy, setIsFollowingBusy] = useState(false);
  const [isSafetyBusy, setIsSafetyBusy] = useState(false);

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
      const [listingData, statsData, statusData, summaryData, reviewData] = await Promise.all([
        auctionService.getSellerListings(sellerId),
        followService.getUserStats(sellerId),
        isMe ? Promise.resolve(null) : followService.getStatus(sellerId),
        sellerReviewService.getSummary(sellerId),
        sellerReviewService.getReviews(sellerId),
      ]);
      setListings(listingData);
      setFollowStats(statsData);
      setFollowStatus(statusData);
      setReviewSummary(summaryData);
      setReviews(reviewData);
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

  const handleReportStore = () => {
    if (isMe || !sellerId) return;

    Alert.alert(
      '상점 신고하기',
      '신고 사유를 선택해주세요.',
      [
        ...reportReasons.map((reason) => ({
          text: reason.label,
          onPress: async () => {
            try {
              await safetyService.report({
                reportedUserId: sellerId,
                reason: reason.value,
              });
              Alert.alert('신고 완료', '확인 후 필요한 조치를 진행할게요.');
            } catch (error) {
              Alert.alert('신고 실패', error instanceof Error ? error.message : '신고하지 못했습니다.');
            }
          },
        })),
        { text: '취소', style: 'cancel' },
      ],
    );
  };

  const handleBlockSeller = () => {
    if (isMe || !sellerId) return;

    Alert.alert('판매자 차단', '차단하면 이 판매자와의 채팅과 입찰이 제한돼요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '차단',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsSafetyBusy(true);
            await safetyService.blockUser(sellerId);
            Alert.alert('차단 완료', '이 판매자와의 채팅과 입찰을 제한했어요.');
          } catch (error) {
            Alert.alert('차단 실패', error instanceof Error ? error.message : '차단하지 못했습니다.');
          } finally {
            setIsSafetyBusy(false);
          }
        },
      },
    ]);
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

          {!isMe ? (
            <View style={styles.safetyActions}>
              <Pressable style={styles.safetyAction} onPress={handleReportStore}>
                <Ionicons name="flag-outline" size={16} color="#CBD5E1" />
                <ThemedText style={styles.safetyActionText}>신고</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.safetyAction, isSafetyBusy && styles.disabled]}
                onPress={handleBlockSeller}
                disabled={isSafetyBusy}
              >
                <Ionicons name="ban-outline" size={16} color="#FCA5A5" />
                <ThemedText style={styles.safetyActionText}>차단</ThemedText>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <StatBox label="팔로워" value={followStats.followerCount} />
            <StatBox label="팔로잉" value={followStats.followingCount} />
            <StatBox label="상품" value={listings.length} />
          </View>

          <View style={styles.ratingBand}>
            <View>
              <ThemedText style={styles.ratingLabel}>상점 별점</ThemedText>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={17} color="#FEE500" />
                <ThemedText style={styles.ratingValue}>
                  {reviewSummary.reviewCount > 0
                    ? reviewSummary.averageRating.toFixed(1)
                    : '-'}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={styles.ratingCount}>
              후기 {reviewSummary.reviewCount}개
            </ThemedText>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <ThemedText style={styles.sectionTitle}>거래 후기</ThemedText>
            <ThemedText style={styles.sectionSubcopy}>낙찰자가 남긴 실제 거래 평가예요.</ThemedText>
          </View>
          <ThemedText style={styles.sectionMeta}>{reviews.length}개</ThemedText>
        </View>

        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={34} color="#98A2B3" />
            <ThemedText style={styles.emptyTitle}>아직 거래 후기가 없어요</ThemedText>
            <ThemedText style={styles.emptyText}>
              거래가 끝나고 낙찰자가 별점과 후기를 남길 수 있어요.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.reviewList}>
            {reviews.slice(0, 5).map((review) => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewStars}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Ionicons
                        key={index}
                        name={index < review.rating ? 'star' : 'star-outline'}
                        size={14}
                        color="#F59E0B"
                      />
                    ))}
                  </View>
                  <ThemedText style={styles.reviewAuthor} numberOfLines={1}>
                    {review.reviewerNickname}
                  </ThemedText>
                </View>
                <ThemedText style={styles.reviewAuction} numberOfLines={1}>
                  {review.auctionCardName}
                </ThemedText>
                {review.content ? (
                  <ThemedText style={styles.reviewContent}>{review.content}</ThemedText>
                ) : null}
              </View>
            ))}
          </View>
        )}

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
  safetyActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  safetyAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 40,
    justifyContent: 'center',
  },
  safetyActionText: { color: '#CBD5E1', fontSize: 13, fontWeight: '900' },
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
  ratingBand: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    padding: 12,
  },
  ratingLabel: { color: '#CBD5E1', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  ratingRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  ratingValue: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
  ratingCount: { color: '#CBD5E1', fontSize: 12, fontWeight: '900' },
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
  reviewList: { gap: 9 },
  reviewItem: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    padding: 13,
  },
  reviewTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewAuthor: { color: '#667085', fontSize: 12, fontWeight: '800', maxWidth: 120 },
  reviewAuction: { color: '#111827', fontSize: 13, fontWeight: '900', marginBottom: 6 },
  reviewContent: { color: '#4B5563', fontSize: 13, fontWeight: '700', lineHeight: 19 },
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
