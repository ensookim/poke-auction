import { DeviceEventEmitter } from 'react-native';

import { tokenStorage } from '@/services/authService';

const TOAST_ENABLED_KEY = 'settings:toastEnabled';

class AppSettingsService {
  async isToastEnabled(): Promise<boolean> {
    const stored = await tokenStorage.getItem(TOAST_ENABLED_KEY);
    return stored !== 'false';
  }

  async setToastEnabled(enabled: boolean): Promise<void> {
    await tokenStorage.setItem(TOAST_ENABLED_KEY, String(enabled));
    DeviceEventEmitter.emit('appSettingsChanged', { toastEnabled: enabled });
  }
}

export default new AppSettingsService();
