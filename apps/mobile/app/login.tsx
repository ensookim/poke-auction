import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { makeRedirectUri } from 'expo-auth-session';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { ThemedText } from '@/components/themed-text';
import { AppLoadingScreen } from '@/components/app-loading-screen';
import { useAuth } from '@/context/AuthContext';
import authService from '@/services/authService';

WebBrowser.maybeCompleteAuthSession();

const { width: screenWidth } = Dimensions.get('window');
const slideWidth = screenWidth;

type OnboardingSlide = {
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  background: string;
  icon: keyof typeof Ionicons.glyphMap;
  image?: ImageSourcePropType;
  visual: 'rare' | 'auction' | 'chat' | 'start';
};

// Later, replace the mock visual with real app screenshots:
// image: require('@/assets/onboarding/auction-feed.png')
const slides: OnboardingSlide[] = [
  {
    eyebrow: 'DISCOVER',
    title: '찾고 있던 카드가\n경매에 올라오는 곳',
    description:
      '희귀 카드부터 인기 카드까지, 지금 올라온 경매를 한눈에 둘러보세요.',
    accent: '#FFB020',
    background: '#211A05',
    icon: 'sparkles',
    visual: 'rare',
  },
  {
    eyebrow: 'BID LIVE',
    title: '입찰 순간까지\n가격이 살아 움직여요',
    description:
      '남은 시간과 현재가를 보며 원하는 카드에 바로 입찰할 수 있어요.',
    accent: '#4F8CFF',
    background: '#0B2347',
    icon: 'timer',
    visual: 'auction',
  },
  {
    eyebrow: 'TALK FIRST',
    title: '거래 전 궁금한 점은\n채팅으로 먼저 확인해요',
    description:
      '상태, 구성품, 배송 조건을 판매자와 직접 확인하고 신중하게 거래하세요.',
    accent: '#22C55E',
    background: '#092A24',
    icon: 'chatbubbles',
    visual: 'chat',
  },
  {
    eyebrow: 'CARD BID',
    title: '3초 만에 시작하고\n첫 입찰을 걸어보세요',
    description:
      '카카오로 빠르게 시작하고, 나만의 컬렉션을 채워갈 카드를 만나보세요.',
    accent: '#FEE500',
    background: '#2A2100',
    icon: 'flash',
    visual: 'start',
  },
];

export default function LoginScreen() {
  const { isLoading, checkAuth } = useAuth();
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    trade: false,
  });
  const scrollRef = useRef<ScrollView>(null);
  const isLastSlide = activeIndex === slides.length - 1;
  const requiredAgreementsAccepted =
    agreements.terms && agreements.privacy && agreements.trade;

  const activeSlide = slides[activeIndex] ?? slides[0];

  const buttonLabel = useMemo(
    () => (isLastSlide ? '카카오톡으로 3초 만에 시작하기' : '다음'),
    [isLastSlide],
  );

  const handleKakaoLogin = async () => {
    if (!requiredAgreementsAccepted) {
      Alert.alert('필수 동의 필요', '서비스 이용약관, 개인정보처리방침, 거래·환불정책에 모두 동의해주세요.');
      return;
    }

    try {
      setIsAuthLoading(true);

      const appRedirectUri = makeRedirectUri({
        path: 'login-success',
      });
      const loginUrl = authService.getKakaoLoginUrl(appRedirectUri);

      const result = await WebBrowser.openAuthSessionAsync(
        loginUrl,
        appRedirectUri,
      );

      if (result.type !== 'success') {
        return;
      }

      const parsedUrl = new URL(result.url);
      const accessToken = parsedUrl.searchParams.get('accessToken');
      const refreshToken = parsedUrl.searchParams.get('refreshToken');
      const userId = parsedUrl.searchParams.get('userId');
      const nickname = parsedUrl.searchParams.get('nickname');
      const isNewUser = parsedUrl.searchParams.get('isNewUser') === 'true';

      if (!accessToken || !refreshToken) {
        Alert.alert('로그인 실패', '토큰을 받지 못했습니다.');
        return;
      }

      await authService.saveTokens(accessToken, refreshToken);
      await authService.acceptRequiredAgreements();

      if (userId) {
        await authService.saveUser({
          id: Number(userId),
          nickname: nickname ?? '',
        });
      }

      await checkAuth();

      if (isNewUser || !nickname?.trim()) {
        router.replace('/nickname');
      } else {
        router.replace('/');
      }
    } catch (error) {
      Alert.alert(
        '로그인 실패',
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.',
      );
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setActiveIndex(index);
  };

  const goToLastSlide = () => {
    scrollRef.current?.scrollTo({
      x: (slides.length - 1) * slideWidth,
      animated: true,
    });
  };

  const handlePrimaryPress = () => {
    if (isLastSlide) {
      handleKakaoLogin();
      return;
    }

    scrollRef.current?.scrollTo({
      x: (activeIndex + 1) * slideWidth,
      animated: true,
    });
  };

  const toggleAllAgreements = () => {
    const next = !requiredAgreementsAccepted;
    setAgreements({
      terms: next,
      privacy: next,
      trade: next,
    });
  };

  if (isLoading || isAuthLoading) {
    return (
      <AppLoadingScreen
        title={isAuthLoading ? '로그인 중' : 'CardBid'}
        message={isAuthLoading ? '카카오 계정을 확인하고 있어요' : '경매장을 준비하고 있어요'}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <ThemedText style={styles.brand}>CardBid</ThemedText>
          <ThemedText style={styles.brandSub}>TCG Auction</ThemedText>
        </View>
        {!isLastSlide ? (
          <Pressable onPress={goToLastSlide} hitSlop={12}>
            <ThemedText style={styles.skipText}>건너뛰기</ThemedText>
          </Pressable>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.slider}
      >
        {slides.map((slide) => (
          <View key={slide.eyebrow} style={styles.slide}>
            <View style={[styles.visualPanel, { backgroundColor: slide.background }]}>
              <View style={[styles.visualAura, { backgroundColor: slide.accent }]} />
              <View style={styles.visualHeader}>
                <View style={[styles.visualBadge, { backgroundColor: slide.accent }]}>
                  <Ionicons name={slide.icon} size={17} color="#111827" />
                </View>
                <ThemedText style={styles.visualBadgeText}>{slide.eyebrow}</ThemedText>
              </View>
              {slide.image ? (
                <Image source={slide.image} style={styles.realImage} contentFit="cover" />
              ) : (
                <AppMockVisual slide={slide} />
              )}
            </View>

            <View style={styles.copy}>
              <ThemedText style={styles.eyebrow}>{slide.eyebrow}</ThemedText>
              <ThemedText style={styles.title}>{slide.title}</ThemedText>
              <ThemedText style={styles.description}>{slide.description}</ThemedText>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.indicatorRow}>
          <View style={styles.indicators}>
            {slides.map((slide, index) => (
              <View
                key={slide.eyebrow}
                style={[
                  styles.indicator,
                  activeIndex === index && [
                    styles.indicatorActive,
                    { backgroundColor: activeSlide.accent },
                  ],
                ]}
              />
            ))}
          </View>
          <ThemedText style={styles.pageCount}>
            {activeIndex + 1}/{slides.length}
          </ThemedText>
        </View>

        {isLastSlide ? (
          <View style={styles.agreementPanel}>
            <AgreementRow
              checked={requiredAgreementsAccepted}
              label="필수 약관 전체 동의"
              strong
              onPress={toggleAllAgreements}
            />
            <View style={styles.agreementDivider} />
            <AgreementRow
              checked={agreements.terms}
              label="서비스 이용약관 동의"
              onPress={() => setAgreements((prev) => ({ ...prev, terms: !prev.terms }))}
              onOpenPolicy={() => router.push('/legal-notice' as any)}
            />
            <AgreementRow
              checked={agreements.privacy}
              label="개인정보처리방침 동의"
              onPress={() => setAgreements((prev) => ({ ...prev, privacy: !prev.privacy }))}
              onOpenPolicy={() => router.push('/legal-notice' as any)}
            />
            <AgreementRow
              checked={agreements.trade}
              label="거래·환불정책 동의"
              onPress={() => setAgreements((prev) => ({ ...prev, trade: !prev.trade }))}
              onOpenPolicy={() => router.push('/legal-notice' as any)}
            />
          </View>
        ) : null}

        <Pressable
          onPress={handlePrimaryPress}
          style={({ pressed }) => [
            styles.primaryButton,
            isLastSlide && styles.kakaoButton,
            isLastSlide && !requiredAgreementsAccepted && styles.primaryButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          {isLastSlide ? (
            <>
              <View style={styles.kakaoMark}>
                <ThemedText style={styles.kakaoMarkText}>T</ThemedText>
              </View>
              <ThemedText style={styles.kakaoButtonText}>{buttonLabel}</ThemedText>
            </>
          ) : (
            <>
              <ThemedText style={styles.primaryButtonText}>{buttonLabel}</ThemedText>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function AgreementRow({
  checked,
  label,
  onOpenPolicy,
  onPress,
  strong,
}: {
  checked: boolean;
  label: string;
  onOpenPolicy?: () => void;
  onPress: () => void;
  strong?: boolean;
}) {
  return (
    <View style={styles.agreementRow}>
      <Pressable style={styles.agreementCheckArea} onPress={onPress}>
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
        </View>
        <ThemedText style={[styles.agreementText, strong && styles.agreementTextStrong]}>
          {label}
        </ThemedText>
      </Pressable>
      {onOpenPolicy ? (
        <Pressable onPress={onOpenPolicy} hitSlop={10}>
          <ThemedText style={styles.policyLink}>보기</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

function AppMockVisual({ slide }: { slide: OnboardingSlide }) {
  if (slide.visual === 'auction') {
    return (
      <View style={styles.phoneMock}>
        <View style={styles.mockTopBar} />
        <View style={styles.auctionCard}>
          <View style={styles.mockImage} />
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <ThemedText style={styles.liveText}>LIVE 00:03:21</ThemedText>
          </View>
          <ThemedText style={styles.mockTitle}>블루 아이즈 UR</ThemedText>
          <View style={styles.priceRow}>
            <ThemedText style={styles.priceLabel}>현재가</ThemedText>
            <ThemedText style={styles.priceText}>128,000원</ThemedText>
          </View>
          <View style={styles.mockButton}>
            <ThemedText style={styles.mockButtonText}>입찰하기</ThemedText>
          </View>
        </View>
      </View>
    );
  }

  if (slide.visual === 'chat') {
    return (
      <View style={styles.phoneMock}>
        <View style={styles.mockTopBar} />
        <View style={styles.chatList}>
          <ChatBubble align="left" text="하자나 모서리 찍힘 있나요?" />
          <ChatBubble align="right" text="사진 추가로 보내드릴게요." />
          <ChatBubble align="left" text="배송은 언제 가능해요?" />
        </View>
      </View>
    );
  }

  if (slide.visual === 'start') {
    return (
      <View style={styles.startVisual}>
        <View style={styles.packBack} />
        <View style={styles.packFront}>
          <Ionicons name="sparkles" size={34} color="#FEE500" />
          <ThemedText style={styles.packTitle}>OPEN</ThemedText>
        </View>
        <View style={styles.smallCardOne} />
        <View style={styles.smallCardTwo} />
      </View>
    );
  }

  return (
    <View style={styles.phoneMock}>
      <View style={styles.mockTopBar} />
      <View style={styles.feedRow}>
        <View style={styles.featureCard}>
          <View style={styles.holoCard}>
            <Ionicons name="flame" size={42} color="#FDBA74" />
          </View>
          <ThemedText style={styles.mockTitle}>Charizard Promo</ThemedText>
          <ThemedText style={styles.feedPrice}>25,000원</ThemedText>
        </View>
        <View style={[styles.featureCard, styles.featureCardOffset]}>
          <View style={[styles.holoCard, styles.blueCard]}>
            <Ionicons name="water" size={42} color="#93C5FD" />
          </View>
          <ThemedText style={styles.mockTitle}>Blue Dragon</ThemedText>
          <ThemedText style={styles.feedPrice}>58,000원</ThemedText>
        </View>
      </View>
    </View>
  );
}

function ChatBubble({ align, text }: { align: 'left' | 'right'; text: string }) {
  return (
    <View
      style={[
        styles.chatBubble,
        align === 'right' ? styles.chatBubbleRight : styles.chatBubbleLeft,
      ]}
    >
      <ThemedText
        style={[
          styles.chatText,
          align === 'right' && styles.chatTextRight,
        ]}
      >
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  brand: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '900',
  },
  brandSub: {
    color: '#98A2B3',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 1,
  },
  skipText: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '800',
  },
  skipPlaceholder: {
    width: 52,
  },
  slider: {
    flex: 1,
  },
  slide: {
    paddingHorizontal: 22,
    paddingTop: 18,
    width: slideWidth,
  },
  visualPanel: {
    aspectRatio: 1.02,
    borderRadius: 8,
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: 18,
  },
  visualAura: {
    borderRadius: 150,
    height: 260,
    opacity: 0.18,
    position: 'absolute',
    right: -82,
    top: -98,
    width: 260,
  },
  visualHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    zIndex: 2,
  },
  visualBadge: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  visualBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  realImage: {
    ...StyleSheet.absoluteFillObject,
  },
  copy: {
    paddingTop: 26,
  },
  eyebrow: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
  },
  title: {
    color: '#101828',
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 40,
  },
  description: {
    color: '#667085',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
  },
  footer: {
    paddingBottom: 18,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  indicatorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  indicators: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  indicator: {
    backgroundColor: '#D0D5DD',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  indicatorActive: {
    width: 28,
  },
  pageCount: {
    color: '#98A2B3',
    fontSize: 13,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    height: 58,
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.62,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
    gap: 10,
  },
  kakaoButtonText: {
    color: '#191600',
    fontSize: 16,
    fontWeight: '900',
  },
  kakaoMark: {
    alignItems: 'center',
    backgroundColor: '#191600',
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  kakaoMarkText: {
    color: '#FEE500',
    fontSize: 15,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.88,
  },
  agreementPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    marginBottom: 12,
    padding: 12,
  },
  agreementRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  agreementCheckArea: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: '#D0D5DD',
    borderRadius: 6,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  agreementText: {
    color: '#475467',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  agreementTextStrong: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  agreementDivider: {
    backgroundColor: '#EEF0F4',
    height: 1,
  },
  policyLink: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
    paddingLeft: 10,
  },
  phoneMock: {
    alignSelf: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: 'rgba(255,255,255,0.38)',
    borderRadius: 8,
    borderWidth: 1,
    height: '76%',
    marginTop: 12,
    overflow: 'hidden',
    padding: 12,
    width: '76%',
  },
  mockTopBar: {
    alignSelf: 'center',
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    height: 5,
    marginBottom: 12,
    width: 54,
  },
  feedRow: {
    flexDirection: 'row',
    gap: 10,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    flex: 1,
    padding: 8,
  },
  featureCardOffset: {
    marginTop: 26,
  },
  holoCard: {
    alignItems: 'center',
    backgroundColor: '#7C2D12',
    borderRadius: 8,
    height: 118,
    justifyContent: 'center',
    marginBottom: 8,
  },
  blueCard: {
    backgroundColor: '#1E3A8A',
  },
  mockTitle: {
    color: '#101828',
    fontSize: 13,
    fontWeight: '900',
  },
  feedPrice: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },
  auctionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    flex: 1,
    padding: 12,
  },
  mockImage: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    height: 96,
    marginBottom: 10,
  },
  liveRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  liveDot: {
    backgroundColor: '#EF4444',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  liveText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '900',
  },
  priceRow: {
    marginTop: 12,
  },
  priceLabel: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '800',
  },
  priceText: {
    color: '#101828',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 2,
  },
  mockButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    marginTop: 'auto',
  },
  mockButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  chatList: {
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  chatBubble: {
    borderRadius: 8,
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chatBubbleLeft: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
  },
  chatBubbleRight: {
    alignSelf: 'flex-end',
    backgroundColor: '#111827',
  },
  chatText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  chatTextRight: {
    color: '#FFFFFF',
  },
  startVisual: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  packBack: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    height: 160,
    position: 'absolute',
    transform: [{ rotate: '-12deg' }, { translateX: -42 }],
    width: 108,
  },
  packFront: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderColor: 'rgba(255,255,255,0.38)',
    borderRadius: 8,
    borderWidth: 1,
    height: 176,
    justifyContent: 'center',
    width: 118,
  },
  packTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 10,
  },
  smallCardOne: {
    backgroundColor: '#FEE500',
    borderRadius: 8,
    height: 58,
    position: 'absolute',
    right: 52,
    top: 118,
    transform: [{ rotate: '14deg' }],
    width: 42,
  },
  smallCardTwo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    bottom: 70,
    height: 50,
    left: 58,
    position: 'absolute',
    transform: [{ rotate: '-18deg' }],
    width: 36,
  },
});
