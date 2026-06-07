import { TextStyle } from 'react-native';
import { NarrativeTheme } from './NarrativeThemeEngine';
import {
  fontFamily,
  lineHeight,
  letterSpacing,
  fontWeight,
  narrative as narrativeInk,
  measure,
  dialogue as dialogueTokens,
  atmosphereOpacity,
} from '../design';

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
    display: TextStyle;
    heading: TextStyle;
    subheading: TextStyle;
    body: TextStyle;
    secondary: TextStyle;
    caption: TextStyle;
    micro: TextStyle;
    tiny: TextStyle;
    label: TextStyle;
  };
  measure: {
    proseColumnMaxWidth: number;
    proseMinChars: number;
    proseMaxChars: number;
  };
}

const STORY_FONT_SERIF = fontFamily.storyRegular;
const STORY_FONT_SERIF_MEDIUM = fontFamily.storyMedium;
const UI_FONT = fontFamily.uiRegular;
const UI_FONT_MEDIUM = fontFamily.uiMedium;
const UI_FONT_SEMIBOLD = fontFamily.uiSemibold;

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
      opacity: atmosphereOpacity.proseDim,
    },

    storyFocused: {
      ...baseStory,
      fontFamily: STORY_FONT_SERIF_MEDIUM,
      color: colors.text,
    },

    chapterTitle: {
      fontFamily: STORY_FONT_SERIF_MEDIUM,
      fontSize: typography.h1,
      lineHeight: typography.h1 * lineHeight.chapterTitle,
      letterSpacing: letterSpacing.wider,
      color: colors.accent,
      marginBottom: spacing.lg,
      textAlign: 'center' as const,
    },

    sectionBreak: {
      fontFamily: STORY_FONT_SERIF,
      fontSize: typography.body,
      lineHeight: typography.body * 1.8,
      letterSpacing: letterSpacing.widest,
      color: colors.textMuted,
      textAlign: 'center' as const,
      marginVertical: spacing.xl,
    },

    dialogue: {
      ...baseStory,
      fontStyle: 'italic' as const,
      paddingLeft: dialogueTokens.indentPx,
      marginTop: dialogueTokens.marginTopPx,
      marginBottom: dialogueTokens.marginBottomPx,
      borderLeftWidth: 0,
    },

    emphasis: {
      ...baseStory,
      fontFamily: STORY_FONT_SERIF_MEDIUM,
      color: colors.accent,
    },

    ui: {
      display: {
        fontFamily: STORY_FONT_SERIF_MEDIUM,
        fontSize: typography.display,
        lineHeight: typography.display * lineHeight.display,
        letterSpacing: letterSpacing.tight,
        color: colors.text,
        fontWeight: fontWeight.regular,
      },

      heading: {
        fontFamily: UI_FONT_SEMIBOLD,
        fontSize: typography.h1,
        lineHeight: typography.h1 * lineHeight.chapterTitle,
        letterSpacing: letterSpacing.wider,
        color: colors.text,
        fontWeight: fontWeight.semibold,
      },

      subheading: {
        fontFamily: UI_FONT_MEDIUM,
        fontSize: typography.h2,
        lineHeight: typography.h2 * lineHeight.sectionTitle,
        letterSpacing: letterSpacing.wide,
        color: colors.text,
        fontWeight: fontWeight.medium,
      },

      body: {
        fontFamily: UI_FONT,
        fontSize: typography.body,
        lineHeight: typography.body * lineHeight.body,
        letterSpacing: letterSpacing.normal,
        color: colors.text,
        fontWeight: fontWeight.regular,
      },

      secondary: {
        fontFamily: UI_FONT,
        fontSize: typography.secondary,
        lineHeight: typography.secondary * lineHeight.secondary,
        letterSpacing: letterSpacing.normal,
        color: colors.textSecondary,
        fontWeight: fontWeight.regular,
      },

      caption: {
        fontFamily: UI_FONT,
        fontSize: typography.caption,
        lineHeight: typography.caption * lineHeight.micro,
        letterSpacing: letterSpacing.wide,
        color: colors.textSecondary,
        fontWeight: fontWeight.regular,
      },

      micro: {
        fontFamily: UI_FONT,
        fontSize: typography.micro,
        lineHeight: typography.micro * lineHeight.micro,
        letterSpacing: letterSpacing.wider,
        color: colors.textMuted,
        fontWeight: fontWeight.regular,
      },

      tiny: {
        fontFamily: UI_FONT,
        fontSize: typography.micro,
        lineHeight: typography.micro * lineHeight.micro,
        letterSpacing: letterSpacing.wider,
        color: colors.textMuted,
        fontWeight: fontWeight.regular,
      },

      label: {
        fontFamily: UI_FONT_MEDIUM,
        fontSize: typography.caption,
        lineHeight: typography.caption * 1.3,
        letterSpacing: letterSpacing.widest,
        color: colors.textMuted,
        fontWeight: fontWeight.medium,
        textTransform: 'uppercase' as const,
      },
    },

    measure: {
      proseColumnMaxWidth: measure.proseColumnPx,
      proseMinChars: measure.proseMin,
      proseMaxChars: measure.proseMax,
    },
  };
}

export function getEmphasisStyle(
  theme: NarrativeTheme,
  type: 'thought' | 'memory' | 'narration' | 'whisper'
): StoryTextStyle {
  const { colors, typography } = theme;

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
        letterSpacing: typography.storyLetterSpacing + letterSpacing.wide,
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
        letterSpacing: typography.storyLetterSpacing + letterSpacing.wider,
      };

    default:
      return base;
  }
}

export function getDialogueStyle(
  theme: NarrativeTheme,
  intensity: number
): StoryTextStyle {
  const { colors, typography } = theme;
  const isIntense = intensity > 0.7;

  return {
    fontFamily: STORY_FONT_SERIF,
    fontSize: typography.storySize,
    lineHeight: typography.storySize * typography.storyLineHeight,
    letterSpacing: typography.storyLetterSpacing,
    color: isIntense ? colors.text : colors.textSecondary,
    fontStyle: isIntense ? 'normal' : 'italic',
    paddingLeft: isIntense ? 0 : dialogueTokens.indentPx,
    borderLeftWidth: 0,
  };
}

export { narrativeInk };
