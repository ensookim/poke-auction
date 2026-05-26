import { AxiosInstance } from 'axios';
import { createAuthenticatedClient } from '@/services/apiClient';

export interface FollowUser {
  userId: number;
  nickname: string;
}

export interface FollowStats {
  followingCount: number;
  followerCount: number;
}

export interface FollowStatus {
  userId: number;
  following: boolean;
}

class FollowService {
  private client: AxiosInstance;

  constructor() {
    this.client = createAuthenticatedClient();
  }

  async getStats(): Promise<FollowStats> {
    const response = await this.client.get<FollowStats>('/api/me/follow/stats');
    return response.data;
  }

  async getFollowing(): Promise<FollowUser[]> {
    const response = await this.client.get<FollowUser[]>('/api/me/following');
    return response.data;
  }

  async getFollowers(): Promise<FollowUser[]> {
    const response = await this.client.get<FollowUser[]>('/api/me/followers');
    return response.data;
  }

  async getStatus(userId: number): Promise<FollowStatus> {
    const response = await this.client.get<FollowStatus>(
      `/api/me/follow/${userId}/status`,
    );
    return response.data;
  }

  async follow(userId: number): Promise<FollowStatus> {
    const response = await this.client.post<FollowStatus>(
      `/api/me/follow/${userId}`,
    );
    return response.data;
  }

  async unfollow(userId: number): Promise<FollowStatus> {
    const response = await this.client.delete<FollowStatus>(
      `/api/me/follow/${userId}`,
    );
    return response.data;
  }
}

export default new FollowService();
