import { DeviceEventEmitter } from 'react-native';

import { tokenStorage } from '@/services/authService';

const TOAST_ENABLED_KEY = 'settings:toastEnabled';
const BID_TOAST_ENABLED_KEY = 'settings:toast:bid';
const CHAT_TOAST_ENABLED_KEY = 'settings:toast:chat';

export type ToastCategory = 'bid' | 'chat' | 'system';

export type ToastSettings = {
  all: boolean;
  bid: boolean;
  chat: boolean;
};

class AppSettingsService {
  async getToastSettings(): Promise<ToastSettings> {
    const [all, bid, chat] = await Promise.all([
      tokenStorage.getItem(TOAST_ENABLED_KEY),
      tokenStorage.getItem(BID_TOAST_ENABLED_KEY),
      tokenStorage.getItem(CHAT_TOAST_ENABLED_KEY),
    ]);

    return {
      all: all !== 'false',
      bid: bid !== 'false',
      chat: chat !== 'false',
    };
  }

  async isToastEnabled(category: ToastCategory = 'system'): Promise<boolean> {
    const settings = await this.getToastSettings();
    if (!settings.all) {
      return false;
    }

    if (category === 'bid') {
      return settings.bid;
    }

    if (category === 'chat') {
      return settings.chat;
    }

    return true;
  }

  async setToastEnabled(enabled: boolean): Promise<void> {
    await tokenStorage.setItem(TOAST_ENABLED_KEY, String(enabled));
    DeviceEventEmitter.emit('appSettingsChanged', await this.getToastSettings());
  }

  async setBidToastEnabled(enabled: boolean): Promise<void> {
    await tokenStorage.setItem(BID_TOAST_ENABLED_KEY, String(enabled));
    DeviceEventEmitter.emit('appSettingsChanged', await this.getToastSettings());
  }

  async setChatToastEnabled(enabled: boolean): Promise<void> {
    await tokenStorage.setItem(CHAT_TOAST_ENABLED_KEY, String(enabled));
    DeviceEventEmitter.emit('appSettingsChanged', await this.getToastSettings());
  }
}

export default new AppSettingsService();
