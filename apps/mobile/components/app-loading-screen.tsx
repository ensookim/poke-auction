import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';

type AppLoadingScreenProps = {
  title?: string;
  message?: string;
};

export function AppLoadingScreen({
  title = 'CardBid',
  message = '실시간 경매장을 준비하고 있어요',
}: AppLoadingScreenProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const glowStyle = {
    opacity: pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.28, 0.7],
    }),
    transform: [
      {
        scale: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1.08],
        }),
      },
    ],
  };

  const cardStyle = {
    transform: [
      {
        translateY: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [4, -4],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <View style={styles.visual}>
        <Animated.View style={[styles.glow, glowStyle]} />
        <Animated.View style={[styles.card, cardStyle]}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardLabel}>RARE</ThemedText>
            <Ionicons name="sparkles" size={16} color="#F59E0B" />
          </View>
          <View style={styles.cardArt}>
            <Ionicons name="flash" size={42} color="#FEE500" />
          </View>
          <View style={styles.cardLine} />
          <View style={styles.cardLineShort} />
        </Animated.View>
      </View>

      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={styles.message}>{message}</ThemedText>

      <View style={styles.dots}>
        {[0, 1, 2].map((item) => (
          <LoadingDot key={item} pulse={pulse} index={item} />
        ))}
      </View>
    </View>
  );
}

function LoadingDot({
  pulse,
  index,
}: {
  pulse: Animated.Value;
  index: number;
}) {
  const opacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange:
      index === 0
        ? [1, 0.45, 0.45]
        : index === 1
          ? [0.45, 1, 0.45]
          : [0.45, 0.45, 1],
  });

  return <Animated.View style={[styles.dot, { opacity }]} />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  visual: {
    alignItems: 'center',
    height: 178,
    justifyContent: 'center',
    marginBottom: 18,
    width: 178,
  },
  glow: {
    backgroundColor: '#FEE500',
    borderRadius: 78,
    height: 156,
    position: 'absolute',
    width: 156,
  },
  card: {
    backgroundColor: '#111827',
    borderColor: 'rgba(255,255,255,0.75)',
    borderRadius: 8,
    borderWidth: 2,
    height: 142,
    padding: 12,
    width: 104,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  cardArt: {
    alignItems: 'center',
    backgroundColor: '#2A2100',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    marginVertical: 12,
  },
  cardLine: {
    backgroundColor: '#475467',
    borderRadius: 2,
    height: 6,
    marginBottom: 6,
  },
  cardLineShort: {
    backgroundColor: '#667085',
    borderRadius: 2,
    height: 6,
    width: '68%',
  },
  title: {
    color: '#101828',
    fontSize: 26,
    fontWeight: '900',
  },
  message: {
    color: '#667085',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 24,
  },
  dot: {
    backgroundColor: '#111827',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
});
