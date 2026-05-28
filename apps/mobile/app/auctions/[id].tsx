import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { isAxiosError } from 'axios';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  TRUST_BADGES,
  formatPrice,
  formatRemainingTime,
  getCategoryMeta,
} from '@/constants/auction';
import { palette, shadow, typography } from '@/constants/ui';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import auctionService, { AuctionResponse } from '@/services/auctionService';
import { isAuthSessionExpiredError } from '@/services/apiClient';
import chatService from '@/services/chatService';
import commerceService, {
  CollectionStatusResponse,
} from '@/services/commerceService';
import paymentService from '@/services/paymentService';
import sellerReviewService from '@/services/sellerReviewService';
import safetyService, { SafetyReportReason } from '@/services/safetyService';
import auctionRealtimeService from '@/services/auctionRealtimeService';
import { showToast } from '@/services/toastService';

const reportReasons: { label: string; value: SafetyReportReason }[] = [
  { label: '사기 의심', value: 'FRAUD' },
  { label: '미발송', value: 'NO_SHIPPING' },
  { label: '허위 사진', value: 'FAKE_PHOTO' },
  { label: '외부거래 유도', value: 'OFF_PLATFORM' },
  { label: '기타', value: 'OTHER' },
];

export default function AuctionDetail() {
  const { isSignedIn, user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const id = Number(params.id);
  const [auction, setAuction] = useState<AuctionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [isBidding, setIsBidding] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [collectionStatus, setCollectionStatus] =
    useState<CollectionStatusResponse | null>(null);
  const [isSavingCollection, setIsSavingCollection] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [deliveryMemo, setDeliveryMemo] = useState('');
  const [isSubmittingShipping, setIsSubmittingShipping] = useState(false);
  const [shippingCompany, setShippingCompany] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSubmittingTracking, setIsSubmittingTracking] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isConfirmingReceived, setIsConfirmingReceived] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const lastPriceRef = useRef<number | null>(null);
  const priceFlash = useRef(new Animated.Value(0)).current;

  const flashPrice = useCallback(() => {
    priceFlash.stopAnimation();
    priceFlash.setValue(0);
    Animated.sequence([
      Animated.timing(priceFlash, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }),
      Animated.timing(priceFlash, {
        toValue: 0,
        duration: 650,
        useNativeDriver: false,
      }),
    ]).start();
  }, [priceFlash]);

  const applyAuctionUpdate = useCallback(
    (data: AuctionResponse, animatePrice = true) => {
      const previousPrice = lastPriceRef.current;
      if (
        animatePrice &&
        previousPrice !== null &&
        data.currentPrice > previousPrice
      ) {
        flashPrice();
      }
      lastPriceRef.current = data.currentPrice;
      setAuction(data);
    },
    [flashPrice],
  );

  const loadAuction = useCallback(async (silent = false) => {
    if (!id) {
      return;
    }

    if (!silent) setLoading(true);
    try {
      const data = await auctionService.getAuction(id);
      applyAuctionUpdate(data, silent);
    } catch (error) {
      if (!silent) Alert.alert(
        '경매 조회 오류',
        error instanceof Error ? error.message : '경매를 불러오지 못했습니다.',
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, [applyAuctionUpdate, id]);

  useEffect(() => {
    loadAuction();
  }, [loadAuction]);

  useFocusEffect(
    useCallback(() => {
      loadAuction();
    }, [loadAuction]),
  );

  useEffect(() => {
    if (!id) {
      return;
    }

    const connection = auctionRealtimeService.openAuctionSocket(id, (event) => {
      if (event.type === 'UPDATED' && event.auction) {
        applyAuctionUpdate(event.auction);
      }
    });

    return () => connection.close();
  }, [applyAuctionUpdate, id]);

  useEffect(() => {
    if (!isSignedIn || !id) {
      return;
    }

    commerceService.getStatus(id).then(setCollectionStatus).catch(() => {
      setCollectionStatus(null);
    });
  }, [id, isSignedIn]);

  const nextBidAmount = useMemo(() => {
    if (!auction) {
      return 0;
    }

    return auction.currentPrice + auction.minimumIncrement;
  }, [auction]);

  const quickBidOptions = useMemo(() => {
    if (!auction) {
      return [];
    }

    return [
      nextBidAmount,
      nextBidAmount + auction.minimumIncrement,
      nextBidAmount + auction.minimumIncrement * 3,
    ];
  }, [auction, nextBidAmount]);

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

  const requireLogin = (message: string) => {
    if (isSignedIn) {
      return false;
    }

    Alert.alert('로그인 필요', message);
    router.push('/login');
    return true;
  };

  const handleSessionExpired = async (error: unknown) => {
    if (!isAuthSessionExpiredError(error)) {
      return false;
    }

    await logout();
    Alert.alert('로그인이 만료됐어요', '다시 로그인해주세요.');
    router.replace('/login');
    return true;
  };

  const handleBid = async () => {
    if (requireLogin('입찰하려면 카카오 로그인이 필요합니다.')) {
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
      applyAuctionUpdate(updated);
      setBidAmount('');
      showToast({
        type: 'success',
        category: 'bid',
        title: '입찰 완료',
        message: '입찰이 바로 반영됐어요.',
      });
    } catch (error) {
      if (await handleSessionExpired(error)) {
        return;
      }
      Alert.alert('입찰 실패', getErrorMessage(error));
    } finally {
      setIsBidding(false);
    }
  };

  const requestTossPayment = async (auctionId: number) => {
    const prepared = await paymentService.prepareAuctionPayment(auctionId);
    const result = await WebBrowser.openAuthSessionAsync(
      prepared.checkoutUrl,
      prepared.successUrl,
    );

    if (result.type !== 'success') {
      return null;
    }

    const parsedUrl = new URL(result.url);
    const paymentKey = parsedUrl.searchParams.get('paymentKey');
    const orderId = parsedUrl.searchParams.get('orderId');
    const amount = Number(parsedUrl.searchParams.get('amount'));

    if (!paymentKey || !orderId || !amount) {
      Alert.alert('안전결제 실패', '토스 결제 승인 정보를 확인하지 못했습니다.');
      return null;
    }

    await paymentService.confirmTossPayment({ paymentKey, orderId, amount });
    return auctionService.getAuction(auctionId);
  };

  const handleBuyNow = async () => {
    if (requireLogin('즉시 낙찰하려면 카카오 로그인이 필요합니다.')) {
      return;
    }

    if (!auction?.buyNowPrice) {
      return;
    }

    try {
      setIsBidding(true);
      const paid = await requestTossPayment(auction.id);
      if (!paid) {
        Alert.alert('결제 취소', '결제가 완료되지 않았어요. 낙찰은 반영되지 않았습니다.');
        return;
      }
      await chatService.createRoom(auction.id).catch(() => null);
      applyAuctionUpdate(paid);
      Alert.alert(
        '낙찰 완료',
        '즉시 낙찰됐어요. 배송정보를 입력하면 판매자와의 채팅으로 자동 전달됩니다.',
      );
    } catch (error) {
      if (await handleSessionExpired(error)) {
        return;
      }
      Alert.alert('즉시 낙찰 실패', getErrorMessage(error));
    } finally {
      setIsBidding(false);
    }
  };

  const handlePayAuction = async () => {
    if (requireLogin('결제하려면 로그인이 필요합니다.')) {
      return;
    }

    if (!auction) {
      return;
    }

    try {
      setIsPaying(true);
      const prepared = await paymentService.prepareAuctionPayment(auction.id);
      const result = await WebBrowser.openAuthSessionAsync(
        prepared.checkoutUrl,
        prepared.successUrl,
      );

      if (result.type !== 'success') {
        return;
      }

      const parsedUrl = new URL(result.url);
      const paymentKey = parsedUrl.searchParams.get('paymentKey');
      const orderId = parsedUrl.searchParams.get('orderId');
      const amount = Number(parsedUrl.searchParams.get('amount'));

      if (!paymentKey || !orderId || !amount) {
        Alert.alert('안전결제 실패', '토스 결제 승인 정보를 확인하지 못했습니다.');
        return;
      }

      await paymentService.confirmTossPayment({ paymentKey, orderId, amount });
      const updated = await auctionService.getAuction(auction.id);
      applyAuctionUpdate(updated);
      Alert.alert('안전결제 완료', '결제 금액이 구매확정 전까지 안전하게 보관됩니다.');
    } catch (error) {
      if (await handleSessionExpired(error)) {
        return;
      }
      Alert.alert('안전결제 실패', getErrorMessage(error));
    } finally {
      setIsPaying(false);
    }
  };

  const handleContactSeller = async () => {
    if (requireLogin('판매자와 채팅하려면 카카오 로그인이 필요합니다.')) {
      return;
    }

    if (!auction?.creatorId) {
      Alert.alert('채팅 불가', '판매자 정보가 없는 경매입니다.');
      return;
    }

    try {
      setIsCreatingChat(true);
      const room = await chatService.createRoom(auction.id);
      router.push({
        pathname: '/chats/[id]',
        params: {
          id: String(room.id),
          nickname: room.otherUserNickname,
          otherUserId: String(room.otherUserId),
        },
      } as any);
    } catch (error) {
      if (await handleSessionExpired(error)) {
        return;
      }
      Alert.alert(
        '채팅 연결 실패',
        error instanceof Error ? error.message : '판매자와 연결하지 못했습니다.',
      );
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (requireLogin('찜하려면 카카오 로그인이 필요합니다.')) {
      return;
    }

    if (!auction) {
      return;
    }

    try {
      setIsSavingCollection(true);
      const updated = collectionStatus?.wished
        ? await commerceService.removeWishlist(auction.id)
        : await commerceService.addWishlist(auction.id);
      setCollectionStatus(updated);
    } catch (error) {
      if (await handleSessionExpired(error)) {
        return;
      }
      Alert.alert(
        '찜 처리 실패',
        error instanceof Error ? error.message : '찜 상태를 변경하지 못했습니다.',
      );
    } finally {
      setIsSavingCollection(false);
    }
  };

  const handleToggleCart = async () => {
    if (requireLogin('장바구니에 담으려면 카카오 로그인이 필요합니다.')) {
      return;
    }

    if (!auction) {
      return;
    }

    try {
      setIsSavingCollection(true);
      const updated = collectionStatus?.inCart
        ? await commerceService.removeCart(auction.id)
        : await commerceService.addCart(auction.id);
      setCollectionStatus(updated);
      if (!collectionStatus?.inCart) {
        Alert.alert('장바구니 담기 완료', 'MY에서 장바구니 상품을 한번에 결제할 수 있어요.');
      }
    } catch (error) {
      if (await handleSessionExpired(error)) {
        return;
      }
      Alert.alert(
        '장바구니 처리 실패',
        error instanceof Error
          ? error.message
          : '장바구니 상태를 변경하지 못했습니다.',
      );
    } finally {
      setIsSavingCollection(false);
    }
  };

  const handleShare = async () => {
    if (!auction) {
      return;
    }

    const shareUrl = `cardbid://auctions/${auction.id}`;
    await Share.share({
      message: [
        `${auction.cardName}`,
        `현재가 ${formatPrice(auction.currentPrice)}`,
        `남은 시간 ${formatRemainingTime(auction.endAt)}`,
        auction.imageUrl ? `이미지 ${auction.imageUrl}` : null,
        shareUrl,
      ]
        .filter(Boolean)
        .join('\n'),
      title: `${auction.cardName} 경매`,
      url: shareUrl,
    });
  };

  const handleReportAuction = () => {
    if (requireLogin('신고하려면 로그인이 필요합니다.')) {
      return;
    }

    if (!auction) {
      return;
    }

    Alert.alert(
      '신고하기',
      '신고 사유를 선택해주세요.',
      [
        ...reportReasons.map((reason) => ({
          text: reason.label,
          onPress: async () => {
            try {
              await safetyService.report({
                auctionId: auction.id,
                reportedUserId: auction.creatorId,
                reason: reason.value,
              });
              Alert.alert('신고 완료', '확인 후 필요한 조치를 진행할게요.');
            } catch (error) {
              if (await handleSessionExpired(error)) return;
              Alert.alert('신고 실패', getErrorMessage(error));
            }
          },
        })),
        { text: '취소', style: 'cancel' },
      ],
    );
  };

  const handleSubmitShipping = async () => {
    if (!auction) {
      return;
    }

    if (!recipientName.trim() || !phoneNumber.trim() || !address.trim()) {
      Alert.alert('배송정보 확인', '수령인, 연락처, 주소를 입력해주세요.');
      return;
    }

    try {
      setIsSubmittingShipping(true);
      const updated = await auctionService.submitShippingInfo(auction.id, {
        recipientName: recipientName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        addressDetail: addressDetail.trim(),
        deliveryMemo: deliveryMemo.trim(),
      });
      setAuction(updated);
      Alert.alert('배송정보 전송 완료', '판매자와의 채팅에 배송정보가 전달되었습니다.');
      setDeliveryMemo('');
    } catch (error) {
      if (await handleSessionExpired(error)) {
        return;
      }
      Alert.alert('배송정보 전송 실패', getErrorMessage(error));
    } finally {
      setIsSubmittingShipping(false);
    }
  };

  const handleSubmitTracking = async () => {
    if (!auction) {
      return;
    }

    if (!shippingCompany.trim() || !trackingNumber.trim()) {
      Alert.alert('송장정보 확인', '택배사와 송장번호를 입력해주세요.');
      return;
    }

    try {
      setIsSubmittingTracking(true);
      const updated = await auctionService.submitTrackingInfo(auction.id, {
        shippingCompany: shippingCompany.trim(),
        trackingNumber: trackingNumber.trim(),
      });
      setAuction(updated);
      Alert.alert('송장 등록 완료', '구매자 채팅으로 송장정보가 전달됐어요.');
    } catch (error) {
      if (await handleSessionExpired(error)) {
        return;
      }
      Alert.alert('송장 등록 실패', getErrorMessage(error));
    } finally {
      setIsSubmittingTracking(false);
    }
  };

  const handleConfirmReceived = async () => {
    if (!auction) {
      return;
    }

    try {
      setIsConfirmingReceived(true);
      const updated = await auctionService.confirmReceived(auction.id);
      setAuction(updated);
      Alert.alert('거래 완료', '이제 판매자 후기를 남길 수 있어요.');
    } catch (error) {
      if (await handleSessionExpired(error)) {
        return;
      }
      Alert.alert('거래 완료 실패', getErrorMessage(error));
    } finally {
      setIsConfirmingReceived(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!auction?.creatorId) {
      return;
    }

    try {
      setIsSubmittingReview(true);
      await sellerReviewService.submitReview(auction.creatorId, {
        auctionId: auction.id,
        rating: reviewRating,
        content: reviewContent.trim(),
      });
      Alert.alert('후기 등록 완료', '판매자 상점에 별점과 후기가 반영됐어요.');
      setReviewContent('');
    } catch (error) {
      if (await handleSessionExpired(error)) {
        return;
      }
      Alert.alert('후기 등록 실패', getErrorMessage(error));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.brand} />
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
  const isOwner = auction.creatorId === user?.id;
  const isWinner = auction.winnerId === user?.id;
  const isPaymentHeld = auction.paymentStatus === 'HELD';
  const isPaymentReleased = auction.paymentStatus === 'RELEASED';
  const needsPayment = isWinner && !isPaymentHeld && !isPaymentReleased;
  const priceBoardAnimatedStyle = {
    backgroundColor: priceFlash.interpolate({
      inputRange: [0, 1],
      outputRange: [palette.night, '#1F7A4D'],
    }),
    borderColor: priceFlash.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255,255,255,0)', '#86EFAC'],
    }),
  };
  const priceTextAnimatedStyle = {
    color: priceFlash.interpolate({
      inputRange: [0, 1],
      outputRange: ['#FFFFFF', '#BBF7D0'],
    }),
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 42 + insets.bottom },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.topActions}>
            <Pressable style={styles.iconButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={19} color={palette.ink} />
            </Pressable>
            {!isOwner ? (
              <Pressable style={styles.iconButton} onPress={handleReportAuction}>
                <Ionicons name="flag-outline" size={19} color={palette.ink} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.imagePanel}>
          <View style={styles.statusBadge}>
            <Ionicons
              name={auction.active ? 'radio-button-on' : 'lock-closed'}
              size={12}
              color="#FFFFFF"
            />
            <ThemedText style={styles.statusBadgeText}>
              {auction.active ? 'LIVE AUCTION' : 'CLOSED'}
            </ThemedText>
          </View>
          <ThemedText style={styles.artMark}>{auction.cardName.slice(0, 2)}</ThemedText>
          <Image
            source={{ uri: auction.imageUrl }}
            style={styles.cardImage}
            contentFit="cover"
            transition={180}
          />
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <View style={[styles.categoryPill, { backgroundColor: category.background }]}>
              <Ionicons name={category.icon as any} size={14} color={category.tint} />
              <ThemedText style={[styles.categoryText, { color: category.tint }]}>
                {category.label}
              </ThemedText>
            </View>
            <ThemedText style={styles.timerText}>
              {formatRemainingTime(auction.endAt)}
            </ThemedText>
          </View>
          <ThemedText type="title" style={styles.title}>
            {auction.cardName}
          </ThemedText>
          <ThemedText style={styles.description}>
            {auction.cardDescription || '상태와 구성품 설명이 아직 없습니다.'}
          </ThemedText>
          <View style={styles.sellerRow}>
            <Pressable
              style={({ pressed }) => [
                styles.sellerProfileButton,
                pressed && styles.pressedSellerProfile,
              ]}
              onPress={() => {
                if (!auction.creatorId) return;
                router.push({
                  pathname: '/sellers/[id]',
                  params: {
                    id: String(auction.creatorId),
                    nickname: auction.creatorNickname || `seller #${auction.creatorId}`,
                  },
                } as any);
              }}
            >
              <View style={styles.sellerAvatar}>
                <Ionicons name="person" size={17} color={palette.ink} />
              </View>
              <View style={styles.sellerCopy}>
                <ThemedText style={styles.sellerLabel}>판매자 상점</ThemedText>
                <ThemedText style={styles.sellerName}>
                  {auction.creatorNickname || `seller #${auction.creatorId ?? '-'}`}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={17} color={palette.muted} />
            </Pressable>
            {!isOwner ? (
              <Pressable
                style={[styles.sellerChatButton, isCreatingChat && styles.disabledButton]}
                onPress={handleContactSeller}
                disabled={isCreatingChat}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={palette.ink} />
                <ThemedText style={styles.sellerChatText}>
                  {isCreatingChat ? '연결중' : '채팅'}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Animated.View style={[styles.priceBoard, priceBoardAnimatedStyle]}>
          <View style={styles.priceBlock}>
            <ThemedText style={styles.metricLabel}>현재가</ThemedText>
            <Animated.Text style={[styles.currentPrice, priceTextAnimatedStyle]}>
              {formatPrice(auction.currentPrice)}
            </Animated.Text>
          </View>
          <View style={styles.metricGrid}>
            <View style={styles.metricBox}>
              <ThemedText style={styles.metricLabel}>입찰</ThemedText>
              <ThemedText style={styles.metricValue}>{auction.bidCount}회</ThemedText>
            </View>
            <View style={styles.metricBox}>
              <ThemedText style={styles.metricLabel}>입찰 단위</ThemedText>
              <ThemedText style={styles.metricValue}>
                {formatPrice(auction.minimumIncrement)}
              </ThemedText>
            </View>
          </View>
          {auction.buyNowPrice ? (
            <View style={styles.buyNowLine}>
              <Ionicons name="flash" size={16} color={palette.brandDark} />
              <ThemedText style={styles.buyNowLineText}>
                즉시 낙찰가 {formatPrice(auction.buyNowPrice)}
              </ThemedText>
            </View>
          ) : null}
        </Animated.View>

        <View style={styles.collectionPanel}>
          <Pressable
            style={[
              styles.collectionButton,
              collectionStatus?.wished && styles.collectionButtonActive,
            ]}
            onPress={handleToggleWishlist}
            disabled={isSavingCollection}
          >
            <Ionicons
              name={collectionStatus?.wished ? 'heart' : 'heart-outline'}
              size={18}
              color={collectionStatus?.wished ? '#FFFFFF' : palette.brand}
            />
            <ThemedText
              style={[
                styles.collectionButtonText,
                collectionStatus?.wished && styles.collectionButtonTextActive,
              ]}
            >
              {collectionStatus?.wished ? '찜 완료' : '찜하기'}
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.collectionButton,
              collectionStatus?.inCart && styles.collectionButtonActive,
              !auction.buyNowPrice && styles.collectionButtonDisabled,
            ]}
            onPress={handleToggleCart}
            disabled={isSavingCollection || !auction.buyNowPrice}
          >
            <Ionicons
              name={collectionStatus?.inCart ? 'bag-check' : 'bag-add-outline'}
              size={18}
              color={collectionStatus?.inCart ? '#FFFFFF' : palette.brand}
            />
            <ThemedText
              style={[
                styles.collectionButtonText,
                collectionStatus?.inCart && styles.collectionButtonTextActive,
              ]}
            >
              {collectionStatus?.inCart ? '담김' : '장바구니'}
            </ThemedText>
          </Pressable>
        </View>

        {auction.active ? (
          <View style={styles.actionPanel}>
            <ThemedText style={styles.panelTitle}>입찰하기</ThemedText>
            <ThemedText style={styles.helperText}>
              다음 입찰가는 {formatPrice(nextBidAmount)}부터 시작합니다.
            </ThemedText>
            <View style={styles.quickBidRow}>
              {quickBidOptions.map((amount) => (
                <Pressable
                  key={amount}
                  style={[
                    styles.quickBidChip,
                    bidAmount === String(amount) && styles.quickBidChipActive,
                  ]}
                  onPress={() => setBidAmount(String(amount))}
                >
                  <ThemedText
                    style={[
                      styles.quickBidText,
                      bidAmount === String(amount) && styles.quickBidTextActive,
                    ]}
                  >
                    {formatPrice(amount)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={bidAmount}
              onChangeText={setBidAmount}
              keyboardType="numeric"
              placeholder={String(nextBidAmount)}
              placeholderTextColor={palette.subtle}
              style={styles.input}
            />
            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.primaryButton, isBidding && styles.disabledButton]}
                onPress={handleBid}
                disabled={isBidding}
              >
                <ThemedText style={styles.primaryButtonText}>
                  {isBidding ? '처리 중...' : '입찰'}
                </ThemedText>
              </Pressable>
              {auction.buyNowPrice ? (
                <Pressable
                  style={[styles.buyNowButton, isBidding && styles.disabledButton]}
                  onPress={handleBuyNow}
                  disabled={isBidding}
                >
                  <Ionicons name="flash" size={17} color="#FFFFFF" />
                  <ThemedText style={styles.primaryButtonText}>즉시</ThemedText>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.closedPanel}>
            <Ionicons name="lock-closed" size={18} color={palette.brandDark} />
            <ThemedText style={styles.closedText}>이 경매는 종료되었습니다.</ThemedText>
          </View>
        )}

        {!auction.active && isWinner ? (
          <View style={styles.paymentPanel}>
            <View style={styles.shippingHeader}>
              <Ionicons name="shield-checkmark-outline" size={19} color={palette.brand} />
              <ThemedText style={styles.panelTitle}>안전결제</ThemedText>
            </View>
            {needsPayment ? (
              <>
                <ThemedText style={styles.helperText}>
                  낙찰 금액을 결제하면 구매확정 전까지 보관됩니다.
                </ThemedText>
                <Pressable
                  style={[styles.primaryButton, isPaying && styles.disabledButton]}
                  onPress={handlePayAuction}
                  disabled={isPaying}
                >
                  <ThemedText style={styles.primaryButtonText}>
                    {isPaying ? '결제 중...' : `${formatPrice(auction.currentPrice)} 결제`}
                  </ThemedText>
                </Pressable>
              </>
            ) : (
              <View style={styles.completeBadge}>
                <Ionicons
                  name={isPaymentReleased ? 'checkmark-done-circle' : 'lock-closed'}
                  size={18}
                  color={palette.success}
                />
                <ThemedText style={styles.completeBadgeText}>
                  {isPaymentReleased ? '정산 완료' : '결제금 보관 중'}
                </ThemedText>
              </View>
            )}
          </View>
        ) : null}

        {!auction.active && isWinner && isPaymentHeld ? (
          <View style={styles.shippingPanel}>
            <View style={styles.shippingHeader}>
              <Ionicons name="location-outline" size={19} color={palette.brand} />
              <ThemedText style={styles.panelTitle}>배송정보 입력</ThemedText>
            </View>
            <ThemedText style={styles.helperText}>
              입력한 정보는 판매자와의 채팅에 자동으로 전달됩니다.
            </ThemedText>
            <TextInput
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="수령인"
              placeholderTextColor={palette.subtle}
              style={styles.input}
            />
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholder="연락처"
              placeholderTextColor={palette.subtle}
              style={styles.input}
            />
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="주소"
              placeholderTextColor={palette.subtle}
              style={styles.input}
            />
            <TextInput
              value={addressDetail}
              onChangeText={setAddressDetail}
              placeholder="상세주소"
              placeholderTextColor={palette.subtle}
              style={styles.input}
            />
            <TextInput
              value={deliveryMemo}
              onChangeText={setDeliveryMemo}
              placeholder="배송 요청사항"
              placeholderTextColor={palette.subtle}
              style={[styles.input, styles.shippingMemoInput]}
              multiline
            />
            <Pressable
              style={[
                styles.primaryButton,
                isSubmittingShipping && styles.disabledButton,
              ]}
              onPress={handleSubmitShipping}
              disabled={isSubmittingShipping}
            >
              <ThemedText style={styles.primaryButtonText}>
                {isSubmittingShipping ? '전송 중...' : '판매자에게 전달'}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {!auction.active && isOwner && auction.winnerId && isPaymentHeld ? (
          <View style={styles.shippingPanel}>
            <View style={styles.shippingHeader}>
              <Ionicons name="cube-outline" size={19} color={palette.brand} />
              <ThemedText style={styles.panelTitle}>송장번호 등록</ThemedText>
            </View>
            <ThemedText style={styles.helperText}>
              판매자가 택배사와 송장번호를 입력하면 구매자 채팅으로 자동 전달돼요.
            </ThemedText>
            <TextInput
              value={shippingCompany}
              onChangeText={setShippingCompany}
              placeholder={auction.shippingCompany || '택배사'}
              placeholderTextColor={palette.subtle}
              style={styles.input}
            />
            <TextInput
              value={trackingNumber}
              onChangeText={setTrackingNumber}
              placeholder={auction.trackingNumber || '송장번호'}
              placeholderTextColor={palette.subtle}
              style={styles.input}
            />
            <Pressable
              style={[styles.primaryButton, isSubmittingTracking && styles.disabledButton]}
              onPress={handleSubmitTracking}
              disabled={isSubmittingTracking}
            >
              <ThemedText style={styles.primaryButtonText}>
                {isSubmittingTracking ? '등록 중...' : '송장 등록'}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {!auction.active && isWinner && (isPaymentHeld || isPaymentReleased) ? (
          <View style={styles.deliveryPanel}>
            <View style={styles.shippingHeader}>
              <Ionicons name="trail-sign-outline" size={19} color={palette.brand} />
              <ThemedText style={styles.panelTitle}>배송상태</ThemedText>
            </View>
            {auction.trackingNumber ? (
              <View style={styles.deliveryInfoBox}>
                <ThemedText style={styles.deliveryLabel}>택배사</ThemedText>
                <ThemedText style={styles.deliveryValue}>{auction.shippingCompany}</ThemedText>
                <ThemedText style={styles.deliveryLabel}>송장번호</ThemedText>
                <ThemedText style={styles.deliveryValue}>{auction.trackingNumber}</ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.helperText}>판매자가 송장번호를 등록하면 여기에서 확인할 수 있어요.</ThemedText>
            )}
            {auction.receivedConfirmed ? (
              <View style={styles.completeBadge}>
                <Ionicons name="checkmark-circle" size={18} color={palette.success} />
                <ThemedText style={styles.completeBadgeText}>상품 수령 완료</ThemedText>
              </View>
            ) : (
              <Pressable
                style={[styles.primaryButton, isConfirmingReceived && styles.disabledButton]}
                onPress={handleConfirmReceived}
                disabled={isConfirmingReceived}
              >
                <ThemedText style={styles.primaryButtonText}>
                  {isConfirmingReceived ? '처리 중...' : '상품 받았어요'}
                </ThemedText>
              </Pressable>
            )}
          </View>
        ) : null}

        {!auction.active && isWinner && auction.creatorId && auction.receivedConfirmed ? (
          <View style={styles.reviewPanel}>
            <View style={styles.shippingHeader}>
              <Ionicons name="star-outline" size={19} color={palette.brand} />
              <ThemedText style={styles.panelTitle}>거래 후기 남기기</ThemedText>
            </View>
            <ThemedText style={styles.helperText}>
              거래가 끝나면 판매자 상점에 별점과 후기를 남길 수 있어요.
            </ThemedText>
            <View style={styles.starPicker}>
              {Array.from({ length: 5 }).map((_, index) => {
                const value = index + 1;
                return (
                  <Pressable
                    key={value}
                    style={styles.starButton}
                    onPress={() => setReviewRating(value)}
                  >
                    <Ionicons
                      name={value <= reviewRating ? 'star' : 'star-outline'}
                      size={28}
                      color="#F59E0B"
                    />
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={reviewContent}
              onChangeText={setReviewContent}
              placeholder="거래는 어땠나요? 포장, 소통, 배송 경험을 남겨주세요."
              placeholderTextColor={palette.subtle}
              style={[styles.input, styles.reviewInput]}
              multiline
              maxLength={500}
            />
            <Pressable
              style={[styles.primaryButton, isSubmittingReview && styles.disabledButton]}
              onPress={handleSubmitReview}
              disabled={isSubmittingReview}
            >
              <ThemedText style={styles.primaryButtonText}>
                {isSubmittingReview ? '등록 중...' : '후기 등록'}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.trustPanel}>
          <ThemedText style={styles.panelTitle}>거래 체크포인트</ThemedText>
          <View style={styles.checklist}>
            <View style={styles.checkItem}>
              <Ionicons name="camera" size={17} color={palette.ink} />
              <View style={styles.checkCopy}>
                <ThemedText style={styles.checkTitle}>실물 사진 확인</ThemedText>
                <ThemedText style={styles.checkText}>앞면, 뒷면, 모서리 사진을 요청하세요.</ThemedText>
              </View>
            </View>
            <View style={styles.checkItem}>
              <Ionicons name="cube" size={17} color={palette.ink} />
              <View style={styles.checkCopy}>
                <ThemedText style={styles.checkTitle}>포장/배송 확인</ThemedText>
                <ThemedText style={styles.checkText}>탑로더, 박스 포장, 송장 공유 여부를 확인하세요.</ThemedText>
              </View>
            </View>
          </View>
          <View style={styles.trustGrid}>
            {TRUST_BADGES.map((badge) => (
              <View key={badge.label} style={styles.trustItem}>
                <Ionicons name={badge.icon as any} size={18} color={palette.success} />
                <ThemedText style={styles.trustText}>{badge.label}</ThemedText>
              </View>
            ))}
          </View>
          <ThemedText style={styles.trustHelper}>
            낙찰 전 사진, 상태, 배송 방법은 판매자와 채팅으로 확인하세요.
          </ThemedText>
        </View>

        <View style={styles.marketplaceNotice}>
          <Ionicons name="information-circle-outline" size={17} color={palette.muted} />
          <ThemedText style={styles.marketplaceNoticeText}>
            CardPick은 판매자와 구매자를 연결하는 중개 플랫폼입니다. 상품 정보와 거래 이행의
            1차 책임은 거래 당사자에게 있으며, 의심 거래는 앱 내 채팅 기록을 남기고 신고해 주세요.
          </ThemedText>
        </View>

        <View style={styles.bidHistory}>
          <View style={styles.historyHeader}>
            <ThemedText style={styles.panelTitle}>입찰 내역</ThemedText>
            <ThemedText style={styles.historyCount}>{auction.bids?.length ?? 0}건</ThemedText>
          </View>
          {auction.bids && auction.bids.length > 0 ? (
            auction.bids.map((bid) => (
              <View key={bid.id} style={styles.bidItem}>
                <View style={styles.bidderBadge}>
                  <Ionicons name="person" size={14} color={palette.muted} />
                </View>
                <View style={styles.bidBody}>
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
            <View style={styles.emptyBids}>
              <Ionicons name="sparkles" size={18} color={palette.subtle} />
              <ThemedText style={styles.emptyText}>
                아직 입찰 내역이 없습니다. 첫 입찰을 넣어보세요.
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: 42,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 14,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.line,
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
    aspectRatio: 0.72,
    overflow: 'hidden',
    padding: 18,
    position: 'relative',
    ...shadow,
  },
  statusBadge: {
    alignItems: 'center',
    backgroundColor: palette.ink,
    borderRadius: 6,
    flexDirection: 'row',
    gap: 5,
    left: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'absolute',
    top: 14,
    zIndex: 2,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  artMark: {
    color: '#CBD5E1',
    fontSize: 62,
    fontWeight: '900',
    position: 'absolute',
    zIndex: 1,
  },
  cardImage: {
    aspectRatio: 0.72,
    position: 'relative',
    width: '100%',
  },
  summary: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  summaryTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryPill: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '900',
  },
  timerText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: palette.ink,
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 29,
    marginBottom: 8,
  },
  description: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  sellerRow: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    flexDirection: 'row',
    padding: 10,
  },
  sellerProfileButton: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
  },
  pressedSellerProfile: {
    opacity: 0.68,
  },
  sellerAvatar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    marginRight: 10,
    width: 38,
  },
  sellerCopy: {
    flex: 1,
  },
  sellerLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  sellerName: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  sellerChatButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  sellerChatText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  collectionPanel: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  collectionButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    paddingVertical: 13,
  },
  collectionButtonActive: {
    backgroundColor: palette.brand,
    borderColor: palette.brand,
  },
  collectionButtonDisabled: {
    opacity: 0.45,
  },
  collectionButtonText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  collectionButtonTextActive: {
    color: '#FFFFFF',
  },
  priceBoard: {
    backgroundColor: palette.night,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    padding: 18,
    ...shadow,
  },
  priceBlock: {
    borderBottomColor: 'rgba(255,255,255,0.13)',
    borderBottomWidth: 1,
    marginBottom: 14,
    paddingBottom: 14,
  },
  currentPrice: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    flex: 1,
    padding: 12,
  },
  metricLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 5,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  buyNowLine: {
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buyNowLineText: {
    color: palette.brandDark,
    fontSize: 13,
    fontWeight: '900',
  },
  actionPanel: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 18,
  },
  panelTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  helperText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  quickBidRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  quickBidChip: {
    backgroundColor: '#F3F4F6',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  quickBidChipActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  quickBidText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '900',
  },
  quickBidTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.ink,
    fontFamily: typography.family,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.ink,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 15,
  },
  buyNowButton: {
    alignItems: 'center',
    backgroundColor: palette.brand,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minWidth: 94,
    paddingHorizontal: 14,
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
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderColor: '#FFE4E6',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    padding: 16,
  },
  closedText: {
    color: palette.brandDark,
    fontSize: 14,
    fontWeight: '900',
  },
  shippingPanel: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 18,
  },
  paymentPanel: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 18,
  },
  shippingHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  shippingMemoInput: {
    minHeight: 82,
    textAlignVertical: 'top',
  },
  deliveryPanel: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 18,
  },
  deliveryInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    gap: 4,
    marginBottom: 12,
    padding: 12,
  },
  deliveryLabel: { color: palette.muted, fontSize: 12, fontWeight: '800' },
  deliveryValue: { color: palette.ink, fontSize: 15, fontWeight: '900', marginBottom: 6 },
  completeBadge: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  completeBadgeText: { color: palette.success, fontSize: 14, fontWeight: '900' },
  reviewPanel: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 18,
  },
  starPicker: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
    marginTop: 4,
  },
  starButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  reviewInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  trustPanel: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 18,
  },
  checklist: {
    gap: 8,
    marginBottom: 12,
  },
  checkItem: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  checkCopy: {
    flex: 1,
  },
  checkTitle: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 3,
  },
  checkText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  trustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  trustItem: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  trustText: {
    color: palette.success,
    fontSize: 12,
    fontWeight: '900',
  },
  trustHelper: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  marketplaceNotice: {
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    padding: 12,
  },
  marketplaceNoticeText: {
    color: palette.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  bidHistory: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  historyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyCount: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  bidItem: {
    alignItems: 'center',
    borderTopColor: '#F3F4F6',
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  bidderBadge: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    marginRight: 10,
    width: 34,
  },
  bidBody: {
    flex: 1,
  },
  bidderText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  bidDate: {
    color: palette.subtle,
    fontSize: 12,
  },
  bidAmount: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyBids: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    padding: 14,
  },
  emptyText: {
    color: palette.muted,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
