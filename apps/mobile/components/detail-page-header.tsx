import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { palette } from '@/constants/ui';

export function DetailPageHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <View style={styles.header}>
      <ThemedText style={styles.eyebrow}>{eyebrow}</ThemedText>
      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    paddingTop: 8,
    paddingBottom: 16,
  },
  eyebrow: {
    color: palette.brand,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  title: {
    color: palette.ink,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 36,
  },
});
