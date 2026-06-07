import axios, { AxiosHeaders, AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { BACKEND_URL } from '@/services/apiConfig';

const KAKAO_APP_ID = process.env.EXPO_PUBLIC_KAKAO_APP_ID;
const KAKAO_WEB_REDIRECT_URI = process.env.EXPO_PUBLIC_KAKAO_WEB_REDIRECT_URI;

const KAKAO_NATIVE_REDIRECT_URI =
  process.env.EXPO_PUBLIC_KAKAO_NATIVE_REDIRECT_URI;
const isWeb = Platform.OS === 'web';

export const tokenStorage = {
  async getItem(key: string): Promise<string | null> {
    const storageKey = normalizeStorageKey(key);
    if (isWeb && typeof window !== 'undefined') {
      return Promise.resolve(window.localStorage.getItem(storageKey));
    }
    return SecureStore.getItemAsync(storageKey);
  },

  async setItem(key: string, value: string): Promise<void> {
    const storageKey = normalizeStorageKey(key);
    if (isWeb && typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, value);
      return;
    }

    await SecureStore.setItemAsync(storageKey, value);
  },

  async removeItem(key: string): Promise<void> {
    const storageKey = normalizeStorageKey(key);
    if (isWeb && typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
      return;
    }

    await SecureStore.deleteItemAsync(storageKey);
  },
};

const normalizeStorageKey = (key: string) => {
  const normalized = key.trim().replace(/[^A-Za-z0-9_.-]/g, '_');
  if (!normalized) {
    throw new Error('Storage key must not be empty.');
  }
  return normalized;
};

const getKakaoRedirectUri = (): string => {
  if (isWeb) {
    return KAKAO_WEB_REDIRECT_URI || 'http://localhost:8081/kakao/callback';
  }

  return (
    KAKAO_NATIVE_REDIRECT_URI ||
    `${BACKEND_URL}/api/auth/kakao/callback`
  );
};
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: number;
  nickname: string;
  isNewUser: boolean;
}

export interface KakaoLoginRequest {
  code: string;
  redirectUri: string;
}

interface NicknameAvailabilityResponse {
  available: boolean;
}

const isJwtExpired = (token: string): boolean => {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return true;
    }

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '=',
    );
    const decoded = atob(paddedPayload);
    const data = JSON.parse(decoded) as { exp?: number };

    return typeof data.exp !== 'number' || data.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

class AuthService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BACKEND_URL,
      timeout: 10000,
    });

    // 요청 인터셉터: accessToken 자동 추가
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

  /**
   * 카카오 로그인 (인가 코드 -> 백엔드로 전달)
   */
  async kakaoLogin(code: string): Promise<LoginResponse> {
    const redirectUri = getKakaoRedirectUri();
    const request: KakaoLoginRequest = {
      code,
      redirectUri,
    };

    const response = await this.client.post<LoginResponse>(
      '/api/auth/kakao',
      request,
    );
    return response.data;
  }

  /**
   * 리디렉트 URI를 반환합니다.
   */
  getRedirectUri(): string {
    return getKakaoRedirectUri();
  }

  /**
   * 카카오 로그인 URL 생성
   */
  getKakaoLoginUrl(appRedirectUri?: string): string {
    const params = new URLSearchParams({
      client_id: KAKAO_APP_ID || '',
      redirect_uri: getKakaoRedirectUri(),
      response_type: 'code',
    });

    if (appRedirectUri) {
      params.set('state', appRedirectUri);
    }

    return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * 액세스 토큰 가져오기
   */
  async getAccessToken(): Promise<string | null> {
    return tokenStorage.getItem('accessToken');
  }

  async hasValidAccessToken(): Promise<boolean> {
    const token = await this.getAccessToken();
    return Boolean(token && !isJwtExpired(token));
  }

  async refreshSession(): Promise<LoginResponse | null> {
    const refreshToken = await tokenStorage.getItem('refreshToken');
    if (!refreshToken || isJwtExpired(refreshToken)) {
      return null;
    }

    const response = await axios.post<LoginResponse>(
      `${BACKEND_URL}/api/auth/refresh`,
      { refreshToken },
    );

    await this.saveTokens(response.data.accessToken, response.data.refreshToken);
    await this.saveUser({
      id: response.data.userId,
      nickname: response.data.nickname,
    });

    return response.data;
  }

  async checkNicknameAvailability(nickname: string): Promise<boolean> {
    const response = await this.client.get<NicknameAvailabilityResponse>(
      '/api/auth/nickname/available',
      {
        params: { nickname },
      },
    );
    return response.data.available;
  }

  async updateNickname(nickname: string): Promise<LoginResponse> {
    const response = await this.client.patch<LoginResponse>('/api/auth/nickname', {
      nickname,
    });

    await this.saveTokens(response.data.accessToken, response.data.refreshToken);
    await this.saveUser({
      id: response.data.userId,
      nickname: response.data.nickname,
    });

    return response.data;
  }

  async withdraw(): Promise<void> {
    await this.client.delete('/api/auth/me');
    await this.clearTokens();
  }

  async acceptRequiredAgreements(): Promise<void> {
    await this.client.post('/api/auth/agreements');
  }

  /**
   * 사용자 정보 저장
   */
  async saveUser(user: { id: number; nickname: string }): Promise<void> {
    await tokenStorage.setItem('user', JSON.stringify(user));
  }

  /**
   * 저장된 사용자 정보 가져오기
   */
  async getStoredUser(): Promise<{ id: number; nickname: string } | null> {
    const stored = await tokenStorage.getItem('user');
    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as { id: number; nickname: string };
    } catch (error) {
      console.error('Failed to parse stored user:', error);
      await this.clearStoredUser();
      return null;
    }
  }

  /**
   * 사용자 정보 저장
   */
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      tokenStorage.setItem('accessToken', accessToken),
      tokenStorage.setItem('refreshToken', refreshToken),
    ]);
  }

  /**
   * 사용자 정보 삭제
   */
  async clearStoredUser(): Promise<void> {
    await tokenStorage.removeItem('user');
  }

  /**
   * 토큰 삭제 (로그아웃)
   */
  async clearTokens(): Promise<void> {
    await Promise.all([
      tokenStorage.removeItem('accessToken'),
      tokenStorage.removeItem('refreshToken'),
    ]);
    await this.clearStoredUser();
  }
}

export default new AuthService();
