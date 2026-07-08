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
} as const;
