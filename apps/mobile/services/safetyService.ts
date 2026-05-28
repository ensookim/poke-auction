import { AxiosInstance } from 'axios';

import { createAuthenticatedClient } from '@/services/apiClient';

export type SafetyReportReason =
  | 'FRAUD'
  | 'NO_SHIPPING'
  | 'FAKE_PHOTO'
  | 'OFF_PLATFORM'
  | 'ABUSE'
  | 'OTHER';

export interface SafetyReportRequest {
  reportedUserId?: number;
  auctionId?: number;
  chatRoomId?: number;
  reason: SafetyReportReason;
  detail?: string;
}

export interface SafetyReportResponse {
  id: number;
  reporterId: number;
  reportedUserId?: number;
  auctionId?: number;
  chatRoomId?: number;
  reason: string;
  detail?: string;
  status: string;
  createdAt: string;
}

export interface BlockStatusResponse {
  userId: number;
  blocked: boolean;
}

class SafetyService {
  private client: AxiosInstance;

  constructor() {
    this.client = createAuthenticatedClient();
  }

  async report(request: SafetyReportRequest): Promise<SafetyReportResponse> {
    const response = await this.client.post<SafetyReportResponse>(
      '/api/safety/reports',
      request,
    );
    return response.data;
  }

  async getBlockStatus(userId: number): Promise<BlockStatusResponse> {
    const response = await this.client.get<BlockStatusResponse>(
      `/api/safety/blocks/${userId}`,
    );
    return response.data;
  }

  async blockUser(userId: number): Promise<BlockStatusResponse> {
    const response = await this.client.post<BlockStatusResponse>(
      `/api/safety/blocks/${userId}`,
    );
    return response.data;
  }

  async unblockUser(userId: number): Promise<BlockStatusResponse> {
    const response = await this.client.delete<BlockStatusResponse>(
      `/api/safety/blocks/${userId}`,
    );
    return response.data;
  }
}

export default new SafetyService();
