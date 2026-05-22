import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  AUCTION_CATEGORIES,
  AuctionCategoryKey,
  CONDITION_OPTIONS,
  LANGUAGE_OPTIONS,
  formatPrice,
} from '@/constants/auction';
import { palette, shadow, typography } from '@/constants/ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import auctionService, {
  CreateAuctionRequest,
} from '@/services/auctionService';

const selectableCategories = AUCTION_CATEGORIES.filter(
  (category) => category.key !== 'ALL',
);

const durationOptions = [
  { label: '12시간', value: '12' },
  { label: '24시간', value: '24' },
  { label: '3일', value: '72' },
  { label: '7일', value: '168' },
];

const pricePresets = ['1000', '5000', '10000', '30000'];
const incrementPresets = ['100', '500', '1000', '5000'];

export default function SellScreen() {
  const { isLoading, isSignedIn } = useAuth();
  const [cardName, setCardName] = useState('');
  const [cardDescription, setCardDescription] = useState('');
  const [cardRarity, setCardRarity] = useState('');
  const [cardCondition, setCardCondition] =
    useState<(typeof CONDITION_OPTIONS)[number]>('민트');
  const [cardLanguage, setCardLanguage] =
    useState<(typeof LANGUAGE_OPTIONS)[number]>('한국어');
  const [cardCategory, setCardCategory] =
    useState<AuctionCategoryKey>('SINGLE');
  const [imageUrl, setImageUrl] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [minimumIncrement, setMinimumIncrement] = useState('100');
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [durationHours, setDurationHours] = useState('24');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCategory = useMemo(
    () =>
      selectableCategories.find((item) => item.key === cardCategory) ??
      selectableCategories[0],
    [cardCategory],
  );

  const resetForm = () => {
    setCardName('');
    setCardDescription('');
    setCardRarity('');
    setCardCondition('민트');
    setCardLanguage('한국어');
    setCardCategory('SINGLE');
    setImageUrl('');
    setStartingPrice('');
    setMinimumIncrement('100');
    setBuyNowPrice('');
    setDurationHours('24');
  };

  const handleSubmit = useCallback(async () => {
    if (!cardName.trim()) {
      Alert.alert('등록 오류', '카드 이름을 입력해주세요.');
      return;
    }

    const starting = Number(startingPrice);
    const increment = Number(minimumIncrement);
    const duration = Number(durationHours);
    const buyNow = buyNowPrice ? Number(buyNowPrice) : undefined;

    if (!starting || starting < 1) {
      Alert.alert('등록 오류', '시작가를 올바르게 입력해주세요.');
      return;
    }

    if (!increment || increment < 1) {
      Alert.alert('등록 오류', '최소 입찰 단위를 올바르게 입력해주세요.');
      return;
    }

    if (!duration || duration < 1) {
      Alert.alert('등록 오류', '경매 시간을 1시간 이상으로 설정해주세요.');
      return;
    }

    if (buyNow !== undefined && buyNow <= starting) {
      Alert.alert('등록 오류', '즉시 낙찰가는 시작가보다 커야 합니다.');
      return;
    }

    const descriptionLines = [
      `상태: ${cardCondition}`,
      `언어: ${cardLanguage}`,
      cardDescription.trim(),
    ].filter(Boolean);

    const request: CreateAuctionRequest = {
      cardName: cardName.trim(),
      cardDescription: descriptionLines.join('\n'),
      cardRarity: cardRarity.trim(),
      cardCategory,
      imageUrl: imageUrl.trim(),
      startingPrice: starting,
      minimumIncrement: increment,
      durationHours: duration,
      buyNowPrice: buyNow,
    };

    try {
      setIsSubmitting(true);
      const created = await auctionService.createAuction(request);
      Alert.alert('등록 완료', '경매가 열렸습니다.');
      resetForm();
      router.push(`/auctions/${created.id}`);
    } catch (error) {
      Alert.alert(
        '등록 실패',
        error instanceof Error
          ? error.message
          : '상품 등록 중 오류가 발생했습니다.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    buyNowPrice,
    cardCategory,
    cardCondition,
    cardDescription,
    cardLanguage,
    cardName,
    cardRarity,
    durationHours,
    imageUrl,
    minimumIncrement,
    startingPrice,
  ]);

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>로딩 중...</ThemedText>
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
            <ThemedText style={styles.eyebrow}>SELLER STUDIO</ThemedText>
            <ThemedText type="title" style={styles.title}>
              새 경매 열기
            </ThemedText>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons name="shield-checkmark" size={16} color={palette.success} />
            <ThemedText style={styles.headerBadgeText}>안전거래</ThemedText>
          </View>
        </View>

        <View style={styles.previewPanel}>
          <View style={styles.previewMedia}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.previewImage}
                contentFit="contain"
              />
            ) : (
              <View style={styles.previewEmpty}>
                <Ionicons name="image" size={34} color="#CBD5E1" />
                <ThemedText style={styles.previewEmptyText}>이미지 URL</ThemedText>
              </View>
            )}
          </View>
          <View style={styles.previewCopy}>
            <View
              style={[
                styles.previewCategory,
                { backgroundColor: selectedCategory.background },
              ]}
            >
              <Ionicons
                name={selectedCategory.icon as any}
                size={13}
                color={selectedCategory.tint}
              />
              <ThemedText
                style={[styles.previewCategoryText, { color: selectedCategory.tint }]}
              >
                {selectedCategory.label}
              </ThemedText>
            </View>
            <ThemedText style={styles.previewTitle} numberOfLines={2}>
              {cardName || '카드 이름을 입력하세요'}
            </ThemedText>
            <ThemedText style={styles.previewMeta}>
              {cardRarity || '희귀도'} · {cardCondition} · {cardLanguage}
            </ThemedText>
            <View style={styles.previewPriceRow}>
              <View>
                <ThemedText style={styles.previewPriceLabel}>시작가</ThemedText>
                <ThemedText style={styles.previewPrice}>
                  {startingPrice ? formatPrice(Number(startingPrice)) : '-'}
                </ThemedText>
              </View>
              {buyNowPrice ? (
                <View style={styles.previewBuyNow}>
                  <Ionicons name="flash" size={13} color={palette.brandDark} />
                  <ThemedText style={styles.previewBuyNowText}>
                    {formatPrice(Number(buyNowPrice))}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>카테고리</ThemedText>
            <ThemedText style={styles.sectionMeta}>상품 성격에 맞게 노출</ThemedText>
          </View>
          <View style={styles.categoryGrid}>
            {selectableCategories.map((category) => {
              const active = cardCategory === category.key;
              return (
                <Pressable
                  key={category.key}
                  onPress={() => setCardCategory(category.key)}
                  style={[
                    styles.categoryOption,
                    active && {
                      backgroundColor: category.tint,
                      borderColor: category.tint,
                    },
                  ]}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={18}
                    color={active ? '#FFFFFF' : category.tint}
                  />
                  <View style={styles.categoryOptionCopy}>
                    <ThemedText
                      style={[
                        styles.categoryOptionText,
                        active && styles.activeCategoryText,
                      ]}
                    >
                      {category.label}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.categoryOptionSub,
                        active && styles.activeCategorySub,
                      ]}
                    >
                      {category.subtitle}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>카드 정보</ThemedText>
            <ThemedText style={styles.sectionMeta}>검색에 노출되는 정보</ThemedText>
          </View>
          <TextInput
            value={cardName}
            onChangeText={setCardName}
            placeholder="예: 2024 프리즘 루키 카드 PSA 10"
            placeholderTextColor={palette.subtle}
            style={styles.input}
          />
          <View style={styles.row}>
            <TextInput
              value={cardRarity}
              onChangeText={setCardRarity}
              placeholder="희귀도"
              placeholderTextColor={palette.subtle}
              style={[styles.input, styles.flexInput]}
            />
            <TextInput
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="이미지 URL"
              placeholderTextColor={palette.subtle}
              style={[styles.input, styles.flexInput]}
            />
          </View>

          <View style={styles.optionBlock}>
            <ThemedText style={styles.optionLabel}>상태</ThemedText>
            <View style={styles.chipRow}>
              {CONDITION_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.optionChip,
                    cardCondition === option && styles.optionChipActive,
                  ]}
                  onPress={() => setCardCondition(option)}
                >
                  <ThemedText
                    style={[
                      styles.optionChipText,
                      cardCondition === option && styles.optionChipTextActive,
                    ]}
                  >
                    {option}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.optionBlock}>
            <ThemedText style={styles.optionLabel}>언어</ThemedText>
            <View style={styles.chipRow}>
              {LANGUAGE_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.optionChip,
                    cardLanguage === option && styles.optionChipActive,
                  ]}
                  onPress={() => setCardLanguage(option)}
                >
                  <ThemedText
                    style={[
                      styles.optionChipText,
                      cardLanguage === option && styles.optionChipTextActive,
                    ]}
                  >
                    {option}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <TextInput
            value={cardDescription}
            onChangeText={setCardDescription}
            placeholder="구성품, 하자, 배송 포장 상태를 적어주세요"
            placeholderTextColor={palette.subtle}
            style={[styles.input, styles.multiline]}
            multiline
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>가격과 시간</ThemedText>
            <ThemedText style={styles.sectionMeta}>빠른 프리셋 선택 가능</ThemedText>
          </View>
          <ThemedText style={styles.optionLabel}>시작가</ThemedText>
          <View style={styles.chipRow}>
            {pricePresets.map((price) => (
              <Pressable
                key={price}
                style={[
                  styles.optionChip,
                  startingPrice === price && styles.optionChipActive,
                ]}
                onPress={() => setStartingPrice(price)}
              >
                <ThemedText
                  style={[
                    styles.optionChipText,
                    startingPrice === price && styles.optionChipTextActive,
                  ]}
                >
                  {formatPrice(Number(price))}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            <TextInput
              value={startingPrice}
              onChangeText={setStartingPrice}
              keyboardType="numeric"
              placeholder="직접 입력"
              placeholderTextColor={palette.subtle}
              style={[styles.input, styles.flexInput]}
            />
            <TextInput
              value={buyNowPrice}
              onChangeText={setBuyNowPrice}
              keyboardType="numeric"
              placeholder="즉시 낙찰가"
              placeholderTextColor={palette.subtle}
              style={[styles.input, styles.flexInput]}
            />
          </View>

          <ThemedText style={styles.optionLabel}>입찰 단위</ThemedText>
          <View style={styles.chipRow}>
            {incrementPresets.map((amount) => (
              <Pressable
                key={amount}
                style={[
                  styles.optionChip,
                  minimumIncrement === amount && styles.optionChipActive,
                ]}
                onPress={() => setMinimumIncrement(amount)}
              >
                <ThemedText
                  style={[
                    styles.optionChipText,
                    minimumIncrement === amount && styles.optionChipTextActive,
                  ]}
                >
                  {formatPrice(Number(amount))}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={minimumIncrement}
            onChangeText={setMinimumIncrement}
            keyboardType="numeric"
            placeholder="입찰 단위 직접 입력"
            placeholderTextColor={palette.subtle}
            style={styles.input}
          />

          <View style={styles.durationRow}>
            {durationOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setDurationHours(option.value)}
                style={[
                  styles.durationChip,
                  durationHours === option.value && styles.durationChipActive,
                ]}
              >
                <ThemedText
                  style={[
                    styles.durationText,
                    durationHours === option.value && styles.durationTextActive,
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.noticePanel}>
          <Ionicons name="checkmark-circle" size={19} color={palette.success} />
          <ThemedText style={styles.noticeText}>
            등록 후 구매자가 바로 1:1 문의를 보낼 수 있어요. 상태와 배송 조건은
            상세 설명에 남겨두면 낙찰 전환율이 올라갑니다.
          </ThemedText>
        </View>

        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Ionicons name="rocket" size={18} color="#FFFFFF" />
          <ThemedText style={styles.submitText}>
            {isSubmitting ? '등록 중...' : '경매 시작하기'}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
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
  headerBadge: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  headerBadgeText: {
    color: palette.success,
    fontSize: 12,
    fontWeight: '900',
  },
  previewPanel: {
    backgroundColor: palette.night,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
    padding: 14,
    ...shadow,
  },
  previewMedia: {
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    height: 132,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 96,
  },
  previewImage: {
    height: '100%',
    width: '100%',
  },
  previewEmpty: {
    alignItems: 'center',
    gap: 7,
  },
  previewEmptyText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '800',
  },
  previewCopy: {
    flex: 1,
  },
  previewCategory: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  previewCategoryText: {
    fontSize: 11,
    fontWeight: '900',
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
    marginBottom: 8,
  },
  previewMeta: {
    color: '#CBD5E1',
    fontSize: 13,
    marginBottom: 14,
  },
  previewPriceRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewPriceLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 3,
  },
  previewPrice: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  previewBuyNow: {
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  previewBuyNowText: {
    color: palette.brandDark,
    fontSize: 11,
    fontWeight: '900',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  sectionMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryOption: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    width: '48%',
  },
  categoryOptionCopy: {
    flex: 1,
  },
  categoryOptionText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  categoryOptionSub: {
    color: palette.muted,
    fontSize: 12,
  },
  activeCategoryText: {
    color: '#FFFFFF',
  },
  activeCategorySub: {
    color: '#E5E7EB',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flexInput: {
    flex: 1,
  },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.ink,
    fontFamily: typography.family,
    fontSize: 15,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  multiline: {
    minHeight: 98,
    textAlignVertical: 'top',
  },
  optionBlock: {
    marginBottom: 10,
  },
  optionLabel: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  optionChip: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionChipActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  optionChipText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '900',
  },
  optionChipTextActive: {
    color: '#FFFFFF',
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: 76,
    paddingVertical: 11,
  },
  durationChipActive: {
    backgroundColor: palette.brand,
    borderColor: palette.brand,
  },
  durationText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  durationTextActive: {
    color: '#FFFFFF',
  },
  noticePanel: {
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderColor: '#CCFBF1',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginBottom: 14,
    padding: 14,
  },
  noticeText: {
    color: '#0F766E',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: palette.brand,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 16,
    ...shadow,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
