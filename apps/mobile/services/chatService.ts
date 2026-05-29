import { AxiosInstance } from 'axios';

import { tokenStorage } from '@/services/authService';
import { getWebSocketUrl } from '@/services/apiConfig';
import { createAuthenticatedClient } from '@/services/apiClient';


export interface ChatRoomResponse {
  id: number;
  auctionId: number;
  auctionCardName: string;
  auctionImageUrl?: string;
  sellerId: number;
  buyerId: number;
  otherUserId: number;
  otherUserNickname: string;
  lastMessagePreview?: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ChatMessageResponse {
  id: number;
  roomId: number;
  senderId: number;
  senderNickname: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  readByOther: boolean;
}

export interface ChatSocketEvent {
  type: 'JOINED' | 'MESSAGE' | 'READ' | 'ERROR';
  roomId?: number;
  readerId?: number;
  message?: ChatMessageResponse;
  error?: string;
}

class ChatService {
  private client: AxiosInstance;

  constructor() {
    this.client = createAuthenticatedClient();
  }

  async createRoom(auctionId: number): Promise<ChatRoomResponse> {
    const response = await this.client.post<ChatRoomResponse>(
      `/api/chats/auctions/${auctionId}/rooms`,
    );
    return response.data;
  }

  async getRooms(): Promise<ChatRoomResponse[]> {
    const response = await this.client.get<ChatRoomResponse[]>('/api/chats/rooms');
    return response.data;
  }

  async getMessages(roomId: number): Promise<ChatMessageResponse[]> {
    const response = await this.client.get<ChatMessageResponse[]>(
      `/api/chats/rooms/${roomId}/messages`,
    );
    return response.data;
  }

  async markRead(roomId: number): Promise<void> {
    await this.client.post(`/api/chats/rooms/${roomId}/read`);
  }

  async uploadChatImage(imageUri: string): Promise<string> {
    const filename = imageUri.split('/').pop() || `chat-${Date.now()}.jpg`;
    const extension = filename.split('.').pop()?.toLowerCase();
    const mimeType =
      extension === 'png'
        ? 'image/png'
        : extension === 'webp'
          ? 'image/webp'
          : 'image/jpeg';
    const formData = new FormData();

    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);

    const response = await this.client.post<{ imageUrl: string }>(
      '/api/auctions/images',
      formData,
    );
    return response.data.imageUrl;
  }

  async openSocket(roomId: number, onEvent: (event: ChatSocketEvent) => void) {
    const token = await tokenStorage.getItem('accessToken');
    if (!token) {
      throw new Error('로그인이 필요합니다.');
    }

    const wsUrl = `${getWebSocketUrl()}/ws/chat?token=${encodeURIComponent(
      token,
    )}`;
    const socket = new WebSocket(wsUrl);
    const pendingMessages: string[] = [];

    const sendPayload = (payload: unknown) => {
      const serialized = JSON.stringify(payload);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(serialized);
        return;
      }

      pendingMessages.push(serialized);
    };

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'JOIN', roomId }));
      while (pendingMessages.length > 0) {
        socket.send(pendingMessages.shift() as string);
      }
    };

    socket.onmessage = (event) => {
      onEvent(JSON.parse(event.data) as ChatSocketEvent);
    };

    socket.onerror = () => {
      onEvent({ type: 'ERROR', error: '채팅 서버 연결에 실패했습니다.' });
    };

    return {
      send(content: string, imageUrl?: string) {
        sendPayload({ type: 'SEND', roomId, content, imageUrl });
      },
      read() {
        sendPayload({ type: 'READ', roomId });
      },
      close() {
        pendingMessages.length = 0;
        socket.close();
      },
    };
  }

  async openWatcher(onEvent: (event: ChatSocketEvent) => void) {
    const token = await tokenStorage.getItem('accessToken');
    if (!token) {
      throw new Error('로그인이 필요합니다.');
    }

    const socket = new WebSocket(
      `${getWebSocketUrl()}/ws/chat?token=${encodeURIComponent(token)}`,
    );

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'WATCH' }));
    };

    socket.onmessage = (event) => {
      onEvent(JSON.parse(event.data) as ChatSocketEvent);
    };

    socket.onerror = () => {
      onEvent({ type: 'ERROR', error: '채팅 알림 연결에 실패했습니다.' });
    };

    return {
      close() {
        socket.close();
      },
    };
  }
}

export default new ChatService();
