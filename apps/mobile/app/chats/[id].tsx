import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  StatusBar,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import chatService, { ChatMessageResponse, ChatSocketEvent } from '@/services/chatService';
import safetyService, { SafetyReportReason } from '@/services/safetyService';

type SocketConnection = Awaited<ReturnType<typeof chatService.openSocket>>;

const formatMessageTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const reportReasons: { label: string; value: SafetyReportReason }[] = [
  { label: '사기 의심', value: 'FRAUD' },
  { label: '미발송', value: 'NO_SHIPPING' },
  { label: '허위 사진', value: 'FAKE_PHOTO' },
  { label: '외부거래 유도', value: 'OFF_PLATFORM' },
  { label: '욕설/비매너', value: 'ABUSE' },
];

const hasOffPlatformPattern = (content: string) =>
  /(오픈채팅|오픈톡|카톡|카카오톡|계좌|입금|송금|010[-\s]?\d{4}[-\s]?\d{4}|https?:\/\/|open\.kakao)/i.test(
    content,
  );

export default function ChatRoomScreen() {
  const params = useLocalSearchParams<{ id?: string; nickname?: string; otherUserId?: string }>();
  const roomId = Number(params.id);
  const otherUserId = Number(params.otherUserId);
  const otherNickname = typeof params.nickname === 'string' ? params.nickname : '상대방';
  const insets = useSafeAreaInsets();
  const topSafeOffset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );
  const { isLoading, isSignedIn, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSendingImage, setIsSendingImage] = useState(false);
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
        socket.read();
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
      if (incoming.senderId !== user?.id) {
        socketRef.current?.read();
      }
      return;
    }

    if (event.type === 'READ' && event.readerId !== user?.id) {
      setMessages((prev) =>
        prev.map((message) =>
          message.senderId === user?.id ? { ...message, readByOther: true } : message,
        ),
      );
      return;
    }

    if (event.type === 'ERROR' && event.error) {
      Alert.alert('채팅 오류', event.error);
    }
  };

  const sendContent = async (content: string, imageUrl?: string) => {
    setIsSending(true);
    try {
      socketRef.current?.send(content, imageUrl);
      setText('');
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } finally {
      setIsSending(false);
    }
  };

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || isSending) return;

    if (hasOffPlatformPattern(content)) {
      Alert.alert(
        '외부거래 주의',
        '계좌, 전화번호, 오픈채팅 등 앱 밖 거래는 분쟁 시 보호가 어려울 수 있어요. 그래도 보낼까요?',
        [
          { text: '취소', style: 'cancel' },
          { text: '보내기', onPress: () => void sendContent(content) },
        ],
      );
      return;
    }

    await sendContent(content);
  };

  const sendImage = async () => {
    if (isSendingImage) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('사진 권한 필요', '채팅에서 사진을 보내려면 사진 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    try {
      setIsSendingImage(true);
      const imageUrl = await chatService.uploadChatImage(result.assets[0].uri);
      await sendContent('사진', imageUrl);
    } catch (error) {
      Alert.alert('사진 전송 실패', error instanceof Error ? error.message : '사진을 보내지 못했습니다.');
    } finally {
      setIsSendingImage(false);
    }
  };

  const handleReport = () => {
    if (!otherUserId) return;

    Alert.alert(
      '신고하기',
      '신고 사유를 선택해주세요.',
      [
        ...reportReasons.map((reason) => ({
          text: reason.label,
          onPress: async () => {
            try {
              await safetyService.report({
                chatRoomId: roomId,
                reportedUserId: otherUserId,
                reason: reason.value,
              });
              Alert.alert('신고 완료', '확인 후 필요한 조치를 진행할게요.');
            } catch (error) {
              Alert.alert('신고 실패', error instanceof Error ? error.message : '신고를 접수하지 못했습니다.');
            }
          },
        })),
        { text: '취소', style: 'cancel' },
      ],
    );
  };

  const handleBlock = () => {
    if (!otherUserId) return;

    Alert.alert('차단하기', '차단하면 서로 채팅과 입찰이 제한돼요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '차단',
        style: 'destructive',
        onPress: async () => {
          try {
            await safetyService.blockUser(otherUserId);
            Alert.alert('차단 완료', '이 사용자와의 채팅과 입찰을 제한했어요.');
          } catch (error) {
            Alert.alert('차단 실패', error instanceof Error ? error.message : '차단하지 못했습니다.');
          }
        },
      },
    ]);
  };

  if (isLoading || loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </ThemedView>
    );
  }

  if (!isSignedIn) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={[styles.shell, { paddingTop: topSafeOffset + 10 }]}>
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
            {otherUserId ? (
              <View style={styles.headerActions}>
                <Pressable style={styles.headerIconButton} onPress={handleReport}>
                  <Ionicons name="flag-outline" size={17} color="#667085" />
                </Pressable>
                <Pressable style={styles.headerIconButton} onPress={handleBlock}>
                  <Ionicons name="ban-outline" size={17} color="#EF4444" />
                </Pressable>
              </View>
            ) : null}
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
                        <View style={styles.myMessageMeta}>
                          {message.readByOther ? (
                            <ThemedText style={styles.readText}>읽음</ThemedText>
                          ) : null}
                          <ThemedText style={styles.timeText}>{formatMessageTime(message.createdAt)}</ThemedText>
                        </View>
                      ) : null}
                      <View style={[styles.bubble, mine && styles.myBubble, message.imageUrl && styles.imageBubble]}>
                        {message.imageUrl ? (
                          <Image source={{ uri: message.imageUrl }} style={styles.messageImage} contentFit="cover" />
                        ) : null}
                        {message.content && message.content !== '사진' ? (
                          <ThemedText style={[styles.messageText, mine && styles.myMessageText]}>
                            {message.content}
                          </ThemedText>
                        ) : null}
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

          <View style={[styles.inputBar, { marginBottom: Math.max(insets.bottom - 4, 0) }]}>
            <Pressable
              style={[styles.photoButton, isSendingImage && styles.sendButtonDisabled]}
              onPress={sendImage}
              disabled={isSendingImage}
            >
              {isSendingImage ? (
                <ActivityIndicator size="small" color="#667085" />
              ) : (
                <Ionicons name="image-outline" size={19} color="#667085" />
              )}
            </Pressable>
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F4F7' },
  keyboardView: { flex: 1 },
  shell: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 520,
    paddingHorizontal: 12,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF0F4',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    minHeight: 60,
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
  headerActions: { flexDirection: 'row', gap: 6 },
  headerIconButton: {
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  messageContent: { paddingHorizontal: 2, paddingTop: 4 },
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
  myBubble: { backgroundColor: '#DBEAFE' },
  imageBubble: { padding: 4 },
  messageImage: {
    backgroundColor: '#E5E7EB',
    borderRadius: 7,
    height: 180,
    width: 180,
  },
  messageText: { color: '#111827', fontSize: 14, lineHeight: 19 },
  myMessageText: { color: '#111827' },
  myMessageMeta: { alignItems: 'flex-end', gap: 2 },
  readText: { color: '#2563EB', fontSize: 10, fontWeight: '800' },
  timeText: { color: '#98A2B3', fontSize: 10, marginBottom: 2 },
  inputBar: {
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF0F4',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
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
  photoButton: {
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
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


