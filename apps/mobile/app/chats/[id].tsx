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
import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import chatService, { ChatMessageResponse, ChatSocketEvent } from '@/services/chatService';

type SocketConnection = Awaited<ReturnType<typeof chatService.openSocket>>;

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

        const socket = await chatService.openSocket(roomId, (event) => {
          handleSocketEvent(event);
        });
        socketRef.current = socket;
      } catch (error) {
        Alert.alert('문의 오류', error instanceof Error ? error.message : '채팅 연결에 실패했습니다.');
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
      setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
      return;
    }
    if (event.type === 'ERROR' && event.error) {
      Alert.alert('문의 오류', event.error);
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
    () => ['상품 상태 괜찮을까요?', '즉시낙찰 가능할까요?', '배송은 언제 가능할까요?'],
    [],
  );

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
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.shell}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>{otherNickname.slice(0, 1)}</ThemedText>
            </View>
            <View style={styles.headerCopy}>
              <ThemedText style={styles.title}>{otherNickname}</ThemedText>
            </View>
          </View>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.messageContent, { paddingBottom: 10 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item: message }) => {
              const mine = message.senderId === user?.id;
              return (
                <View style={[styles.messageRow, mine && styles.myMessageRow]}>
                  <View style={[styles.bubble, mine && styles.myBubble]}>
                    <ThemedText style={[styles.messageText, mine && styles.myMessageText]}>{message.content}</ThemedText>
                    <ThemedText style={[styles.messageTime, mine && styles.myMessageTime]}>
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </ThemedText>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyTitle}>아직 메시지가 없어요</ThemedText>
                <ThemedText style={styles.emptyText}>아래 입력창으로 바로 문의해보세요.</ThemedText>
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
              placeholderTextColor="#9CA3AF"
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
              <Ionicons name="send" size={17} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F7F9' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F7F9' },
  keyboardView: { flex: 1 },
  shell: { alignSelf: 'center', flex: 1, maxWidth: 520, paddingHorizontal: 16, paddingTop: 10, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
  avatar: { alignItems: 'center', backgroundColor: '#111827', borderRadius: 999, height: 34, justifyContent: 'center', marginRight: 10, width: 34 },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  headerCopy: { flex: 1 },
  title: { color: '#111827', fontSize: 18, fontWeight: '900' },
  messageContent: { gap: 8, paddingTop: 4 },
  emptyState: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 8, borderWidth: 1, marginTop: 60, padding: 24 },
  emptyTitle: { color: '#111827', fontSize: 16, fontWeight: '900', marginBottom: 6 },
  emptyText: { color: '#6B7280', fontSize: 13, textAlign: 'center' },
  messageRow: { alignItems: 'flex-start' },
  myMessageRow: { alignItems: 'flex-end' },
  bubble: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 8, borderWidth: 1, maxWidth: '78%', padding: 10 },
  myBubble: { backgroundColor: '#111827', borderColor: '#111827' },
  messageText: { color: '#111827', fontSize: 14, lineHeight: 20 },
  myMessageText: { color: '#FFFFFF' },
  messageTime: { color: '#9CA3AF', fontSize: 10, marginTop: 5 },
  myMessageTime: { color: '#CBD5E1' },
  quickMessages: { gap: 8, paddingBottom: 8, paddingTop: 6 },
  quickMessageChip: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  quickMessageText: { color: '#4B5563', fontSize: 12, fontWeight: '800' },
  inputBar: { alignItems: 'flex-end', backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingVertical: 6 },
  input: { color: '#111827', flex: 1, fontSize: 14, maxHeight: 84, minHeight: 36, paddingHorizontal: 4, paddingVertical: 8 },
  sendButton: { alignItems: 'center', backgroundColor: '#EF4444', borderRadius: 8, height: 36, justifyContent: 'center', width: 36 },
  sendButtonDisabled: { opacity: 0.5 },
});
