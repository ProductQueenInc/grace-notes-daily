/**
 * Feature flags.
 *
 * Flip these to bring a paused feature back. Keep the code paths intact so
 * re-enabling is a one-line change, not a re-implementation.
 */
export const FEATURES = {
  /**
   * Listen (worship / prayer / teaching audio). Hidden from the UI while we
   * decide when to invest in it properly. Route file, player, hook, and
   * Supabase table all remain in the codebase.
   */
  listen: false,
  /**
   * Rendered-card preview modal for sharing. When false, the share sheet is
   * just a link-intent platform chooser (no image, no download, no native
   * share). When true, the old preview modal returns.
   */
  shareImagePreview: false,
  /**
   * Editable caption block inside the share modal. Only meaningful when
   * shareImagePreview is true.
   */
  shareCaptions: false,
} as const;
