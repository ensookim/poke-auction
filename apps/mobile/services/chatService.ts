import axios, { AxiosHeaders, AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { tokenStorage } from '@/services/authService';

const RAW_BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8080';
const isWeb = Platform.OS === 'web';

const getBackendHostFromConstants = (): string | null => {
  const hostString =
    Constants.manifest?.debuggerHost ||
    (Constants.expoConfig?.hostUri as string | undefined);

  if (!hostString) {
    return null;
  }

  return hostString.split(':')[0];
};

const BACKEND_URL = (() => {
  if (isWeb) {
    return RAW_BACKEND_URL;
  }

  const isLocalhost = RAW_BACKEND_URL.includes('localhost');
  if (!isLocalhost) {
    return RAW_BACKEND_URL;
  }

  const backendHost = getBackendHostFromConstants();
  return backendHost ? `http://${backendHost}:8080` : RAW_BACKEND_URL;
})();

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
}

export interface ChatMessageResponse {
  id: number;
  roomId: number;
  senderId: number;
  senderNickname: string;
  content: string;
  createdAt: string;
}

export interface ChatSocketEvent {
  type: 'JOINED' | 'MESSAGE' | 'ERROR';
  roomId?: number;
  message?: ChatMessageResponse;
  error?: string;
}

class ChatService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BACKEND_URL,
      timeout: 10000,
    });

    this.client.interceptors.request.use(async (config) => {
      const token = await tokenStorage.getItem('accessToken');
      if (token) {
        config.headers = new AxiosHeaders({
          ...(config.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${token}`,
        });
      }
      return config;
    });
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

  async openSocket(roomId: number, onEvent: (event: ChatSocketEvent) => void) {
    const token = await tokenStorage.getItem('accessToken');
    if (!token) {
      throw new Error('로그인이 필요합니다.');
    }

    const wsUrl = `${BACKEND_URL.replace(/^http/, 'ws')}/ws/chat?token=${encodeURIComponent(
      token,
    )}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'JOIN', roomId }));
    };

    socket.onmessage = (event) => {
      onEvent(JSON.parse(event.data) as ChatSocketEvent);
    };

    socket.onerror = () => {
      onEvent({ type: 'ERROR', error: '채팅 서버 연결에 실패했습니다.' });
    };

    return {
      send(content: string) {
        socket.send(JSON.stringify({ type: 'SEND', roomId, content }));
      },
      close() {
        socket.close();
      },
    };
  }
}

export default new ChatService();
