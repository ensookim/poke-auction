import { DeviceEventEmitter } from 'react-native';

export type AppToastType = 'success' | 'error' | 'info';

export type AppToastPayload = {
  title: string;
  message?: string;
  type?: AppToastType;
};

export const showToast = (payload: AppToastPayload) => {
  DeviceEventEmitter.emit('appToast', payload);
};
