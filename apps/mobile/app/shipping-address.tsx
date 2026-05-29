import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { palette } from '@/constants/ui';
import shippingAddressService from '@/services/shippingAddressService';

export default function ShippingAddressScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [deliveryMemo, setDeliveryMemo] = useState('');

  useEffect(() => {
    shippingAddressService
      .get()
      .then((data) => {
        if (!data) return;
        setRecipientName(data.recipientName);
        setPhoneNumber(data.phoneNumber);
        setAddress(data.address);
        setAddressDetail(data.addressDetail ?? '');
        setDeliveryMemo(data.deliveryMemo ?? '');
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!recipientName.trim() || !phoneNumber.trim() || !address.trim()) {
      Alert.alert('배송지 확인', '받는 사람, 연락처, 주소를 입력해주세요.');
      return;
    }

    try {
      setSaving(true);
      await shippingAddressService.save({
        recipientName: recipientName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        addressDetail: addressDetail.trim(),
        deliveryMemo: deliveryMemo.trim(),
      });
      Alert.alert('저장 완료', '기본 배송지를 저장했어요.');
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '배송지를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
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
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={palette.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText style={styles.eyebrow}>SHIPPING</ThemedText>
            <ThemedText style={styles.title}>기본 배송지</ThemedText>
          </View>
        </View>

        <View style={styles.form}>
          <Field label="받는 사람" value={recipientName} onChangeText={setRecipientName} placeholder="홍길동" />
          <Field label="연락처" value={phoneNumber} onChangeText={setPhoneNumber} placeholder="01012345678" keyboardType="phone-pad" />
          <Field label="주소" value={address} onChangeText={setAddress} placeholder="도로명 주소" />
          <Field label="상세 주소" value={addressDetail} onChangeText={setAddressDetail} placeholder="동/호수 등" />
          <Field label="배송 요청사항" value={deliveryMemo} onChangeText={setDeliveryMemo} placeholder="문 앞에 놓아주세요" multiline />
        </View>

        <Pressable style={[styles.saveButton, saving && styles.disabledButton]} onPress={save} disabled={saving}>
          <ThemedText style={styles.saveButtonText}>{saving ? '저장 중...' : '배송지 저장'}</ThemedText>
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
  content: { padding: 20 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 18 },
  backButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    marginRight: 10,
    width: 40,
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: palette.brand, fontSize: 12, fontWeight: '900', marginBottom: 3 },
  title: { color: palette.ink, fontSize: 25, fontWeight: '900' },
  form: { gap: 12 },
  field: { gap: 6 },
  label: { color: palette.ink, fontSize: 13, fontWeight: '900' },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  memoInput: { minHeight: 88, textAlignVertical: 'top' },
  saveButton: {
    alignItems: 'center',
    backgroundColor: palette.ink,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 52,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  disabledButton: { opacity: 0.6 },
});
