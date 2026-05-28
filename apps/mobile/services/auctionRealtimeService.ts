import { AuctionResponse } from '@/services/auctionService';
import { getWebSocketUrl } from '@/services/apiConfig';

export interface AuctionSocketEvent {
  type: 'JOINED' | 'UPDATED' | 'ERROR';
  auctionId?: number;
  auction?: AuctionResponse;
  error?: string;
}

export interface AuctionRealtimeConnection {
  close(): void;
}

class AuctionRealtimeService {
  openAuctionSocket(
    auctionId: number,
    onEvent: (event: AuctionSocketEvent) => void,
  ): AuctionRealtimeConnection {
    let closedByClient = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      socket = new WebSocket(`${getWebSocketUrl()}/ws/auctions`);

      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: 'JOIN', auctionId }));
      };

      socket.onmessage = (event) => {
        onEvent(JSON.parse(event.data) as AuctionSocketEvent);
      };

      socket.onerror = () => {
        onEvent({ type: 'ERROR', error: '경매 실시간 연결에 실패했습니다.' });
      };

      socket.onclose = () => {
        if (closedByClient) {
          return;
        }

        reconnectTimer = setTimeout(connect, 1000);
      };
    };

    connect();

    return {
      close() {
        closedByClient = true;
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
        }
        socket?.close();
      },
    };
  }
}

export default new AuctionRealtimeService();
