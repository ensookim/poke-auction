import Constants from 'expo-constants';
import { Platform } from 'react-native';

const RAW_BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8080';

const getHostFromExpoConstants = (): string | null => {
  const constants = Constants as typeof Constants & {
    manifest2?: {
      extra?: {
        expoClient?: {
          hostUri?: string;
        };
      };
    };
  };

  const hostString =
    Constants.manifest?.debuggerHost ||
    (Constants.expoConfig?.hostUri as string | undefined) ||
    constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.linkingUri?.replace(/^[^:]+:\/\//, '');

  if (!hostString) {
    return null;
  }

  return hostString.replace(/^\/\//, '').split(':')[0];
};

export const getBackendUrl = (): string => {
  if (Platform.OS === 'web') {
    return RAW_BACKEND_URL;
  }

  if (!RAW_BACKEND_URL.includes('localhost') && !RAW_BACKEND_URL.includes('127.0.0.1')) {
    return RAW_BACKEND_URL;
  }

  const expoHost = getHostFromExpoConstants();
  if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1') {
    return `http://${expoHost}:8080`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080';
  }

  return RAW_BACKEND_URL;
};

export const BACKEND_URL = getBackendUrl();

export const getWebSocketUrl = (): string => BACKEND_URL.replace(/^http/, 'ws');
