// Tiny helper around the Tally popup widget.
//
// The Tally embed.js loads async, so a fast click can fire before
// `window.Tally` exists. This helper makes sure the script is present
// and waits up to ~5s for the global to appear before opening.

declare global {
  interface Window {
    Tally?: {
      openPopup: (formId: string, options?: Record<string, unknown>) => void;
      loadEmbeds?: () => void;
    };
  }
}

const SCRIPT_SRC = "https://tally.so/widgets/embed.js";

export function ensureTallyScript(): void {
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src*="tally.so/widgets/embed.js"]`)) return;
  const s = document.createElement("script");
  s.src = SCRIPT_SRC;
  s.async = true;
  document.head.appendChild(s);
}

function waitForTally(timeoutMs = 5000): Promise<Window["Tally"] | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    if (window.Tally) return resolve(window.Tally);

    const start = Date.now();
    const interval = window.setInterval(() => {
      if (window.Tally) {
        window.clearInterval(interval);
        resolve(window.Tally);
      } else if (Date.now() - start > timeoutMs) {
        window.clearInterval(interval);
        resolve(null);
      }
    }, 100);
  });
}

export async function openTallyPopup(
  formId: string,
  options: Record<string, unknown> = {},
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  ensureTallyScript();
  const tally = await waitForTally();
  if (!tally) {
    // Fallback: open the hosted form in a new tab so the user is never stuck.
    window.open(`https://tally.so/r/${formId}`, "_blank", "noopener,noreferrer");
    return false;
  }
  tally.openPopup(formId, options);
  return true;
}
