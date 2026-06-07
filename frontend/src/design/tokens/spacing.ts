export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  cinematic: 48,
} as const;

export type SpacingToken = keyof typeof spacing;
export type SpacingValue = (typeof spacing)[SpacingToken];

export const semanticSpacing = {
  pageGutter: spacing.xl,
  pageTop: spacing.cinematic,
  pageBottom: spacing.xxl,
  sectionGap: spacing.xxl,
  blockGap: spacing.lg,
  inlineGap: spacing.sm,
  controlGap: spacing.md,
  proseColumnMax: 560,
  proseColumnMin: 320,
} as const;
