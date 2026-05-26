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
        Alert.alert('로그인 만료', '다시 로그인해 주세요.');
        router.replace('/login');
        return;
      }
      Alert.alert('문의 오류', getFriendlyErrorMessage(error, '문의 내역을 불러오지 못했습니다.'));
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
        <ActivityIndicator size="large" color="#EF4444" />
      </ThemedView>
    );
  }

  if (!isSignedIn) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.eyebrow}>CHAT</ThemedText>
          <ThemedText type="title" style={styles.title}>문의</ThemedText>
          <ThemedText style={styles.subtitle}>상대방과 주고받은 대화를 확인해 보세요.</ThemedText>
        </View>

        {rooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses" size={34} color="#9CA3AF" />
            <ThemedText style={styles.emptyTitle}>아직 문의 내역이 없어요</ThemedText>
            <ThemedText style={styles.emptyText}>경매 상세에서 문의 버튼을 눌러 시작해보세요.</ThemedText>
          </View>
        ) : (
          <View style={styles.roomList}>
            {rooms.map((room) => (
              <Pressable
                key={room.id}
                style={styles.roomItem}
                onPress={() =>
                  router.push({
                    pathname: '/chats/[id]',
                    params: { id: String(room.id), nickname: room.otherUserNickname },
                  })
                }
              >
                <View style={styles.imageFrame}>
                  {room.auctionImageUrl ? (
                    <Image source={{ uri: room.auctionImageUrl }} style={styles.image} contentFit="cover" />
                  ) : null}
                </View>
                <View style={styles.roomBody}>
                  <View style={styles.roomTop}>
                    <ThemedText style={styles.roomTitle} numberOfLines={1}>{room.otherUserNickname}</ThemedText>
                    <ThemedText style={styles.roomDate}>{new Date(room.lastMessageAt).toLocaleDateString()}</ThemedText>
                  </View>
                  <ThemedText style={styles.auctionName} numberOfLines={1}>{room.auctionCardName}</ThemedText>
                  <ThemedText style={styles.preview} numberOfLines={1}>{room.lastMessagePreview || '대화를 시작해보세요.'}</ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F7F9' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F7F9' },
  scroller: { alignSelf: 'center', maxWidth: 520, width: '100%' },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 18 },
  eyebrow: { color: '#EF4444', fontSize: 12, fontWeight: '900', marginBottom: 4 },
  title: { color: '#111827', fontSize: 30, fontWeight: '900', lineHeight: 36 },
  subtitle: { color: '#6B7280', fontSize: 14, lineHeight: 21, marginTop: 6 },
  emptyState: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 8, borderWidth: 1, padding: 28 },
  emptyTitle: { color: '#111827', fontSize: 17, fontWeight: '900', marginBottom: 6, marginTop: 12 },
  emptyText: { color: '#6B7280', fontSize: 13, textAlign: 'center' },
  roomList: { gap: 12 },
  roomItem: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 8, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  imageFrame: { backgroundColor: '#F3F4F6', aspectRatio: 0.72, overflow: 'hidden', position: 'relative', width: 86 },
  image: { height: '100%', position: 'absolute', width: '100%' },
  roomBody: { flex: 1, padding: 14 },
  roomTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  roomTitle: { color: '#111827', flex: 1, fontSize: 16, fontWeight: '900' },
  roomDate: { color: '#9CA3AF', fontSize: 12 },
  auctionName: { color: '#EF4444', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  preview: { color: '#6B7280', fontSize: 14 },
});
