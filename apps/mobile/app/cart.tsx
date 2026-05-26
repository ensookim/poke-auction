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
import { Redirect, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import commerceService, { CollectionItemResponse } from '@/services/commerceService';
import { formatPrice } from '@/constants/auction';
import { palette, shadow } from '@/constants/ui';
import { getFriendlyErrorMessage } from '@/services/errorUtils';

export default function CartScreen() {
  const { isLoading, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<CollectionItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const loadCart = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setItems(await commerceService.getCart());
    } catch (error) {
      Alert.alert('장바구니 오류', getFriendlyErrorMessage(error, '장바구니를 불러오지 못했습니다.'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) loadCart();
  }, [isSignedIn, loadCart]);

  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) loadCart(true);
    }, [isSignedIn, loadCart]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCart(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadCart]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.auction.buyNowPrice ?? 0), 0),
    [items],
  );

  const checkout = async () => {
    try {
      setCheckingOut(true);
      const result = await commerceService.checkoutCart();
      Alert.alert('결제 준비 완료', `${result.itemCount}개 상품, 총 ${formatPrice(result.totalAmount)}`);
    } catch (error) {
      Alert.alert('결제 실패', getFriendlyErrorMessage(error, '결제를 진행하지 못했습니다.'));
    } finally {
      setCheckingOut(false);
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
        contentContainerStyle={[styles.content, { paddingBottom: 30 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>장바구니</ThemedText>
          <Pressable style={styles.more} onPress={() => router.push('/buy')}>
            <ThemedText style={styles.moreText}>상품 더보기</ThemedText>
          </Pressable>
        </View>

        <View style={styles.summary}>
          <View>
            <ThemedText style={styles.summaryLabel}>총 결제 금액</ThemedText>
            <ThemedText style={styles.summaryValue}>{formatPrice(total)}</ThemedText>
          </View>
          <Pressable
            style={[styles.checkoutBtn, (items.length === 0 || checkingOut) && styles.checkoutBtnDisabled]}
            onPress={checkout}
            disabled={items.length === 0 || checkingOut}
          >
            <Ionicons name="card" size={17} color="#FFFFFF" />
            <ThemedText style={styles.checkoutText}>{checkingOut ? '결제 준비중' : '한번에 결제'}</ThemedText>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={24} color="#9CA3AF" />
            <ThemedText style={styles.emptyTitle}>장바구니가 비어 있어요</ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <View key={item.id} style={styles.row}>
                <Image source={{ uri: item.auction.imageUrl }} style={styles.image} contentFit="cover" />
                <View style={styles.rowBody}>
                  <ThemedText style={styles.cardName} numberOfLines={1}>{item.auction.cardName}</ThemedText>
                  <ThemedText style={styles.cardPrice}>{formatPrice(item.auction.buyNowPrice ?? item.auction.currentPrice)}</ThemedText>
                </View>
                <Pressable
                  style={styles.removeBtn}
                  onPress={async () => {
                    await commerceService.removeCart(item.auction.id);
                    await loadCart(true);
                  }}
                >
                  <Ionicons name="close" size={15} color="#6B7280" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.canvas },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.canvas },
  scroller: { alignSelf: 'center', maxWidth: 560, width: '100%' },
  content: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { color: '#111827', fontSize: 24, fontWeight: '900', lineHeight: 30 },
  more: { paddingHorizontal: 8, paddingVertical: 6 },
  moreText: { color: palette.brand, fontSize: 13, fontWeight: '900' },
  summary: { alignItems: 'center', backgroundColor: '#111827', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, padding: 14, ...shadow },
  summaryLabel: { color: '#CBD5E1', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  summaryValue: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
  checkoutBtn: { alignItems: 'center', backgroundColor: palette.brand, borderRadius: 8, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  checkoutBtnDisabled: { opacity: 0.55 },
  checkoutText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  empty: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: palette.line, borderRadius: 8, borderWidth: 1, gap: 8, padding: 24 },
  emptyTitle: { color: '#4B5563', fontSize: 14, fontWeight: '800' },
  list: { gap: 10 },
  row: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: palette.line, borderRadius: 8, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  image: { backgroundColor: '#E5E7EB', height: 86, width: 70 },
  rowBody: { flex: 1, paddingHorizontal: 12 },
  cardName: { color: '#111827', fontSize: 14, fontWeight: '900', marginBottom: 6 },
  cardPrice: { color: '#111827', fontSize: 15, fontWeight: '900' },
  removeBtn: { alignItems: 'center', height: 34, justifyContent: 'center', marginRight: 8, width: 34 },
});
