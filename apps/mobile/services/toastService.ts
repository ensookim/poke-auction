import { DeviceEventEmitter } from 'react-native';

import appSettingsService from '@/services/appSettingsService';

export type AppToastType = 'success' | 'error' | 'info';

export type AppToastPayload = {
  title: string;
  message?: string;
  type?: AppToastType;
};

export const showToast = async (payload: AppToastPayload) => {
  if (!(await appSettingsService.isToastEnabled())) {
    return;
  }

  DeviceEventEmitter.emit('appToast', payload);
};
