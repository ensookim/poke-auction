import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DetailPageHeader } from '@/components/detail-page-header';
import { ThemedText } from '@/components/themed-text';
import { palette } from '@/constants/ui';
import auctionService from '@/services/auctionService';
import shippingAddressService from '@/services/shippingAddressService';

export default function ShippingInfoScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const auctionId = Number(params.auctionId);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [deliveryMemo, setDeliveryMemo] = useState('');

  useEffect(() => {
    shippingAddressService
      .get()
      .then((saved) => {
        if (!saved) return;
        setRecipientName(saved.recipientName);
        setPhoneNumber(saved.phoneNumber);
        setAddress(saved.address);
        setAddressDetail(saved.addressDetail ?? '');
        setDeliveryMemo(saved.deliveryMemo ?? '');
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!auctionId) {
      Alert.alert('배송정보 오류', '경매 정보를 찾지 못했어요.');
      return;
    }
    if (!recipientName.trim() || !phoneNumber.trim() || !address.trim()) {
      Alert.alert('배송정보 확인', '수령인, 연락처, 주소를 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      await auctionService.submitShippingInfo(auctionId, {
        recipientName: recipientName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        addressDetail: addressDetail.trim(),
        deliveryMemo: deliveryMemo.trim(),
      });
      Alert.alert('배송정보 전송 완료', '판매자에게 배송정보를 전달했어요.', [
        { text: '확인', onPress: () => router.replace(`/auctions/${auctionId}` as any) },
      ]);
    } catch (error) {
      Alert.alert('배송정보 전송 실패', error instanceof Error ? error.message : '배송정보를 전송하지 못했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator color={palette.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailPageHeader eyebrow="DELIVERY" title="배송정보 입력" />

        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={18} color={palette.success} />
          <ThemedText style={styles.noticeText}>입력한 배송정보는 판매자와의 채팅으로 전달됩니다.</ThemedText>
        </View>

        <Field label="수령인" value={recipientName} onChangeText={setRecipientName} placeholder="홍길동" />
        <Field label="연락처" value={phoneNumber} onChangeText={setPhoneNumber} placeholder="01012345678" keyboardType="phone-pad" />
        <Field label="주소" value={address} onChangeText={setAddress} placeholder="도로명 주소" />
        <Field label="상세 주소" value={addressDetail} onChangeText={setAddressDetail} placeholder="동/호수 등" />
        <Field label="배송 요청사항" value={deliveryMemo} onChangeText={setDeliveryMemo} placeholder="문 앞에 놓아주세요" multiline />

        <Pressable style={[styles.submitButton, submitting && styles.disabledButton]} onPress={submit} disabled={submitting}>
          <ThemedText style={styles.submitText}>{submitting ? '전송 중...' : '배송정보 전송'}</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  keyboardType,
  label,
  multiline,
  onChangeText,
  placeholder,
  value,
}: {
  keyboardType?: 'default' | 'phone-pad';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A1A1AA"
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.memoInput]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F5F5F5', flex: 1 },
  centered: { alignItems: 'center', backgroundColor: '#F5F5F5', flex: 1, justifyContent: 'center' },
  scroller: { alignSelf: 'center', maxWidth: 520, width: '100%' },
  content: { paddingHorizontal: 20, paddingTop: 4 },
  notice: {
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
  noticeText: { color: palette.success, flex: 1, fontSize: 13, fontWeight: '800', lineHeight: 18 },
  field: { gap: 6, marginBottom: 12 },
  label: { color: palette.ink, fontSize: 13, fontWeight: '900', lineHeight: 18 },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  memoInput: { minHeight: 88, textAlignVertical: 'top' },
  submitButton: {
    alignItems: 'center',
    backgroundColor: palette.ink,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
  },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  disabledButton: { opacity: 0.6 },
});
