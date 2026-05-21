import { Platform } from 'react-native';

export const palette = {
  ink: '#15171A',
  muted: '#6B7280',
  subtle: '#9CA3AF',
  line: '#E5E7EB',
  canvas: '#F5F6F8',
  surface: '#FFFFFF',
  brand: '#E11D48',
  brandDark: '#9F1239',
  night: '#101522',
  success: '#0F766E',
  warning: '#B45309',
};

export const typography = {
  family: Platform.select({
    ios: 'Apple SD Gothic Neo',
    android: 'sans-serif',
    web: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    default: undefined,
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    web: "'SFMono-Regular', Consolas, monospace",
    default: undefined,
  }),
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 10,
};

export const shadow = Platform.select({
  web: {
    boxShadow: '0 16px 36px rgba(15, 23, 42, 0.08)',
  },
  default: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
});
