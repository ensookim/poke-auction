import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';

import { BACKEND_URL } from '@/services/apiConfig';
import { LoginResponse, tokenStorage } from '@/services/authService';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _retryCount?: number;
};

let refreshPromise: Promise<LoginResponse> | null = null;

export class AuthSessionExpiredError extends Error {
  constructor() {
    super('로그인이 만료됐어요. 다시 로그인해주세요.');
    this.name = 'AuthSessionExpiredError';
  }
}

export const isAuthSessionExpiredError = (
  error: unknown,
): error is AuthSessionExpiredError =>
  error instanceof AuthSessionExpiredError ||
  (error instanceof Error && error.name === 'AuthSessionExpiredError');

const refreshTokens = async (): Promise<LoginResponse> => {
  const refreshToken = await tokenStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('refreshToken이 없습니다.');
  }

  const response = await axios.post<LoginResponse>(
    `${BACKEND_URL}/api/auth/refresh`,
    { refreshToken },
  );

  await Promise.all([
    tokenStorage.setItem('accessToken', response.data.accessToken),
    tokenStorage.setItem('refreshToken', response.data.refreshToken),
    tokenStorage.setItem(
      'user',
      JSON.stringify({
        id: response.data.userId,
        nickname: response.data.nickname,
      }),
    ),
  ]);

  return response.data;
};

export const createAuthenticatedClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: BACKEND_URL,
    timeout: 10000,
  });

  client.interceptors.request.use(async (config) => {
    const token = await tokenStorage.getItem('accessToken');
    if (token) {
      config.headers = new AxiosHeaders({
        ...(config.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${token}`,
      });
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetryableRequestConfig | undefined;

      const isTransientNetworkError = !error.response || error.code === 'ECONNABORTED';
      if (config && isTransientNetworkError) {
        const retryCount = config._retryCount ?? 0;
        if (retryCount < 1) {
          config._retryCount = retryCount + 1;
          await new Promise((resolve) => setTimeout(resolve, 350));
          return client(config);
        }
      }

      if (error.response?.status !== 401 || !config || config._retry) {
        throw error;
      }

      config._retry = true;

      try {
        refreshPromise = refreshPromise ?? refreshTokens();
        const refreshed = await refreshPromise;
        refreshPromise = null;

        config.headers = new AxiosHeaders({
          ...(config.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${refreshed.accessToken}`,
        });

        return client(config);
      } catch (refreshError) {
        refreshPromise = null;
        await Promise.all([
          tokenStorage.removeItem('accessToken'),
          tokenStorage.removeItem('refreshToken'),
          tokenStorage.removeItem('user'),
        ]);
        throw new AuthSessionExpiredError();
      }
    },
  );

  return client;
};
