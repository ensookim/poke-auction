import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppLoadingScreen } from '@/components/app-loading-screen';
import { AppToastHost } from '@/components/app-toast-host';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isLoading, isSignedIn } = useAuth();

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          animationDuration: 220,
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      >
        {isSignedIn ? (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="modal"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="notifications"
              options={{
                animation: 'fade_from_bottom',
              }}
            />
            <Stack.Screen
              name="following"
              options={{
                animation: 'fade_from_bottom',
              }}
            />
            <Stack.Screen
              name="legal-notice"
              options={{
                animation: 'fade_from_bottom',
              }}
            />
            <Stack.Screen
              name="sellers/[id]"
              options={{
                animation: 'fade_from_bottom',
              }}
            />
            <Stack.Screen
              name="nickname"
              options={{
                animation: 'fade_from_bottom',
              }}
            />
          </>
        ) : (
          <Stack.Screen
            name="login"
            options={{
              headerShown: false,
            }}
          />
        )}
      </Stack>
      <StatusBar style="auto" />
      <AppToastHost />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
