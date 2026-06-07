import { DeviceEventEmitter } from 'react-native';

import appSettingsService, { ToastCategory } from '@/services/appSettingsService';

export type AppToastType = 'success' | 'error' | 'info';

export type AppToastPayload = {
  title: string;
  message?: string;
  type?: AppToastType;
  category?: ToastCategory;
  onPress?: () => void;
};

export const showToast = async (payload: AppToastPayload) => {
  if (!(await appSettingsService.isToastEnabled(payload.category))) {
    return;
  }

  DeviceEventEmitter.emit('appToast', payload);
};
