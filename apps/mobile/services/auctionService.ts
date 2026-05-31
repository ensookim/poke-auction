import { AxiosInstance } from 'axios';

import { createAuthenticatedClient } from '@/services/apiClient';

export interface AuctionResponse {
  id: number;
  cardName: string;
  cardDescription: string;
  cardRarity: string;
  cardCategory: string;
  imageUrl: string;
  backImageUrl?: string;
  startingPrice: number;
  currentPrice: number;
  minimumIncrement: number;
  buyNowPrice?: number;
  endAt: string;
  createdAt: string;
  active: boolean;
  bidCount: number;
  wishlistCount?: number;
  creatorId?: number;
  creatorNickname?: string;
  bids?: {
    id: number;
    bidderId: number;
    amount: number;
    createdAt: string;
  }[];
  winnerId?: number;
  paymentStatus: 'NONE' | 'PENDING' | 'HELD' | 'RELEASED' | 'REFUNDED';
  paymentAmount?: number;
  paidAt?: string;
  releasedAt?: string;
  trackingNumber?: string;
  shippingCompany?: string;
  receivedConfirmed: boolean;
  receivedConfirmedAt?: string;
}

export interface PlaceBidRequest {
  amount: number;
}

export interface CreateAuctionRequest {
  cardName: string;
  cardDescription?: string;
  cardRarity?: string;
  cardCategory?: string;
  imageUrl?: string;
  backImageUrl?: string;
  startingPrice: number;
  minimumIncrement: number;
  buyNowPrice?: number;
  durationHours: number;
}

export interface ShippingInfoRequest {
  recipientName: string;
  phoneNumber: string;
  address: string;
  addressDetail?: string;
  deliveryMemo?: string;
}

export interface TrackingInfoRequest {
  shippingCompany: string;
  trackingNumber: string;
}

class AuctionService {
  private client: AxiosInstance;

  constructor() {
    this.client = createAuthenticatedClient();
  }

  async getAuctions(params?: {
    category?: string;
    sort?: string;
    activeOnly?: boolean;
  }): Promise<AuctionResponse[]> {
    const response = await this.client.get<AuctionResponse[]>('/api/auctions', {
      params,
    });
    return response.data;
  }

  async getAuction(auctionId: number): Promise<AuctionResponse> {
    const response = await this.client.get<AuctionResponse>(
      `/api/auctions/${auctionId}`,
    );
    return response.data;
  }

  async getAuctionsByBidder(): Promise<AuctionResponse[]> {
    const response = await this.client.get<AuctionResponse[]>(
      '/api/auctions/my-bids',
    );
    return response.data;
  }

  async getMyListings(): Promise<AuctionResponse[]> {
    const response = await this.client.get<AuctionResponse[]>(
      '/api/auctions/my-listings',
    );
    return response.data;
  }

  async getSellerListings(sellerId: number): Promise<AuctionResponse[]> {
    const response = await this.client.get<AuctionResponse[]>(
      `/api/auctions/sellers/${sellerId}/listings`,
    );
    return response.data;
  }

  async placeBid(auctionId: number, amount: number): Promise<AuctionResponse> {
    const request: PlaceBidRequest = { amount };
    const response = await this.client.post<AuctionResponse>(
      `/api/auctions/${auctionId}/bid`,
      request,
    );
    return response.data;
  }

  async buyNow(auctionId: number): Promise<AuctionResponse> {
    const response = await this.client.post<AuctionResponse>(
      `/api/auctions/${auctionId}/buy-now`,
    );
    return response.data;
  }

  async payAuction(auctionId: number): Promise<AuctionResponse> {
    const response = await this.client.post<AuctionResponse>(
      `/api/auctions/${auctionId}/pay`,
    );
    return response.data;
  }

  async createAuction(request: CreateAuctionRequest): Promise<AuctionResponse> {
    const response = await this.client.post<AuctionResponse>(
      '/api/auctions',
      request,
    );
    return response.data;
  }

  async deleteAuction(auctionId: number): Promise<void> {
    await this.client.delete(`/api/auctions/${auctionId}`);
  }

  async uploadAuctionImage(imageUri: string): Promise<string> {
    const filename = imageUri.split('/').pop() || `auction-${Date.now()}.jpg`;
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

  async submitShippingInfo(
    auctionId: number,
    request: ShippingInfoRequest,
  ): Promise<AuctionResponse> {
    const response = await this.client.post<AuctionResponse>(
      `/api/auctions/${auctionId}/shipping-info`,
      request,
    );
    return response.data;
  }

  async submitTrackingInfo(
    auctionId: number,
    request: TrackingInfoRequest,
  ): Promise<AuctionResponse> {
    const response = await this.client.post<AuctionResponse>(
      `/api/auctions/${auctionId}/tracking-info`,
      request,
    );
    return response.data;
  }

  async confirmReceived(auctionId: number): Promise<AuctionResponse> {
    const response = await this.client.post<AuctionResponse>(
      `/api/auctions/${auctionId}/confirm-received`,
    );
    return response.data;
  }
}

export default new AuctionService();
