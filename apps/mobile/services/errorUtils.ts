import { AxiosError, isAxiosError } from 'axios';

import { isAuthSessionExpiredError } from '@/services/apiClient';

export const isNetworkError = (error: unknown): boolean => {
  if (!isAxiosError(error)) {
    return false;
  }

  if (!error.response) {
    return true;
  }

  return error.code === 'ECONNABORTED';
};

export const getFriendlyErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  if (isAuthSessionExpiredError(error)) {
    return '로그인이 만료됐어요. 다시 로그인해주세요.';
  }

  if (isNetworkError(error)) {
    return '네트워크 연결이 불안정해요. 와이파이 또는 데이터 상태를 확인하고 다시 시도해주세요.';
  }

  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    const messageFromBody =
      axiosError.response?.data?.message || axiosError.response?.data?.error;
    if (messageFromBody) {
      return messageFromBody;
    }
    if (axiosError.message) {
      return axiosError.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};
