import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  formatPrice,
  formatRemainingTime,
  getCategoryMeta,
} from '@/constants/auction';
import { palette, shadow } from '@/constants/ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import auctionService, { AuctionResponse } from '@/services/auctionService';

type MyTab = 'bids' | 'listings' | 'profile';

const tabs: { key: MyTab; label: string }[] = [
  { key: 'bids', label: '입찰' },
  { key: 'listings', label: '판매글' },
  { key: 'profile', label: '내 정보' },
];

export default function MyScreen() {
  const { isLoading, isSignedIn, user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<MyTab>('bids');
  const [bids, setBids] = useState<AuctionResponse[]>([]);
  const [listings, setListings] = useState<AuctionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMyPage = useCallback(async () => {
    setLoading(true);
    try {
      const [bidData, listingData] = await Promise.all([
        auctionService.getAuctionsByBidder(),
        auctionService.getMyListings(),
      ]);
      setBids(bidData);
      setListings(listingData);
    } catch (error) {
      Alert.alert(
        'MY 조회 오류',
        error instanceof Error ? error.message : '내 활동을 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      loadMyPage();
    }
  }, [isSignedIn, loadMyPage]);

  const stats = useMemo(
    () => ({
      activeBids: bids.filter((auction) => auction.active).length,
      won: bids.filter((auction) => auction.winnerId === user?.id).length,
      activeListings: listings.filter((auction) => auction.active).length,
    }),
    [bids, listings, user?.id],
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (isLoading || loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.brand} />
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
          <View>
            <ThemedText style={styles.eyebrow}>MY</ThemedText>
            <ThemedText type="title" style={styles.title}>
              내 활동
            </ThemedText>
          </View>
          <Pressable style={styles.refreshButton} onPress={loadMyPage}>
            <Ionicons name="refresh" size={19} color={palette.ink} />
          </Pressable>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>
              {(user?.nickname ?? 'U').slice(0, 1)}
            </ThemedText>
          </View>
          <View style={styles.profileCopy}>
            <ThemedText style={styles.nickname}>{user?.nickname}</ThemedText>
            <ThemedText style={styles.profileMeta}>카카오 로그인 · 안전거래 이용중</ThemedText>
          </View>
          <View style={styles.safeBadge}>
            <Ionicons name="shield-checkmark" size={15} color={palette.success} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <ThemedText style={styles.statValue}>{stats.activeBids}</ThemedText>
            <ThemedText style={styles.statLabel}>진행 입찰</ThemedText>
          </View>
          <View style={styles.statBox}>
            <ThemedText style={styles.statValue}>{stats.activeListings}</ThemedText>
            <ThemedText style={styles.statLabel}>판매중</ThemedText>
          </View>
          <View style={styles.statBox}>
            <ThemedText style={styles.statValue}>{stats.won}</ThemedText>
            <ThemedText style={styles.statLabel}>낙찰</ThemedText>
          </View>
        </View>

        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tabChip, activeTab === tab.key && styles.tabChipActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <ThemedText
                style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
              >
                {tab.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {activeTab === 'bids' ? (
          <AuctionList
            auctions={bids}
            emptyTitle="아직 입찰한 경매가 없어요"
            emptyAction="경매 탐색하기"
            onEmptyPress={() => router.push('/buy')}
          />
        ) : null}

        {activeTab === 'listings' ? (
          <AuctionList
            auctions={listings}
            emptyTitle="등록한 판매글이 없어요"
            emptyAction="경매 등록하기"
            onEmptyPress={() => router.push('/sell')}
          />
        ) : null}

        {activeTab === 'profile' ? (
          <View style={styles.profilePanel}>
            <InfoRow icon="person" label="닉네임" value={user?.nickname ?? '-'} />
            <InfoRow icon="card" label="회원번호" value={`#${user?.id ?? '-'}`} />
            <InfoRow icon="chatbubbles" label="거래 문의" value="1:1 채팅 사용" />
            <InfoRow icon="notifications" label="경매 알림" value="마감 임박 알림 준비중" />
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color={palette.brandDark} />
              <ThemedText style={styles.logoutText}>로그아웃</ThemedText>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

function AuctionList({
  auctions,
  emptyTitle,
  emptyAction,
  onEmptyPress,
}: {
  auctions: AuctionResponse[];
  emptyTitle: string;
  emptyAction: string;
  onEmptyPress: () => void;
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
          <Pressable
            key={auction.id}
            style={styles.item}
            onPress={() => router.push(`/auctions/${auction.id}`)}
          >
            <View style={styles.imageFrame}>
              <ThemedText style={styles.artMark}>{auction.cardName.slice(0, 1)}</ThemedText>
              <Image
                source={{ uri: auction.imageUrl }}
                style={styles.image}
                contentFit="contain"
              />
            </View>
            <View style={styles.itemBody}>
              <View style={styles.itemTop}>
                <ThemedText style={[styles.category, { color: category.tint }]}>
                  {category.label}
                </ThemedText>
                <ThemedText style={styles.status}>
                  {auction.active ? '진행중' : '종료'}
                </ThemedText>
              </View>
              <ThemedText style={styles.itemTitle} numberOfLines={1}>
                {auction.cardName}
              </ThemedText>
              <ThemedText style={styles.itemMeta}>
                {formatRemainingTime(auction.endAt)} · 입찰 {auction.bidCount}회
              </ThemedText>
              <ThemedText style={styles.itemPrice}>
                {formatPrice(auction.currentPrice)}
              </ThemedText>
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
    maxWidth: 520,
    width: '100%',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  eyebrow: {
    color: palette.brand,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  title: {
    color: palette.ink,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: palette.night,
    borderRadius: 8,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 16,
    ...shadow,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    marginRight: 12,
    width: 46,
  },
  avatarText: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  profileCopy: {
    flex: 1,
  },
  nickname: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  profileMeta: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  safeBadge: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 7,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  statValue: {
    color: palette.ink,
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  tabRow: {
    backgroundColor: '#EDEFF3',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    marginBottom: 14,
    padding: 4,
  },
  tabChip: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    paddingVertical: 10,
  },
  tabChipActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  tabTextActive: {
    color: palette.ink,
  },
  list: {
    gap: 12,
  },
  item: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  imageFrame: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    height: 136,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: 104,
  },
  artMark: {
    color: '#CBD5E1',
    fontSize: 36,
    fontWeight: '900',
    position: 'relative',
    zIndex: 1,
  },
  image: {
    height: '100%',
    position: 'absolute',
    width: '100%',
  },
  itemBody: {
    flex: 1,
    padding: 14,
  },
  itemTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    fontWeight: '900',
  },
  status: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  itemTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  itemMeta: {
    color: palette.muted,
    fontSize: 12,
    marginBottom: 12,
  },
  itemPrice: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 28,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyButton: {
    backgroundColor: palette.ink,
    borderRadius: 8,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  profilePanel: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  infoRow: {
    alignItems: 'center',
    borderBottomColor: '#F3F4F6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 13,
  },
  infoIcon: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 7,
    height: 32,
    justifyContent: 'center',
    marginRight: 10,
    width: 32,
  },
  infoLabel: {
    color: palette.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  infoValue: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 13,
  },
  logoutText: {
    color: palette.brandDark,
    fontSize: 14,
    fontWeight: '900',
  },
});
