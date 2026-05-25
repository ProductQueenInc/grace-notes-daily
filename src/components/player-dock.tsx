/**
 * Player logic has moved to <GlobalPlayer> in __root.tsx so the player
 * persists across all route navigations (each page creates its own AppShell
 * instance, which would remount and restart the iframe on every navigation).
 *
 * This stub satisfies the import in app-shell.tsx without rendering anything.
 */
export function PlayerDock() {
  return null;
}
