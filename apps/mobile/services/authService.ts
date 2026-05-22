import axios, { AxiosHeaders, AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';

const RAW_BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8080';
const KAKAO_APP_ID = process.env.EXPO_PUBLIC_KAKAO_APP_ID;
const KAKAO_REDIRECT_URI = process.env.EXPO_PUBLIC_KAKAO_REDIRECT_URI;
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
    console.log('🔗 Web mode - BACKEND_URL:', RAW_BACKEND_URL);
    return RAW_BACKEND_URL;
  }

  const isLocalhost = RAW_BACKEND_URL.includes('localhost');
  if (!isLocalhost) {
    console.log(
      '🔗 Native mode (non-localhost) - BACKEND_URL:',
      RAW_BACKEND_URL,
    );
    return RAW_BACKEND_URL;
  }

  const backendHost = getBackendHostFromConstants();
  const finalUrl = backendHost ? `http://${backendHost}:8080` : RAW_BACKEND_URL;
  console.log('🔗 Native mode (localhost conversion):');
  console.log('   debuggerHost:', backendHost);
  console.log('   BACKEND_URL:', finalUrl);
  return finalUrl;
})();

export const tokenStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb && typeof window !== 'undefined') {
      return Promise.resolve(window.localStorage.getItem(key));
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb && typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb && typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
      return;
    }

    await SecureStore.deleteItemAsync(key);
  },
};

const getKakaoRedirectUri = (): string => {
  if (isWeb && KAKAO_REDIRECT_URI) {
    return KAKAO_REDIRECT_URI;
  }

  return makeRedirectUri({
    scheme: 'cardbid',
    path: 'kakao/callback',
  });
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
  getKakaoLoginUrl(): string {
    const params = new URLSearchParams({
      client_id: KAKAO_APP_ID || '',
      redirect_uri: getKakaoRedirectUri(),
      response_type: 'code',
    });

    return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * 액세스 토큰 가져오기
   */
  async getAccessToken(): Promise<string | null> {
    return tokenStorage.getItem('accessToken');
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
