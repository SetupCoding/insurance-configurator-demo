/**
 * Vertical alignment for a medium contained Button that carries a start icon.
 *
 * MUI's default line-height is looser than the icon is tall, which leaves the
 * label sitting visibly above centre next to it. The remaining ~1px after that
 * is font and glyph-metric asymmetry that line-height alone cannot close, so it
 * is measured and nudged directly.
 *
 * Shared rather than repeated, because the submit and retry buttons are the
 * same control in two states and a drifting one-pixel correction between them
 * is invisible until they are seen side by side.
 */
export const ICON_LABEL_ALIGNMENT = {
  lineHeight: 1,
  '& .MuiButton-startIcon': { position: 'relative', top: -1 },
} as const;
