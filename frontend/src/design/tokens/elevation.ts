import { Platform, ViewStyle } from 'react-native';

export const elevation = {
  flat: 0,
  emergence: 1,
  lift: 2,
  float: 3,
} as const;

export const shadow = {
  none: {
    shadowOpacity: 0,
    elevation: 0,
  },
  whisper: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 2,
    },
    android: {
      elevation: 1,
    },
    default: {},
  }) as ViewStyle,
  soft: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.22,
      shadowRadius: 6,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }) as ViewStyle,
  glow: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
    },
    android: {
      elevation: 3,
    },
    default: {},
  }) as ViewStyle,
} as const;

export const surfaceBlend = {
  base: 0.0,
  raised: 0.03,
  overlay: 0.06,
  inset: -0.02,
} as const;
