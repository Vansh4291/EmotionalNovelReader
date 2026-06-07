export const radii = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const semanticRadii = {
  card: radii.lg,
  control: radii.md,
  chip: radii.pill,
  prose: 0,
  focusIndicator: radii.xs,
  atmosphere: radii.none,
} as const;

export const borderWidth = {
  none: 0,
  hairline: 0.5,
  subtle: 1,
  emphasis: 2,
} as const;
