import axios, { AxiosHeaders, AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { tokenStorage } from '@/services/authService';
import { AuctionResponse } from '@/services/auctionService';

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
  items: CollectionItemResponse[];
}

class CommerceService {
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
