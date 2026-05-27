import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import chatService, { ChatMessageResponse, ChatSocketEvent } from '@/services/chatService';

type SocketConnection = Awaited<ReturnType<typeof chatService.openSocket>>;

const formatMessageTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function ChatRoomScreen() {
  const params = useLocalSearchParams<{ id?: string; nickname?: string }>();
  const roomId = Number(params.id);
  const otherNickname = typeof params.nickname === 'string' ? params.nickname : '상대방';
  const insets = useSafeAreaInsets();
  const { isLoading, isSignedIn, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const socketRef = useRef<SocketConnection | null>(null);
  const listRef = useRef<FlatList<ChatMessageResponse>>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const history = await chatService.getMessages(roomId);
        if (mounted) setMessages(history);

        const socket = await chatService.openSocket(roomId, handleSocketEvent);
        socketRef.current = socket;
      } catch (error) {
        Alert.alert('채팅 오류', error instanceof Error ? error.message : '채팅 연결에 실패했습니다.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (isSignedIn && roomId) load();
    else setLoading(false);

    return () => {
      mounted = false;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [isSignedIn, roomId]);

  useEffect(() => {
    if (!messages.length) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const handleSocketEvent = (event: ChatSocketEvent) => {
    if (event.type === 'MESSAGE' && event.message) {
      const incoming = event.message;
      setMessages((prev) => (prev.some((message) => message.id === incoming.id) ? prev : [...prev, incoming]));
      return;
    }

    if (event.type === 'ERROR' && event.error) {
      Alert.alert('채팅 오류', event.error);
    }
  };

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || isSending) return;

    setIsSending(true);
    try {
      socketRef.current?.send(content);
      setText('');
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } finally {
      setIsSending(false);
    }
  };

  const quickMessages = useMemo(
    () => ['상태 괜찮을까요?', '즉시낙찰 가능할까요?', '배송은 언제 가능해요?'],
    [],
  );

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
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={23} color="#111827" />
          </Pressable>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>{otherNickname.slice(0, 1)}</ThemedText>
          </View>
          <View style={styles.headerCopy}>
            <ThemedText style={styles.title}>{otherNickname}</ThemedText>
            <ThemedText style={styles.subtitle}>채팅</ThemedText>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.messageContent,
            { paddingBottom: 8 + insets.bottom },
            messages.length === 0 && styles.emptyMessageContent,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item: message }) => {
            const mine = message.senderId === user?.id;
            return (
              <View style={[styles.messageRow, mine && styles.myMessageRow]}>
                {!mine ? (
                  <View style={styles.senderAvatar}>
                    <ThemedText style={styles.senderAvatarText}>
                      {message.senderNickname.slice(0, 1)}
                    </ThemedText>
                  </View>
                ) : null}
                <View style={styles.messageCluster}>
                  {!mine ? (
                    <ThemedText style={styles.senderName}>{message.senderNickname}</ThemedText>
                  ) : null}
                  <View style={styles.bubbleLine}>
                    {mine ? (
                      <ThemedText style={styles.timeText}>{formatMessageTime(message.createdAt)}</ThemedText>
                    ) : null}
                    <View style={[styles.bubble, mine && styles.myBubble]}>
                      <ThemedText style={[styles.messageText, mine && styles.myMessageText]}>
                        {message.content}
                      </ThemedText>
                    </View>
                    {!mine ? (
                      <ThemedText style={styles.timeText}>{formatMessageTime(message.createdAt)}</ThemedText>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={34} color="#98A2B3" />
              <ThemedText style={styles.emptyTitle}>아직 메시지가 없어요</ThemedText>
              <ThemedText style={styles.emptyText}>아래 입력창으로 바로 채팅해보세요.</ThemedText>
            </View>
          }
        />

        <FlatList
          horizontal
          data={quickMessages}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.quickMessages}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable style={styles.quickMessageChip} onPress={() => setText(item)}>
              <ThemedText style={styles.quickMessageText}>{item}</ThemedText>
            </Pressable>
          )}
        />

        <View style={[styles.inputBar, { marginBottom: Math.max(insets.bottom - 4, 0) }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="메시지 입력"
            placeholderTextColor="#98A2B3"
            style={styles.input}
            multiline
            maxLength={500}
            onFocus={() => listRef.current?.scrollToEnd({ animated: true })}
          />
          <Pressable
            style={[styles.sendButton, (!text.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() || isSending}
          >
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F4F7' },
  keyboardView: { flex: 1 },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#EEF0F4',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: 12,
  },
  backButton: { alignItems: 'center', height: 40, justifyContent: 'center', marginRight: 4, width: 34 },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    marginRight: 10,
    width: 36,
  },
  avatarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  headerCopy: { flex: 1 },
  title: { color: '#111827', fontSize: 16, fontWeight: '900' },
  subtitle: { color: '#98A2B3', fontSize: 12, fontWeight: '800', marginTop: 1 },
  messageContent: { paddingHorizontal: 12, paddingTop: 12 },
  emptyMessageContent: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: '#111827', fontSize: 17, fontWeight: '900', marginBottom: 6, marginTop: 12 },
  emptyText: { color: '#667085', fontSize: 13, textAlign: 'center' },
  messageRow: { alignItems: 'flex-end', flexDirection: 'row', marginBottom: 7 },
  myMessageRow: { justifyContent: 'flex-end' },
  senderAvatar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 28,
    justifyContent: 'center',
    marginRight: 7,
    width: 28,
  },
  senderAvatarText: { color: '#667085', fontSize: 12, fontWeight: '900' },
  messageCluster: { maxWidth: '78%' },
  senderName: { color: '#667085', fontSize: 11, fontWeight: '800', marginBottom: 3 },
  bubbleLine: { alignItems: 'flex-end', flexDirection: 'row', gap: 5 },
  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  myBubble: { backgroundColor: '#FEE500' },
  messageText: { color: '#111827', fontSize: 14, lineHeight: 19 },
  myMessageText: { color: '#111827' },
  timeText: { color: '#98A2B3', fontSize: 10, marginBottom: 2 },
  quickMessages: { gap: 7, paddingHorizontal: 12, paddingBottom: 7, paddingTop: 6 },
  quickMessageChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  quickMessageText: { color: '#4B5563', fontSize: 12, fontWeight: '800' },
  inputBar: {
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#EEF0F4',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  input: {
    backgroundColor: '#F2F4F7',
    borderRadius: 8,
    color: '#111827',
    flex: 1,
    fontSize: 14,
    maxHeight: 88,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  sendButtonDisabled: { opacity: 0.35 },
});
