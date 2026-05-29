import { AxiosInstance } from 'axios';

import { createAuthenticatedClient } from '@/services/apiClient';

export interface ShippingAddressResponse {
  id: number;
  recipientName: string;
  phoneNumber: string;
  address: string;
  addressDetail?: string;
  deliveryMemo?: string;
  updatedAt?: string;
}

export interface ShippingAddressRequest {
  recipientName: string;
  phoneNumber: string;
  address: string;
  addressDetail?: string;
  deliveryMemo?: string;
}

class ShippingAddressService {
  private client: AxiosInstance;

  constructor() {
    this.client = createAuthenticatedClient();
  }

  async get(): Promise<ShippingAddressResponse | null> {
    const response = await this.client.get<ShippingAddressResponse | ''>('/api/shipping-address');
    return response.data || null;
  }

  async save(request: ShippingAddressRequest): Promise<ShippingAddressResponse> {
    const response = await this.client.put<ShippingAddressResponse>('/api/shipping-address', request);
    return response.data;
  }
}

export default new ShippingAddressService();
