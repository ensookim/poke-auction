import { AxiosInstance } from 'axios';

import { createAuthenticatedClient } from '@/services/apiClient';

export interface TossPaymentPrepareResponse {
  clientKey: string;
  customerKey: string;
  orderId: string;
  orderName: string;
  amount: number;
  checkoutUrl: string;
  successUrl: string;
  failUrl: string;
}

export interface TossPaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface TossPaymentConfirmResponse {
  orderId: string;
  paymentKey: string;
  amount: number;
  status: 'DONE' | 'READY' | 'FAILED';
}

class PaymentService {
  private client: AxiosInstance;

  constructor() {
    this.client = createAuthenticatedClient();
  }

  async prepareAuctionPayment(
    auctionId: number,
  ): Promise<TossPaymentPrepareResponse> {
    const response = await this.client.post<TossPaymentPrepareResponse>(
      `/api/payments/toss/auctions/${auctionId}/prepare`,
    );
    return response.data;
  }

  async prepareCartPayment(): Promise<TossPaymentPrepareResponse> {
    const response = await this.client.post<TossPaymentPrepareResponse>(
      '/api/payments/toss/cart/prepare',
    );
    return response.data;
  }

  async confirmTossPayment(
    request: TossPaymentConfirmRequest,
  ): Promise<TossPaymentConfirmResponse> {
    const response = await this.client.post<TossPaymentConfirmResponse>(
      '/api/payments/toss/confirm',
      request,
    );
    return response.data;
  }
}

export default new PaymentService();
