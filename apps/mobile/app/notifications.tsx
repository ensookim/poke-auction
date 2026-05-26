import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { palette } from '@/constants/ui';

const demoNotifications = [
  { id: 1, title: '입찰 경쟁 알림', body: '내가 입찰한 상품에 더 높은 금액이 들어왔어요.', time: '방금 전' },
  { id: 2, title: '마감 임박 알림', body: '관심 경매가 1시간 내 종료 예정입니다.', time: '12분 전' },
  { id: 3, title: '낙찰 결과 알림', body: '축하합니다! 낙찰된 상품 결제를 진행해 주세요.', time: '1시간 전' },
];

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={palette.ink} />
        </Pressable>
        <ThemedText style={styles.title}>알림</ThemedText>
        <View style={styles.headerPad} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {demoNotifications.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.dot} />
            <View style={styles.cardBody}>
              <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
              <ThemedText style={styles.cardText}>{item.body}</ThemedText>
              <ThemedText style={styles.cardTime}>{item.time}</ThemedText>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  title: { color: palette.ink, fontSize: 20, fontWeight: '900' },
  headerPad: { width: 36 },
  content: { gap: 10, padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  dot: { backgroundColor: palette.brand, borderRadius: 999, height: 8, marginTop: 6, width: 8 },
  cardBody: { flex: 1 },
  cardTitle: { color: palette.ink, fontSize: 14, fontWeight: '900', marginBottom: 4 },
  cardText: { color: '#52525B', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  cardTime: { color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginTop: 8 },
});
