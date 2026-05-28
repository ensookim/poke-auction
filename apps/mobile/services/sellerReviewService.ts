import { AxiosInstance } from 'axios';

import { createAuthenticatedClient } from '@/services/apiClient';

export interface SellerReview {
  id: number;
  sellerId: number;
  reviewerId: number;
  reviewerNickname: string;
  auctionId: number;
  auctionCardName: string;
  rating: number;
  content: string;
  createdAt: string;
}

export interface SellerReviewSummary {
  sellerId: number;
  averageRating: number;
  reviewCount: number;
}

export interface SellerReviewRequest {
  auctionId: number;
  rating: number;
  content?: string;
}

class SellerReviewService {
  private client: AxiosInstance;

  constructor() {
    this.client = createAuthenticatedClient();
  }

  async getSummary(sellerId: number): Promise<SellerReviewSummary> {
    const response = await this.client.get<SellerReviewSummary>(
      `/api/sellers/${sellerId}/reviews/summary`,
    );
    return response.data;
  }

  async getReviews(sellerId: number): Promise<SellerReview[]> {
    const response = await this.client.get<SellerReview[]>(
      `/api/sellers/${sellerId}/reviews`,
    );
    return response.data;
  }

  async submitReview(
    sellerId: number,
    request: SellerReviewRequest,
  ): Promise<SellerReview> {
    const response = await this.client.post<SellerReview>(
      `/api/sellers/${sellerId}/reviews`,
      request,
    );
    return response.data;
  }
}

export default new SellerReviewService();
