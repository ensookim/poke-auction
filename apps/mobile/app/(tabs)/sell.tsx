import React, { useCallback, useState } from 'react';
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
  formatPrice,
} from '@/constants/auction';
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

export default function SellScreen() {
  const { isLoading, isSignedIn } = useAuth();
  const [cardName, setCardName] = useState('');
  const [cardDescription, setCardDescription] = useState('');
  const [cardRarity, setCardRarity] = useState('');
  const [cardCategory, setCardCategory] =
    useState<AuctionCategoryKey>('SINGLE');
  const [imageUrl, setImageUrl] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [minimumIncrement, setMinimumIncrement] = useState('100');
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [durationHours, setDurationHours] = useState('24');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setCardName('');
    setCardDescription('');
    setCardRarity('');
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

    const request: CreateAuctionRequest = {
      cardName: cardName.trim(),
      cardDescription: cardDescription.trim(),
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
    cardDescription,
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
          <ThemedText style={styles.eyebrow}>SELL</ThemedText>
          <ThemedText type="title" style={styles.title}>
            새 경매 열기
          </ThemedText>
        </View>

        <View style={styles.previewPanel}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.previewImage}
              contentFit="contain"
            />
          ) : (
            <View style={styles.previewEmpty}>
              <Ionicons name="image" size={34} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.previewCopy}>
            <ThemedText style={styles.previewTitle} numberOfLines={1}>
              {cardName || '카드 이름'}
            </ThemedText>
            <ThemedText style={styles.previewMeta}>
              {cardRarity || '희귀도'} ·{' '}
              {selectableCategories.find((item) => item.key === cardCategory)?.label}
            </ThemedText>
            <ThemedText style={styles.previewPrice}>
              {startingPrice ? formatPrice(Number(startingPrice)) : '시작가'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>카테고리</ThemedText>
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
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>카드 정보</ThemedText>
          <TextInput
            value={cardName}
            onChangeText={setCardName}
            placeholder="예: 리자몽 ex SAR"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
          <View style={styles.row}>
            <TextInput
              value={cardRarity}
              onChangeText={setCardRarity}
              placeholder="희귀도"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.flexInput]}
            />
            <TextInput
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="이미지 URL"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.flexInput]}
            />
          </View>
          <TextInput
            value={cardDescription}
            onChangeText={setCardDescription}
            placeholder="상태, 언어, 구성품, 하자 여부를 적어주세요"
            placeholderTextColor="#9CA3AF"
            style={[styles.input, styles.multiline]}
            multiline
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>가격과 시간</ThemedText>
          <View style={styles.row}>
            <TextInput
              value={startingPrice}
              onChangeText={setStartingPrice}
              keyboardType="numeric"
              placeholder="시작가"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.flexInput]}
            />
            <TextInput
              value={minimumIncrement}
              onChangeText={setMinimumIncrement}
              keyboardType="numeric"
              placeholder="입찰 단위"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.flexInput]}
            />
          </View>
          <TextInput
            value={buyNowPrice}
            onChangeText={setBuyNowPrice}
            keyboardType="numeric"
            placeholder="즉시 낙찰가 선택 입력"
            placeholderTextColor="#9CA3AF"
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
  header: {
    marginBottom: 16,
  },
  eyebrow: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  previewPanel: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
    padding: 14,
  },
  previewImage: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    height: 112,
    width: 86,
  },
  previewEmpty: {
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 6,
    height: 112,
    justifyContent: 'center',
    width: 86,
  },
  previewCopy: {
    flex: 1,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  previewMeta: {
    color: '#CBD5E1',
    fontSize: 13,
    marginBottom: 14,
  },
  previewPrice: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryOption: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    width: '48%',
  },
  categoryOptionText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  categoryOptionSub: {
    color: '#6B7280',
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
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 15,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  durationChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  durationText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '800',
  },
  durationTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 16,
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
