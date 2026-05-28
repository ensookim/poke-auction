import React, { useEffect, useRef, useState } from 'react';
import { Animated, DeviceEventEmitter, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppToastPayload, AppToastType } from '@/services/toastService';
import appSettingsService from '@/services/appSettingsService';

const toastMeta: Record<AppToastType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { icon: 'checkmark-circle', color: '#0F766E' },
  error: { icon: 'alert-circle', color: '#DC2626' },
  info: { icon: 'information-circle', color: '#2563EB' },
};

export function AppToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<AppToastPayload | null>(null);
  const [enabled, setEnabled] = useState(true);
  const translateY = useRef(new Animated.Value(-120)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.timing(translateY, {
      toValue: -140,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setToast(null));
  };

  useEffect(() => {
    appSettingsService.isToastEnabled().then(setEnabled).catch(() => setEnabled(true));

    const settingsSubscription = DeviceEventEmitter.addListener(
      'appSettingsChanged',
      (settings: { toastEnabled?: boolean }) => {
        if (typeof settings.toastEnabled === 'boolean') {
          setEnabled(settings.toastEnabled);
          if (!settings.toastEnabled) {
            hide();
          }
        }
      },
    );

    const subscription = DeviceEventEmitter.addListener('appToast', (payload: AppToastPayload) => {
      if (!enabled) {
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setToast(payload);
      translateY.setValue(-140);
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
      timerRef.current = setTimeout(hide, 2600);
    });

    return () => {
      subscription.remove();
      settingsSubscription.remove();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, translateY]);

  if (!toast) {
    return null;
  }

  const meta = toastMeta[toast.type ?? 'info'];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 10,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.toast}>
        <View style={[styles.iconWrap, { backgroundColor: `${meta.color}18` }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={styles.copy}>
          <ThemedText style={styles.title}>{toast.title}</ThemedText>
          {toast.message ? (
            <ThemedText style={styles.message} numberOfLines={2}>
              {toast.message}
            </ThemedText>
          ) : null}
        </View>
        <Pressable style={styles.closeButton} onPress={hide}>
          <Ionicons name="close" size={17} color="#667085" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    left: 0,
    paddingHorizontal: 14,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  toast: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    maxWidth: 520,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    width: '100%',
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  copy: { flex: 1 },
  title: { color: '#101828', fontSize: 14, fontWeight: '900' },
  message: { color: '#667085', fontSize: 12, lineHeight: 17, marginTop: 2 },
  closeButton: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
});
