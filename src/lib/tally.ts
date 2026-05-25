// Tally helper.
//
// We deliberately do NOT use Tally's popup embed (window.Tally.openPopup).
// The embed mounts an iframe that talks to its parent via iframe-resizer.
// When our app is itself rendered inside an iframe (the Lovable preview,
// some in-app webviews, or any embedded context), that handshake never
// completes and the popup spins forever with "No response from iFrame".
//
// Opening the hosted form in a new tab works everywhere — preview,
// published site, mobile — and submissions still land in the same Tally
// inbox. Keep the surface tiny and consistent.

const HOSTED_URL_BASE = "https://tally.so/r";

export function openTallyForm(formId: string): void {
  if (typeof window === "undefined") return;
  window.open(`${HOSTED_URL_BASE}/${formId}`, "_blank", "noopener,noreferrer");
}
