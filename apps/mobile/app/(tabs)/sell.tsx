import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { CameraCapturedPicture, CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AUCTION_CATEGORIES,
  AuctionCategoryKey,
  EDITION_OPTIONS,
  GRADE_SCORES,
  GRADING_COMPANIES,
  LANGUAGE_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  RAW_CONDITION_OPTIONS,
  formatPrice,
} from '@/constants/auction';
import { palette, shadow, typography } from '@/constants/ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import auctionService, {
  CreateAuctionRequest,
} from '@/services/auctionService';
import { isAuthSessionExpiredError } from '@/services/apiClient';

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
const cardAspect = {
  width: 5,
  height: 7,
};
const cardImagePickerOptions: ImagePicker.ImagePickerOptions = {
  allowsEditing: true,
  aspect: [5, 7],
  mediaTypes: ['images'],
  quality: 0.9,
};

type LayoutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function getCardGuideFrame(layout: LayoutRect): LayoutRect {
  const maxWidth = Math.max(0, layout.width - 48);
  const maxHeight = Math.max(0, layout.height - 220);
  const width = Math.min(
    maxWidth,
    maxHeight * (cardAspect.width / cardAspect.height),
  );
  const height = width * (cardAspect.height / cardAspect.width);
  const x = (layout.width - width) / 2;
  const preferredY = (layout.height - height) / 2 - 10;
  const maxY = layout.height - height - 132;
  const y = Math.max(88, Math.min(preferredY, maxY));

  return { x, y, width, height };
}

function getCardCropRect(photo: CameraCapturedPicture, preview: LayoutRect) {
  const frame = getCardGuideFrame(preview);
  const photoAspect = photo.width / photo.height;
  const previewAspect = preview.width / preview.height;
  let visibleX = 0;
  let visibleY = 0;
  let visibleWidth = photo.width;
  let visibleHeight = photo.height;

  if (photoAspect > previewAspect) {
    visibleWidth = photo.height * previewAspect;
    visibleX = (photo.width - visibleWidth) / 2;
  } else {
    visibleHeight = photo.width / previewAspect;
    visibleY = (photo.height - visibleHeight) / 2;
  }

  const originX = visibleX + (frame.x / preview.width) * visibleWidth;
  const originY = visibleY + (frame.y / preview.height) * visibleHeight;
  const width = (frame.width / preview.width) * visibleWidth;
  const height = (frame.height / preview.height) * visibleHeight;

  return {
    originX: Math.max(0, Math.round(originX)),
    originY: Math.max(0, Math.round(originY)),
    width: Math.min(photo.width - Math.round(originX), Math.round(width)),
    height: Math.min(photo.height - Math.round(originY), Math.round(height)),
  };
}

export default function SellScreen() {
  const { isLoading, isSignedIn, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const cardNameInputRef = useRef<TextInput>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cardName, setCardName] = useState('');
  const [cardDescription, setCardDescription] = useState('');
  const [cardRarity, setCardRarity] = useState('');
  const [cardEdition, setCardEdition] =
    useState<(typeof EDITION_OPTIONS)[number]>('일반판');
  const [productType, setProductType] =
    useState<(typeof PRODUCT_TYPE_OPTIONS)[number]>('일반 카드');
  const [gradingCompany, setGradingCompany] =
    useState<(typeof GRADING_COMPANIES)[number]>('미감정');
  const [gradeScore, setGradeScore] =
    useState<(typeof GRADE_SCORES)[number]>('10');
  const [rawCondition, setRawCondition] =
    useState<(typeof RAW_CONDITION_OPTIONS)[number]>('최상');
  const [cardLanguage, setCardLanguage] =
    useState<(typeof LANGUAGE_OPTIONS)[number]>('한국어');
  const [cardCategory, setCardCategory] =
    useState<AuctionCategoryKey>('POKEMON');
  const [frontImageUrl, setFrontImageUrl] = useState('');
  const [backImageUrl, setBackImageUrl] = useState('');
  const [activePhotoSide, setActivePhotoSide] = useState<'front' | 'back'>('front');
  const [startingPrice, setStartingPrice] = useState('');
  const [minimumIncrement, setMinimumIncrement] = useState('100');
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [durationHours, setDurationHours] = useState('24');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCardCameraVisible, setIsCardCameraVisible] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraLayout, setCameraLayout] = useState<LayoutRect | null>(null);

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
    setCardEdition('일반판');
    setProductType('일반 카드');
    setGradingCompany('미감정');
    setGradeScore('10');
    setRawCondition('최상');
    setCardLanguage('한국어');
    setCardCategory('POKEMON');
    setFrontImageUrl('');
    setBackImageUrl('');
    setStartingPrice('');
    setMinimumIncrement('100');
    setBuyNowPrice('');
    setDurationHours('24');
  };

  const gradeText = useMemo(() => {
    if (productType !== '감정 카드') {
      return '미감정';
    }

    if (gradingCompany === '미감정') {
      return '미감정';
    }

    return `${gradingCompany} ${gradeScore}`;
  }, [gradeScore, gradingCompany, productType]);

  const conditionText = useMemo(() => {
    if ((productType === '미개봉 박스' || productType === '팩/부스터')) {
      return '미개봉';
    }

    if (productType === '감정 카드') {
      return gradeText;
    }

    return rawCondition;
  }, [gradeText, productType, rawCondition]);

  const cardAttributeText = useMemo(
    () =>
      [productType, cardEdition, conditionText, cardRarity.trim()]
        .filter((value) => value && value !== '일반판')
        .join(' · '),
    [cardEdition, cardRarity, conditionText, productType],
  );

  const setPhotoForSide = useCallback((side: 'front' | 'back', uri: string) => {
    if (side === 'front') {
      setFrontImageUrl(uri);
      return;
    }
    setBackImageUrl(uri);
  }, []);

  const pickImageFromLibrary = useCallback(async (side: 'front' | 'back') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('사진 접근 필요', '앨범에서 카드 사진을 선택하려면 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync(cardImagePickerOptions);
    if (!result.canceled) {
      setPhotoForSide(side, result.assets[0].uri);
    }
  }, [setPhotoForSide]);

  const takePhoto = useCallback(async (side: 'front' | 'back') => {
    const permission = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();
    if (!permission.granted) {
      Alert.alert('카메라 접근 필요', '카드 사진을 촬영하려면 권한이 필요합니다.');
      return;
    }

    setActivePhotoSide(side);
    setIsCardCameraVisible(true);
  }, [cameraPermission, requestCameraPermission]);

  const handleCameraLayout = useCallback((event: LayoutChangeEvent) => {
    setCameraLayout(event.nativeEvent.layout);
  }, []);

  const captureCardPhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraLayout || isCapturing) {
      return;
    }

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.95,
        skipProcessing: false,
      });
      const cropped = await manipulateAsync(
        photo.uri,
        [{ crop: getCardCropRect(photo, cameraLayout) }],
        { compress: 0.9, format: SaveFormat.JPEG },
      );

      setPhotoForSide(activePhotoSide, cropped.uri);
      setIsCardCameraVisible(false);
    } catch {
      Alert.alert('카메라 오류', '카드 사진을 촬영하지 못했습니다. 다시 시도해주세요.');
    } finally {
      setIsCapturing(false);
    }
  }, [activePhotoSide, cameraLayout, isCapturing, setPhotoForSide]);

  const handleSubmit = useCallback(async () => {
    if (!cardName.trim()) {
      Alert.alert('등록 오류', '카드 이름을 입력해주세요.');
      return;
    }

    if (!frontImageUrl) {
      Alert.alert('등록 오류', '카드 앞면 사진을 선택하거나 촬영해주세요.');
      return;
    }

    if (!backImageUrl) {
      Alert.alert('등록 오류', '카드 뒷면 사진을 선택하거나 촬영해주세요.');
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
      `상품형태: ${productType}`,
      `판본: ${cardEdition}`,
      productType === '감정 카드' ? `감정: ${gradeText}` : null,
      (productType === '미개봉 박스' || productType === '팩/부스터') ? '실링: 미개봉' : null,
      productType === '일반 카드' ? `보존상태: ${rawCondition}` : null,
      `언어: ${cardLanguage}`,
      cardDescription.trim(),
    ].filter(Boolean);

    let uploadedImageUrl = frontImageUrl.trim();
    let uploadedBackImageUrl = backImageUrl.trim();

    if (uploadedImageUrl.startsWith('file:')) {
      uploadedImageUrl = await auctionService.uploadAuctionImage(uploadedImageUrl);
    }
    if (uploadedBackImageUrl.startsWith('file:')) {
      uploadedBackImageUrl = await auctionService.uploadAuctionImage(uploadedBackImageUrl);
    }

    const request: CreateAuctionRequest = {
      cardName: cardName.trim(),
      cardDescription: descriptionLines.join('\n'),
      cardRarity: cardAttributeText || conditionText,
      cardCategory,
      imageUrl: uploadedImageUrl,
      backImageUrl: uploadedBackImageUrl,
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
      if (isAuthSessionExpiredError(error)) {
        await logout();
        Alert.alert('로그인이 만료됐어요', '다시 로그인해주세요.');
        router.replace('/login');
        return;
      }

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
    cardEdition,
    cardLanguage,
    cardName,
    cardAttributeText,
    conditionText,
    durationHours,
    gradeText,
    backImageUrl,
    frontImageUrl,
    logout,
    minimumIncrement,
    productType,
    rawCondition,
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

  const guideFrame = cameraLayout ? getCardGuideFrame(cameraLayout) : null;

  if (isCardCameraVisible) {
    return (
      <SafeAreaView style={styles.cardCameraContainer} edges={['top', 'bottom']}>
        <View style={styles.cardCameraPreview} onLayout={handleCameraLayout}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            flash="off"
            mode="picture"
            animateShutter
          />
          <View pointerEvents="none" style={styles.cardCameraScrim}>
            <ThemedText style={styles.cardCameraTitle}>카드를 프레임에 맞춰주세요</ThemedText>
            <ThemedText style={styles.cardCameraSubtitle}>5:7 비율로 촬영됩니다</ThemedText>
            {guideFrame ? (
              <View
                style={[
                  styles.cardCameraFrame,
                  {
                    height: guideFrame.height,
                    left: guideFrame.x,
                    top: guideFrame.y,
                    width: guideFrame.width,
                  },
                ]}
              />
            ) : null}
          </View>
          <View
            style={[
              styles.cardCameraControls,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <Pressable
              style={styles.cardCameraIconButton}
              onPress={() => setIsCardCameraVisible(false)}
            >
              <Ionicons name="close" size={25} color="#FFFFFF" />
            </Pressable>
            <Pressable
              style={[
                styles.cardCameraShutter,
                isCapturing && styles.cardCameraShutterDisabled,
              ]}
              disabled={isCapturing || !cameraLayout}
              onPress={captureCardPhoto}
            >
              <View style={styles.cardCameraShutterInner} />
            </Pressable>
            <View style={styles.cardCameraIconButtonPlaceholder} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 42 + insets.bottom },
        ]}
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
            {frontImageUrl ? (
              <Image
                source={{ uri: frontImageUrl }}
                style={styles.previewImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.previewEmpty}>
                <Ionicons name="image-outline" size={34} color="#CBD5E1" />
                <ThemedText style={styles.previewEmptyText}>카드 사진</ThemedText>
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
            <Pressable onPress={() => cardNameInputRef.current?.focus()}>
              <ThemedText style={styles.previewTitle} numberOfLines={2}>
                {cardName || '카드명을 입력하세요'}
              </ThemedText>
            </Pressable>
            <ThemedText style={styles.previewMeta}>
              {cardAttributeText || conditionText} · {cardLanguage}
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

        <View style={styles.photoActions}>
          <Pressable style={styles.photoButton} onPress={() => pickImageFromLibrary('front')}>
            <Ionicons name="images-outline" size={18} color={palette.ink} />
            <ThemedText style={styles.photoButtonText}>앞면 앨범</ThemedText>
          </Pressable>
          <Pressable style={styles.photoButton} onPress={() => takePhoto('front')}>
            <Ionicons name="camera-outline" size={18} color={palette.ink} />
            <ThemedText style={styles.photoButtonText}>앞면 촬영</ThemedText>
          </Pressable>
        </View>
        <View style={styles.photoActions}>
          <Pressable style={styles.photoButton} onPress={() => pickImageFromLibrary('back')}>
            <Ionicons name="images-outline" size={18} color={palette.ink} />
            <ThemedText style={styles.photoButtonText}>뒷면 앨범</ThemedText>
          </Pressable>
          <Pressable style={styles.photoButton} onPress={() => takePhoto('back')}>
            <Ionicons name="camera-outline" size={18} color={palette.ink} />
            <ThemedText style={styles.photoButtonText}>뒷면 촬영</ThemedText>
          </Pressable>
        </View>
        <View style={styles.photoStatusRow}>
          <View style={[styles.photoStatusPill, frontImageUrl && styles.photoStatusPillDone]}>
            <Ionicons name={frontImageUrl ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={frontImageUrl ? palette.success : palette.muted} />
            <ThemedText style={styles.photoStatusText}>앞면 대표사진</ThemedText>
          </View>
          <View style={[styles.photoStatusPill, backImageUrl && styles.photoStatusPillDone]}>
            <Ionicons name={backImageUrl ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={backImageUrl ? palette.success : palette.muted} />
            <ThemedText style={styles.photoStatusText}>뒷면 사진</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.photoHelper}>
          선택한 사진은 카드 비율에 맞게 자른 뒤 등록됩니다.
        </ThemedText>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>카테고리</ThemedText>
            <ThemedText style={styles.sectionMeta}>카드 종류 기준</ThemedText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRail}
          >
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
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>카드 정보</ThemedText>
            <ThemedText style={styles.sectionMeta}>검색에 노출되는 정보</ThemedText>
          </View>
          <TextInput
            ref={cardNameInputRef}
            value={cardName}
            onChangeText={setCardName}
            placeholder="예: 2024 프리즘 루키 카드 PSA 10"
            placeholderTextColor={palette.subtle}
            style={styles.input}
          />
          <TextInput
            value={cardRarity}
            onChangeText={setCardRarity}
            placeholder="세부 레어도 예: UR, SR"
            placeholderTextColor={palette.subtle}
            style={styles.input}
          />

          <View style={styles.optionBlock}>
            <ThemedText style={styles.optionLabel}>판본</ThemedText>
            <View style={styles.chipRow}>
              {EDITION_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.optionChip,
                    cardEdition === option && styles.optionChipActive,
                  ]}
                  onPress={() => setCardEdition(option)}
                >
                  <ThemedText
                    style={[
                      styles.optionChipText,
                      cardEdition === option && styles.optionChipTextActive,
                    ]}
                  >
                    {option}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.optionBlock}>
            <ThemedText style={styles.optionLabel}>상품 형태</ThemedText>
            <View style={styles.chipRow}>
              {PRODUCT_TYPE_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.optionChip,
                    productType === option && styles.optionChipActive,
                  ]}
                  onPress={() => setProductType(option)}
                >
                  <ThemedText
                    style={[
                      styles.optionChipText,
                      productType === option && styles.optionChipTextActive,
                    ]}
                  >
                    {option}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {productType === '감정 카드' ? (
            <View style={styles.optionBlock}>
              <ThemedText style={styles.optionLabel}>감정사</ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalChips}
              >
                {GRADING_COMPANIES.map((option) => (
                  <Pressable
                    key={option}
                    style={[
                      styles.optionChip,
                      gradingCompany === option && styles.optionChipActive,
                    ]}
                    onPress={() => setGradingCompany(option)}
                  >
                    <ThemedText
                      style={[
                        styles.optionChipText,
                        gradingCompany === option && styles.optionChipTextActive,
                      ]}
                    >
                      {option}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>

              {gradingCompany !== '미감정' ? (
                <>
                  <ThemedText style={styles.optionLabel}>점수</ThemedText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalChips}
                  >
                    {GRADE_SCORES.map((option) => (
                      <Pressable
                        key={option}
                        style={[
                          styles.optionChip,
                          gradeScore === option && styles.optionChipActive,
                        ]}
                        onPress={() => setGradeScore(option)}
                      >
                        <ThemedText
                          style={[
                            styles.optionChipText,
                            gradeScore === option && styles.optionChipTextActive,
                          ]}
                        >
                          {option}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              ) : null}
            </View>
          ) : null}

          {productType === '일반 카드' ? (
            <View style={styles.optionBlock}>
              <ThemedText style={styles.optionLabel}>보존상태</ThemedText>
              <View style={styles.chipRow}>
                {RAW_CONDITION_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    style={[
                      styles.optionChip,
                      rawCondition === option && styles.optionChipActive,
                    ]}
                    onPress={() => setRawCondition(option)}
                  >
                    <ThemedText
                      style={[
                        styles.optionChipText,
                        rawCondition === option && styles.optionChipTextActive,
                      ]}
                    >
                      {option}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {(productType === '미개봉 박스' || productType === '팩/부스터') ? (
            <View style={styles.sealedNotice}>
              <Ionicons name="cube-outline" size={17} color={palette.success} />
              <ThemedText style={styles.sealedNoticeText}>
                팩/박스 상품은 미개봉 실링 상태로만 등록합니다.
              </ThemedText>
            </View>
          ) : null}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  cardCameraContainer: {
    backgroundColor: '#000000',
    flex: 1,
  },
  cardCameraPreview: {
    backgroundColor: '#000000',
    flex: 1,
  },
  cardCameraScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  cardCameraTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    paddingHorizontal: 24,
    paddingTop: 24,
    textAlign: 'center',
  },
  cardCameraSubtitle: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },
  cardCameraFrame: {
    borderColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 3,
    position: 'absolute',
  },
  cardCameraControls: {
    alignItems: 'center',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 28,
    paddingTop: 24,
    position: 'absolute',
    right: 0,
  },
  cardCameraIconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.46)',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  cardCameraIconButtonPlaceholder: {
    height: 56,
    width: 56,
  },
  cardCameraShutter: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 38,
    borderWidth: 4,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  cardCameraShutterDisabled: {
    opacity: 0.55,
  },
  cardCameraShutterInner: {
    backgroundColor: '#FFFFFF',
    borderColor: '#111827',
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    width: 56,
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
    paddingHorizontal: 20,
    paddingTop: 8,
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
    marginBottom: 10,
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
  photoActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  photoStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  photoStatusPill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  photoStatusPillDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#CCFBF1',
  },
  photoStatusText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  photoButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 13,
  },
  photoButtonText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  photoHelper: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 20,
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
  categoryRail: {
    gap: 10,
    paddingBottom: 4,
  },
  categoryOption: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 164,
    padding: 12,
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
  horizontalChips: {
    gap: 8,
    paddingBottom: 10,
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
  sealedNotice: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#CCFBF1',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    padding: 12,
  },
  sealedNoticeText: {
    color: palette.success,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
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
