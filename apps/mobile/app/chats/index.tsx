import React, { useCallback, useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import chatService, { ChatRoomResponse } from '@/services/chatService';
import { isAuthSessionExpiredError } from '@/services/apiClient';
import { getFriendlyErrorMessage } from '@/services/errorUtils';

const formatRoomDate = (value?: string) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function ChatRoomsScreen() {
  const { isLoading, isSignedIn, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [rooms, setRooms] = useState<ChatRoomResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRooms = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setRooms(await chatService.getRooms());
    } catch (error) {
      if (isAuthSessionExpiredError(error)) {
        await logout();
        Alert.alert('로그인이 만료됐어요', '다시 로그인해주세요.');
        router.replace('/login');
        return;
      }
      Alert.alert('채팅 오류', getFriendlyErrorMessage(error, '채팅 목록을 불러오지 못했습니다.'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (isSignedIn) loadRooms();
    else setLoading(false);
  }, [isSignedIn, loadRooms]);

  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) loadRooms(true);
    }, [isSignedIn, loadRooms]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadRooms(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadRooms]);

  if (isLoading || loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </ThemedView>
    );
  }

  if (!isSignedIn) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.eyebrow}>MESSAGES</ThemedText>
          <ThemedText style={styles.title}>채팅</ThemedText>
          <ThemedText style={styles.subtitle}>거래 전후 대화를 한곳에서 확인해요.</ThemedText>
        </View>

        {rooms.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubble-ellipses" size={28} color="#667085" />
            </View>
            <ThemedText style={styles.emptyTitle}>아직 채팅이 없어요</ThemedText>
            <ThemedText style={styles.emptyText}>
              경매 상세에서 채팅 버튼을 눌러 판매자와 대화를 시작해보세요.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.roomList}>
            {rooms.map((room) => (
              <Pressable
                key={room.id}
                style={({ pressed }) => [styles.roomItem, pressed && styles.pressed]}
                onPress={() =>
                  router.push({
                    pathname: '/chats/[id]',
                    params: {
                      id: String(room.id),
                      nickname: room.otherUserNickname,
                      otherUserId: String(room.otherUserId),
                    },
                  })
                }
              >
                <View style={styles.avatarWrap}>
                  {room.auctionImageUrl ? (
                    <Image source={{ uri: room.auctionImageUrl }} style={styles.avatarImage} contentFit="cover" />
                  ) : (
                    <Ionicons name="person" size={22} color="#98A2B3" />
                  )}
                </View>

                <View style={styles.roomBody}>
                  <View style={styles.roomTop}>
                    <ThemedText style={styles.roomTitle} numberOfLines={1}>
                      {room.otherUserNickname}
                    </ThemedText>
                    <ThemedText style={styles.roomDate}>
                      {formatRoomDate(room.lastMessageAt)}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.auctionName} numberOfLines={1}>
                    {room.auctionCardName}
                  </ThemedText>
                  <ThemedText style={styles.preview} numberOfLines={1}>
                    {room.lastMessagePreview || '채팅을 시작해보세요.'}
                  </ThemedText>
                </View>
                {room.unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <ThemedText style={styles.unreadText}>{room.unreadCount}</ThemedText>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  scroller: { alignSelf: 'center', maxWidth: 520, width: '100%' },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  header: { marginBottom: 12 },
  eyebrow: { color: '#EF4444', fontSize: 12, fontWeight: '900', marginBottom: 4 },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
    includeFontPadding: true,
    lineHeight: 40,
  },
  subtitle: { color: '#667085', fontSize: 14, lineHeight: 20, marginTop: 5 },
  emptyState: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 96 },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 8,
    height: 58,
    justifyContent: 'center',
    marginBottom: 14,
    width: 58,
  },
  emptyTitle: { color: '#111827', fontSize: 18, fontWeight: '900', marginBottom: 7 },
  emptyText: { color: '#667085', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  roomList: { borderTopColor: '#EEF0F4', borderTopWidth: 1 },
  roomItem: {
    alignItems: 'center',
    borderBottomColor: '#EEF0F4',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 76,
    paddingVertical: 10,
  },
  avatarWrap: {
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
    width: 52,
  },
  avatarImage: { height: '100%', width: '100%' },
  roomBody: { flex: 1, minWidth: 0 },
  roomTop: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  roomTitle: { color: '#111827', flex: 1, fontSize: 16, fontWeight: '900' },
  roomDate: { color: '#98A2B3', fontSize: 12, fontWeight: '700' },
  auctionName: { color: '#EF4444', fontSize: 12, fontWeight: '800', marginTop: 3 },
  preview: { color: '#667085', fontSize: 13, marginTop: 4 },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    minWidth: 22,
    paddingHorizontal: 7,
  },
  unreadText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.62 },
});
