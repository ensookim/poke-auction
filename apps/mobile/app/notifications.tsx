import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { palette } from '@/constants/ui';
import notificationService, {
  AppNotificationResponse,
} from '@/services/notificationService';

const formatNotificationTime = (value: string) => {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
};

const getIconName = (type: string): keyof typeof Ionicons.glyphMap => {
  if (type === 'CHAT') return 'chatbubble-ellipses-outline';
  if (type === 'BID') return 'hammer-outline';
  if (type === 'PAYMENT') return 'shield-checkmark-outline';
  return 'notifications-outline';
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
      if (data.some((item) => !item.read)) {
        await notificationService.markAllRead();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  const openNotification = (item: AppNotificationResponse) => {
    if (item.chatRoomId) {
      router.push({ pathname: '/chats/[id]', params: { id: String(item.chatRoomId) } } as any);
      return;
    }

    if (item.auctionId) {
      router.push(`/auctions/${item.auctionId}` as any);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={palette.ink} />
        </Pressable>
        <ThemedText style={styles.title}>알림</ThemedText>
        <Pressable style={styles.refreshButton} onPress={loadNotifications}>
          <Ionicons name="refresh" size={19} color={palette.ink} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={palette.brand} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={34} color="#98A2B3" />
            <ThemedText style={styles.emptyTitle}>아직 알림이 없어요</ThemedText>
            <ThemedText style={styles.emptyText}>입찰, 채팅, 거래 진행 알림이 여기에 쌓입니다.</ThemedText>
          </View>
        ) : (
          notifications.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.card,
                !item.read && styles.unreadCard,
                pressed && styles.pressedCard,
              ]}
              onPress={() => openNotification(item)}
            >
              <View style={styles.iconCircle}>
                <Ionicons name={getIconName(item.type)} size={18} color={palette.ink} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
                  {!item.read ? <View style={styles.dot} /> : null}
                </View>
                {item.body ? <ThemedText style={styles.cardText}>{item.body}</ThemedText> : null}
                <ThemedText style={styles.cardTime}>{formatNotificationTime(item.createdAt)}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#A1A1AA" />
            </Pressable>
          ))
        )}
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
  backButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  title: { color: palette.ink, fontSize: 20, fontWeight: '900' },
  refreshButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  content: { flexGrow: 1, gap: 10, padding: 16 },
  centerState: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingTop: 80 },
  emptyState: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: palette.ink, fontSize: 17, fontWeight: '900', marginTop: 12 },
  emptyText: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  unreadCard: { borderColor: '#BFDBFE', backgroundColor: '#F8FBFF' },
  pressedCard: { opacity: 0.7 },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  cardBody: { flex: 1 },
  cardTop: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  dot: { backgroundColor: palette.brand, borderRadius: 999, height: 7, width: 7 },
  cardTitle: { color: palette.ink, flexShrink: 1, fontSize: 14, fontWeight: '900' },
  cardText: { color: '#52525B', fontSize: 13, fontWeight: '600', lineHeight: 18, marginTop: 4 },
  cardTime: { color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginTop: 8 },
});
