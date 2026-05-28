import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { createAuthenticatedClient } from '@/services/apiClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private client = createAuthenticatedClient();

  async registerPushToken(): Promise<void> {
    if (Platform.OS === 'web') {
      return;
    }

    const permission = await Notifications.getPermissionsAsync();
    const finalPermission = permission.granted
      ? permission
      : await Notifications.requestPermissionsAsync();

    if (!finalPermission.granted) {
      return;
    }

    const token = await Notifications.getExpoPushTokenAsync();
    await this.client.post('/api/notifications/push-token', {
      token: token.data,
      platform: Platform.OS,
    });
  }
}

export default new NotificationService();
