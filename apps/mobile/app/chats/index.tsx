import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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

export default function ChatRoomsScreen() {
  const { isLoading, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [rooms, setRooms] = useState<ChatRoomResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      setRooms(await chatService.getRooms());
    } catch (error) {
      Alert.alert(
        '문의 오류',
        error instanceof Error ? error.message : '문의 내역을 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      loadRooms();
    } else {
      setLoading(false);
    }
  }, [isSignedIn, loadRooms]);

  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) {
        loadRooms();
      }
    }, [isSignedIn, loadRooms]),
  );

  if (isLoading || loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#EF4444" />
      </ThemedView>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 40 + insets.bottom },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </Pressable>
        </View>

        <View style={styles.header}>
          <ThemedText style={styles.eyebrow}>CHAT</ThemedText>
          <ThemedText type="title" style={styles.title}>
            1:1 문의
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            상품별로 판매자와 직접 메시지를 주고받을 수 있어요.
          </ThemedText>
        </View>

        {rooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses" size={34} color="#9CA3AF" />
            <ThemedText style={styles.emptyTitle}>아직 문의 내역이 없어요</ThemedText>
            <ThemedText style={styles.emptyText}>
              경매 상세 화면에서 1:1 문의를 눌러 판매자에게 메시지를 보내세요.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.roomList}>
            {rooms.map((room) => (
              <Pressable
                key={room.id}
                style={styles.roomItem}
                onPress={() => router.push(`/chats/${room.id}` as any)}
              >
                <View style={styles.imageFrame}>
                  <ThemedText style={styles.artMark}>
                    {room.auctionCardName.slice(0, 1)}
                  </ThemedText>
                  {room.auctionImageUrl ? (
                    <Image
                      source={{ uri: room.auctionImageUrl }}
                      style={styles.image}
                      contentFit="cover"
                    />
                  ) : null}
                </View>
                <View style={styles.roomBody}>
                  <View style={styles.roomTop}>
                    <ThemedText style={styles.roomTitle} numberOfLines={1}>
                      {room.otherUserNickname}
                    </ThemedText>
                    <ThemedText style={styles.roomDate}>
                      {new Date(room.lastMessageAt).toLocaleDateString()}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.auctionName} numberOfLines={1}>
                    {room.auctionCardName}
                  </ThemedText>
                  <ThemedText style={styles.preview} numberOfLines={1}>
                    {room.lastMessagePreview || '대화를 시작해보세요.'}
                  </ThemedText>
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
    paddingBottom: 40,
  },
  topBar: {
    marginBottom: 14,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  header: {
    marginBottom: 18,
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
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    padding: 28,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
    marginTop: 12,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
  },
  roomList: {
    gap: 12,
  },
  roomItem: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  imageFrame: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    aspectRatio: 0.72,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: 86,
  },
  artMark: {
    color: '#CBD5E1',
    fontSize: 32,
    fontWeight: '900',
    position: 'relative',
    zIndex: 1,
  },
  image: {
    height: '100%',
    position: 'absolute',
    width: '100%',
  },
  roomBody: {
    flex: 1,
    padding: 14,
  },
  roomTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  roomTitle: {
    color: '#111827',
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  roomDate: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  auctionName: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  preview: {
    color: '#6B7280',
    fontSize: 14,
  },
});
