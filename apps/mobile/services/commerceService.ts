import { AxiosInstance } from 'axios';

import { AuctionResponse } from '@/services/auctionService';
import { createAuthenticatedClient } from '@/services/apiClient';


export interface CollectionItemResponse {
  id: number;
  auction: AuctionResponse;
  createdAt: string;
}

export interface CollectionStatusResponse {
  auctionId: number;
  wished: boolean;
  inCart: boolean;
}

export interface CheckoutResponse {
  totalAmount: number;
  itemCount: number;
  paymentStatus: 'HELD';
  items: CollectionItemResponse[];
}

class CommerceService {
  private client: AxiosInstance;

  constructor() {
    this.client = createAuthenticatedClient();
  }

  async getWishlist(): Promise<CollectionItemResponse[]> {
    const response = await this.client.get<CollectionItemResponse[]>(
      '/api/me/wishlist',
    );
    return response.data;
  }

  async addWishlist(auctionId: number): Promise<CollectionStatusResponse> {
    const response = await this.client.post<CollectionStatusResponse>(
      `/api/me/wishlist/${auctionId}`,
    );
    return response.data;
  }

  async removeWishlist(auctionId: number): Promise<CollectionStatusResponse> {
    const response = await this.client.delete<CollectionStatusResponse>(
      `/api/me/wishlist/${auctionId}`,
    );
    return response.data;
  }

  async getCart(): Promise<CollectionItemResponse[]> {
    const response = await this.client.get<CollectionItemResponse[]>('/api/me/cart');
    return response.data;
  }

  async addCart(auctionId: number): Promise<CollectionStatusResponse> {
    const response = await this.client.post<CollectionStatusResponse>(
      `/api/me/cart/${auctionId}`,
    );
    return response.data;
  }

  async removeCart(auctionId: number): Promise<CollectionStatusResponse> {
    const response = await this.client.delete<CollectionStatusResponse>(
      `/api/me/cart/${auctionId}`,
    );
    return response.data;
  }

  async getStatus(auctionId: number): Promise<CollectionStatusResponse> {
    const response = await this.client.get<CollectionStatusResponse>(
      `/api/me/collections/${auctionId}`,
    );
    return response.data;
  }

  async checkoutCart(): Promise<CheckoutResponse> {
    const response = await this.client.post<CheckoutResponse>(
      '/api/me/cart/checkout',
    );
    return response.data;
  }
}

export default new CommerceService();
