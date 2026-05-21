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
import { isAxiosError } from 'axios';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  formatPrice,
  formatRemainingTime,
  getCategoryMeta,
} from '@/constants/auction';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import auctionService, { AuctionResponse } from '@/services/auctionService';
import chatService from '@/services/chatService';

export default function AuctionDetail() {
  const { isSignedIn, user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = Number(params.id);
  const [auction, setAuction] = useState<AuctionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [isBidding, setIsBidding] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const loadAuction = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    try {
      const data = await auctionService.getAuction(id);
      setAuction(data);
    } catch (error) {
      Alert.alert(
        '경매 조회 오류',
        error instanceof Error ? error.message : '경매를 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAuction();
  }, [loadAuction]);

  const nextBidAmount = useMemo(() => {
    if (!auction) {
      return 0;
    }

    return auction.currentPrice + auction.minimumIncrement;
  }, [auction]);

  const getErrorMessage = (error: unknown) => {
    if (isAxiosError(error)) {
      const responseData = error.response?.data;
      if (responseData && typeof responseData === 'object') {
        if ('message' in responseData && typeof responseData.message === 'string') {
          return responseData.message;
        }
        if ('error' in responseData && typeof responseData.error === 'string') {
          return responseData.error;
        }
      }
      return error.message || '서버 응답을 처리하지 못했습니다.';
    }

    return error instanceof Error
      ? error.message
      : '알 수 없는 오류가 발생했습니다.';
  };

  const handleBid = async () => {
    if (!isSignedIn) {
      Alert.alert('로그인 필요', '입찰하려면 먼저 로그인해주세요.');
      router.push('/login');
      return;
    }

    if (!auction) {
      return;
    }

    const amount = Number(bidAmount);
    if (!amount || amount < nextBidAmount) {
      Alert.alert(
        '입찰 금액 오류',
        `${formatPrice(nextBidAmount)} 이상으로 입력해주세요.`,
      );
      return;
    }

    try {
      setIsBidding(true);
      const updated = await auctionService.placeBid(auction.id, amount);
      setAuction(updated);
      setBidAmount('');
      Alert.alert('입찰 완료', '입찰이 반영되었습니다.');
    } catch (error) {
      Alert.alert('입찰 실패', getErrorMessage(error));
    } finally {
      setIsBidding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!isSignedIn) {
      Alert.alert('로그인 필요', '즉시 낙찰하려면 먼저 로그인해주세요.');
      router.push('/login');
      return;
    }

    if (!auction || !auction.buyNowPrice) {
      return;
    }

    try {
      setIsBidding(true);
      const updated = await auctionService.buyNow(auction.id);
      setAuction(updated);
      Alert.alert('낙찰 완료', '즉시 낙찰되었습니다.');
    } catch (error) {
      Alert.alert('즉시 낙찰 실패', getErrorMessage(error));
    } finally {
      setIsBidding(false);
    }
  };

  const handleContactSeller = async () => {
    if (!isSignedIn) {
      Alert.alert('로그인 필요', '판매자에게 문의하려면 먼저 로그인해주세요.');
      router.push('/login');
      return;
    }

    if (!auction?.creatorId) {
      Alert.alert('문의 불가', '판매자 정보가 없는 경매입니다.');
      return;
    }

    try {
      setIsCreatingChat(true);
      const room = await chatService.createRoom(auction.id);
      router.push(`/chats/${room.id}` as any);
    } catch (error) {
      Alert.alert(
        '채팅방 생성 실패',
        error instanceof Error ? error.message : '채팅방을 만들지 못했습니다.',
      );
    } finally {
      setIsCreatingChat(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#EF4444" />
      </ThemedView>
    );
  }

  if (!auction) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>경매를 찾을 수 없습니다.</ThemedText>
      </ThemedView>
    );
  }

  const category = getCategoryMeta(auction.cardCategory);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={loadAuction}>
            <Ionicons name="refresh" size={20} color="#111827" />
          </Pressable>
        </View>

        <View style={styles.imagePanel}>
          <ThemedText style={styles.artMark}>{auction.cardName.slice(0, 2)}</ThemedText>
          <Image
            source={{ uri: auction.imageUrl }}
            style={styles.cardImage}
            contentFit="contain"
            transition={180}
          />
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <ThemedText style={[styles.categoryText, { color: category.tint }]}>
              {category.label}
            </ThemedText>
            <ThemedText style={styles.timerText}>
              {formatRemainingTime(auction.endAt)}
            </ThemedText>
          </View>
          <ThemedText type="title" style={styles.title}>
            {auction.cardName}
          </ThemedText>
          <ThemedText style={styles.description}>
            {auction.cardDescription || '상세 설명이 없습니다.'}
          </ThemedText>
          <View style={styles.metricRow}>
            <View style={styles.metricBox}>
              <ThemedText style={styles.metricLabel}>현재가</ThemedText>
              <ThemedText style={styles.metricValue}>
                {formatPrice(auction.currentPrice)}
              </ThemedText>
            </View>
            <View style={styles.metricBox}>
              <ThemedText style={styles.metricLabel}>입찰</ThemedText>
              <ThemedText style={styles.metricValue}>{auction.bidCount}회</ThemedText>
            </View>
          </View>
        </View>

        {auction.active ? (
          <View style={styles.actionPanel}>
            {auction.creatorId && auction.creatorId !== user?.id ? (
              <Pressable
                style={[styles.chatButton, isCreatingChat && styles.disabledButton]}
                onPress={handleContactSeller}
                disabled={isCreatingChat}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#111827" />
                <ThemedText style={styles.chatButtonText}>
                  {isCreatingChat ? '연결 중...' : '판매자 문의'}
                </ThemedText>
              </Pressable>
            ) : null}
            <ThemedText style={styles.panelTitle}>입찰하기</ThemedText>
            <ThemedText style={styles.helperText}>
              최소 입찰가는 {formatPrice(nextBidAmount)}입니다.
            </ThemedText>
            <TextInput
              value={bidAmount}
              onChangeText={setBidAmount}
              keyboardType="numeric"
              placeholder={String(nextBidAmount)}
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
            <Pressable
              style={[styles.primaryButton, isBidding && styles.disabledButton]}
              onPress={handleBid}
              disabled={isBidding}
            >
              <ThemedText style={styles.primaryButtonText}>
                {isBidding ? '처리 중...' : '입찰하기'}
              </ThemedText>
            </Pressable>
            {auction.buyNowPrice ? (
              <Pressable
                style={[styles.secondaryButton, isBidding && styles.disabledButton]}
                onPress={handleBuyNow}
                disabled={isBidding}
              >
                <Ionicons name="flash" size={18} color="#FFFFFF" />
                <ThemedText style={styles.primaryButtonText}>
                  즉시 낙찰 {formatPrice(auction.buyNowPrice)}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.closedPanel}>
            <ThemedText style={styles.closedText}>이 경매는 종료되었습니다.</ThemedText>
          </View>
        )}

        <View style={styles.bidHistory}>
          <ThemedText style={styles.panelTitle}>입찰 내역</ThemedText>
          {auction.bids && auction.bids.length > 0 ? (
            auction.bids.map((bid) => (
              <View key={bid.id} style={styles.bidItem}>
                <View>
                  <ThemedText style={styles.bidderText}>
                    bidder #{bid.bidderId}
                  </ThemedText>
                  <ThemedText style={styles.bidDate}>
                    {new Date(bid.createdAt).toLocaleString()}
                  </ThemedText>
                </View>
                <ThemedText style={styles.bidAmount}>
                  {formatPrice(bid.amount)}
                </ThemedText>
              </View>
            ))
          ) : (
            <ThemedText style={styles.emptyText}>
              아직 입찰 내역이 없습니다.
            </ThemedText>
          )}
        </View>
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
    paddingBottom: 42,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  imagePanel: {
    alignItems: 'center',
    backgroundColor: '#EEF2F7',
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 14,
    padding: 18,
    position: 'relative',
  },
  artMark: {
    color: '#CBD5E1',
    fontSize: 62,
    fontWeight: '900',
    position: 'absolute',
    zIndex: 1,
  },
  cardImage: {
    height: 320,
    position: 'relative',
    width: '100%',
  },
  summary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  summaryTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '900',
  },
  timerText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    marginBottom: 10,
  },
  description: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    flex: 1,
    padding: 12,
  },
  metricLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricValue: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '900',
  },
  actionPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  chatButton: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
    paddingVertical: 13,
  },
  chatButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  panelTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  helperText: {
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 15,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 15,
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  closedPanel: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    marginBottom: 14,
    padding: 16,
  },
  closedText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '800',
  },
  bidHistory: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  bidItem: {
    alignItems: 'center',
    borderTopColor: '#F3F4F6',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  bidderText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  bidDate: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  bidAmount: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 8,
  },
});
