import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import chatService, {
  ChatMessageResponse,
  ChatSocketEvent,
} from '@/services/chatService';

type SocketConnection = Awaited<ReturnType<typeof chatService.openSocket>>;

const QUICK_MESSAGES = [
  '실물 앞뒤 사진 더 볼 수 있을까요?',
  '모서리나 표면 하자 있나요?',
  '탑로더/박스 포장 가능할까요?',
] as const;

export default function ChatRoomScreen() {
  const params = useLocalSearchParams();
  const roomId = Number(params.id);
  const { isLoading, isSignedIn, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<SocketConnection | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const history = await chatService.getMessages(roomId);
        if (mounted) {
          setMessages(history);
        }

        const socket = await chatService.openSocket(roomId, (event) => {
          handleSocketEvent(event);
        });
        socketRef.current = socket;
      } catch (error) {
        Alert.alert(
          '문의 오류',
          error instanceof Error ? error.message : '판매자와 연결하지 못했습니다.',
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (isSignedIn && roomId) {
      load();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [isSignedIn, roomId]);

  const handleSocketEvent = (event: ChatSocketEvent) => {
    if (event.type === 'JOINED') {
      setConnected(true);
      return;
    }

    if (event.type === 'MESSAGE' && event.message) {
      const incoming = event.message;
      setMessages((prev) =>
        prev.some((message) => message.id === incoming.id)
          ? prev
          : [...prev, incoming],
      );
      return;
    }

    if (event.type === 'ERROR' && event.error) {
      Alert.alert('문의 오류', event.error);
    }
  };

  const sendMessage = () => {
    const content = text.trim();
    if (!content) {
      return;
    }

    socketRef.current?.send(content);
    setText('');
  };

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
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.shell}>
          <View style={styles.header}>
            <Pressable style={styles.iconButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </Pressable>
            <View style={styles.headerCopy}>
              <ThemedText style={styles.title}>1:1 문의</ThemedText>
              <ThemedText style={styles.connectionText}>
                {connected ? '실시간 연결됨' : '연결 준비 중'}
              </ThemedText>
            </View>
            <Pressable style={styles.iconButton} onPress={() => router.push('/messages' as any)}>
              <Ionicons name="chatbubbles" size={20} color="#111827" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.messages}
            contentContainerStyle={styles.messageContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyTitle}>아직 메시지가 없어요</ThemedText>
                <ThemedText style={styles.emptyText}>
                  상품 상태, 직거래 가능 여부, 배송 정보를 물어보세요.
                </ThemedText>
              </View>
            ) : (
              messages.map((message) => {
                const mine = message.senderId === user?.id;
                return (
                  <View
                    key={message.id}
                    style={[styles.messageRow, mine && styles.myMessageRow]}
                  >
                    <View style={[styles.bubble, mine && styles.myBubble]}>
                      <ThemedText
                        style={[styles.messageText, mine && styles.myMessageText]}
                      >
                        {message.content}
                      </ThemedText>
                      <ThemedText
                        style={[styles.messageTime, mine && styles.myMessageTime]}
                      >
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </ThemedText>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {text.trim().length === 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickMessages}
            >
              {QUICK_MESSAGES.map((message) => (
                <Pressable
                  key={message}
                  style={styles.quickMessageChip}
                  onPress={() => setText(message)}
                >
                  <ThemedText style={styles.quickMessageText}>{message}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.inputBar}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="메시지 입력"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              multiline
            />
            <Pressable style={styles.sendButton} onPress={sendMessage}>
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
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
  keyboardView: {
    flex: 1,
  },
  shell: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 520,
    padding: 20,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
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
  headerCopy: {
    flex: 1,
  },
  title: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '900',
  },
  connectionText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  messages: {
    flex: 1,
  },
  messageContent: {
    gap: 10,
    paddingBottom: 14,
    paddingTop: 6,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 60,
    padding: 28,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
  },
  messageRow: {
    alignItems: 'flex-start',
  },
  myMessageRow: {
    alignItems: 'flex-end',
  },
  bubble: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '78%',
    padding: 12,
  },
  myBubble: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  messageText: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 21,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 6,
  },
  myMessageTime: {
    color: '#CBD5E1',
  },
  quickMessages: {
    gap: 8,
    paddingBottom: 10,
  },
  quickMessageChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickMessageText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '800',
  },
  inputBar: {
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  input: {
    color: '#111827',
    flex: 1,
    fontSize: 15,
    maxHeight: 96,
    minHeight: 42,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
});
