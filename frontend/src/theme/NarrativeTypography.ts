import { TextStyle, Platform } from 'react-native';
import { NarrativeTheme } from './NarrativeThemeEngine';

export interface StoryTextStyle extends TextStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  color: string;
}

export interface NarrativeTypography {
  story: StoryTextStyle;
  storyDimmed: StoryTextStyle;
  storyFocused: StoryTextStyle;
  chapterTitle: TextStyle;
  sectionBreak: TextStyle;
  dialogue: StoryTextStyle;
  emphasis: StoryTextStyle;
  ui: {
    heading: TextStyle;
    subheading: TextStyle;
    body: TextStyle;
    caption: TextStyle;
    tiny: TextStyle;
    label: TextStyle;
  };
}

const STORY_FONT_SERIF = Platform.select({
  ios: 'CormorantGaramond-Regular',
  android: 'CormorantGaramond-Regular',
  default: 'serif',
});

const STORY_FONT_SERIF_MEDIUM = Platform.select({
  ios: 'CormorantGaramond-Medium',
  android: 'CormorantGaramond-Medium',
  default: 'serif',
});

const UI_FONT = Platform.select({
  ios: 'Inter-Regular',
  android: 'Inter-Regular',
  default: 'sans-serif',
});

const UI_FONT_MEDIUM = Platform.select({
  ios: 'Inter-Medium',
  android: 'Inter-Medium',
  default: 'sans-serif-medium',
});

const UI_FONT_SEMIBOLD = Platform.select({
  ios: 'Inter-SemiBold',
  android: 'Inter-SemiBold',
  default: 'sans-serif',
});

export function buildTypography(theme: NarrativeTheme): NarrativeTypography {
  const { colors, typography, spacing } = theme;

  const baseStory: StoryTextStyle = {
    fontFamily: STORY_FONT_SERIF,
    fontSize: typography.storySize,
    lineHeight: typography.storySize * typography.storyLineHeight,
    letterSpacing: typography.storyLetterSpacing,
    color: colors.text,
  };

  return {
    story: {
      ...baseStory,
    },

    storyDimmed: {
      ...baseStory,
      color: colors.textMuted,
      opacity: 0.6,
    },

    storyFocused: {
      ...baseStory,
      fontFamily: STORY_FONT_SERIF_MEDIUM,
      color: colors.text,
    },

    chapterTitle: {
      fontFamily: STORY_FONT_SERIF_MEDIUM,
      fontSize: typography.h2,
      lineHeight: typography.h2 * 1.4,
      letterSpacing: 0.5,
      color: colors.accent,
      marginBottom: spacing.lg,
      textAlign: 'center' as const,
    },

    sectionBreak: {
      fontFamily: STORY_FONT_SERIF,
      fontSize: typography.body,
      lineHeight: typography.body * 1.8,
      letterSpacing: 2,
      color: colors.textMuted,
      textAlign: 'center' as const,
      marginVertical: spacing.xl,
    },

    dialogue: {
      ...baseStory,
      fontStyle: 'italic' as const,
      paddingLeft: spacing.sm,
      borderLeftWidth: 2,
      borderLeftColor: colors.accentSubtle,
    },

    emphasis: {
      ...baseStory,
      fontFamily: STORY_FONT_SERIF_MEDIUM,
      color: colors.accent,
    },

    ui: {
      heading: {
        fontFamily: UI_FONT_SEMIBOLD,
        fontSize: typography.h1,
        lineHeight: typography.h1 * 1.3,
        color: colors.text,
      },

      subheading: {
        fontFamily: UI_FONT_MEDIUM,
        fontSize: typography.h2,
        lineHeight: typography.h2 * 1.35,
        color: colors.text,
      },

      body: {
        fontFamily: UI_FONT,
        fontSize: typography.body,
        lineHeight: typography.body * 1.5,
        color: colors.text,
      },

      caption: {
        fontFamily: UI_FONT,
        fontSize: typography.caption,
        lineHeight: typography.caption * 1.4,
        color: colors.textSecondary,
      },

      tiny: {
        fontFamily: UI_FONT,
        fontSize: typography.tiny,
        lineHeight: typography.tiny * 1.4,
        color: colors.textMuted,
      },

      label: {
        fontFamily: UI_FONT_MEDIUM,
        fontSize: typography.caption,
        lineHeight: typography.caption * 1.3,
        color: colors.textSecondary,
        letterSpacing: 0.5,
        textTransform: 'uppercase' as const,
      },
    },
  };
}

export function getEmphasisStyle(
  theme: NarrativeTheme,
  type: 'thought' | 'memory' | 'narration' | 'whisper'
): StoryTextStyle {
  const { colors, typography, spacing } = theme;

  const base: StoryTextStyle = {
    fontFamily: STORY_FONT_SERIF,
    fontSize: typography.storySize,
    lineHeight: typography.storySize * typography.storyLineHeight,
    letterSpacing: typography.storyLetterSpacing,
    color: colors.text,
  };

  switch (type) {
    case 'thought':
      return {
        ...base,
        fontStyle: 'italic' as const,
        color: colors.textSecondary,
      };

    case 'memory':
      return {
        ...base,
        color: colors.textMuted,
        letterSpacing: typography.storyLetterSpacing + 0.3,
      };

    case 'narration':
      return {
        ...base,
        fontFamily: STORY_FONT_SERIF_MEDIUM,
        color: colors.accent,
      };

    case 'whisper':
      return {
        ...base,
        fontSize: typography.storySize - 1,
        color: colors.textMuted,
        letterSpacing: typography.storyLetterSpacing + 0.5,
      };

    default:
      return base;
  }
}

export function getDialogueStyle(
  theme: NarrativeTheme,
  intensity: number
): StoryTextStyle {
  const { colors, typography, spacing } = theme;

  return {
    fontFamily: STORY_FONT_SERIF,
    fontSize: typography.storySize,
    lineHeight: typography.storySize * typography.storyLineHeight,
    letterSpacing: typography.storyLetterSpacing,
    color: colors.text,
    fontStyle: intensity > 0.7 ? 'normal' : 'italic',
    paddingLeft: intensity > 0.7 ? 0 : spacing.sm,
    borderLeftWidth: intensity > 0.7 ? 0 : 2,
    borderLeftColor: intensity > 0.7 ? 'transparent' : colors.accentSubtle,
  };
}
