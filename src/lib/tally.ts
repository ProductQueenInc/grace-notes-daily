// In-app Tally feedback dialog state.
//
// We render Tally's hosted form inside an iframe in a Radix Dialog so the
// experience stays inside the app (no new tab, no popup handshake issues).
import { create } from "zustand";

type FeedbackStore = {
  open: boolean;
  formId: string | null;
  openFeedback: (formId: string) => void;
  closeFeedback: () => void;
};

export const useFeedbackDialog = create<FeedbackStore>((set) => ({
  open: false,
  formId: null,
  openFeedback: (formId) => set({ open: true, formId }),
  closeFeedback: () => set({ open: false }),
}));

export function openTallyForm(formId: string): void {
  useFeedbackDialog.getState().openFeedback(formId);
}

export function tallyEmbedUrl(formId: string): string {
  // We intentionally do NOT pass transparentBackground — that caused Tally to
  // inherit the dialog's cream background and render its own labels in a near-
  // identical tone (invisible text). Letting Tally use its default white shell
  // keeps form text readable.
  const params = new URLSearchParams({
    alignLeft: "1",
    hideTitle: "1",
  });
  return `https://tally.so/embed/${formId}?${params.toString()}`;
}
