import { useEffect } from 'react';
import { router, usePathname } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import chatService from '@/services/chatService';
import notificationService from '@/services/notificationService';
import { showToast } from '@/services/toastService';

export function ChatNotificationListener() {
  const { isSignedIn, user } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    notificationService.registerPushToken().catch(() => null);
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || !user) {
      return;
    }

    let closed = false;
    let connection: Awaited<ReturnType<typeof chatService.openWatcher>> | null = null;

    chatService.openWatcher((event) => {
      if (event.type !== 'MESSAGE' || !event.message || event.message.senderId === user.id) {
        return;
      }

      if (pathname.startsWith('/chats/')) {
        return;
      }

      showToast({
        type: 'info',
        title: event.message.senderNickname,
        message: event.message.content,
      });
    }).then((socket) => {
      if (closed) {
        socket.close();
        return;
      }
      connection = socket;
    }).catch(() => null);

    return () => {
      closed = true;
      connection?.close();
    };
  }, [isSignedIn, pathname, user]);

  return null;
}
