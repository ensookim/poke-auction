import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { DeviceEventEmitter } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { palette, typography } from '@/constants/ui';

export default function TabLayout() {
  const lastHomeTabPressRef = React.useRef(0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarActiveTintColor: palette.ink,
        tabBarInactiveTintColor: '#A1A1AA',
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontFamily: typography.family,
          fontSize: 11,
          fontWeight: '800',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: '#F4F4F5',
          borderTopColor: '#E4E4E7',
          height: 74,
          paddingBottom: 11,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            if (!navigation.isFocused()) {
              lastHomeTabPressRef.current = 0;
              return;
            }

            const now = Date.now();
            if (now - lastHomeTabPressRef.current < 350) {
              DeviceEventEmitter.emit('homeTabDoublePress');
            }
            lastHomeTabPressRef.current = now;
          },
        })}
      />
      <Tabs.Screen
        name="buy"
        options={{
          title: '검색',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: '등록',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size + 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: '채팅',
          tabBarBadge: 0,
          tabBarBadgeStyle: { display: 'none' },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: 'MY',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="my-bids" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
