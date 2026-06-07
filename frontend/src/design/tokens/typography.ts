import { Platform } from 'react-native';

export const fontFamily = {
  storyRegular: Platform.select({ ios: 'CormorantGaramond-Regular', android: 'CormorantGaramond-Regular', default: 'serif' })!,
  storyMedium: Platform.select({ ios: 'CormorantGaramond-Medium', android: 'CormorantGaramond-Medium', default: 'serif' })!,
  storyItalic: Platform.select({ ios: 'CormorantGaramond-Italic', android: 'CormorantGaramond-Italic', default: 'serif' })!,
  uiRegular: Platform.select({ ios: 'Inter-Regular', android: 'Inter-Regular', default: 'sans-serif' })!,
  uiMedium: Platform.select({ ios: 'Inter-Medium', android: 'Inter-Medium', default: 'sans-serif-medium' })!,
  uiSemibold: Platform.select({ ios: 'Inter-SemiBold', android: 'Inter-SemiBold', default: 'sans-serif' })!,
} as const;

export const fontSize = {
  display: 40,
  chapterTitle: 28,
  sectionTitle: 22,
  body: 18,
  secondary: 15,
  micro: 12,
} as const;

export const lineHeight = {
  display: 1.15,
  chapterTitle: 1.3,
  sectionTitle: 1.35,
  body: 1.7,
  secondary: 1.5,
  micro: 1.4,
} as const;

export const letterSpacing = {
  tight: -0.2,
  normal: 0,
  wide: 0.3,
  wider: 0.5,
  widest: 1.4,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
};

export const measure = {
  proseMin: 45,
  proseMax: 75,
  proseColumnPx: 560,
} as const;

export const narrative = {
  text: '#E7E2DA',
  textSecondary: '#B5ADA0',
  textMuted: '#7A7368',
} as const;
