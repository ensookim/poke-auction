import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { typography } from '@/constants/ui';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        styles.base,
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: typography.family,
    includeFontPadding: false,
    letterSpacing: 0,
  },
  default: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  defaultSemiBold: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  title: {
    fontSize: 29,
    fontWeight: '900',
    lineHeight: 35,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  link: {
    lineHeight: 20,
    fontSize: 14,
    fontWeight: '800',
    color: '#E11D48',
  },
});
