import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useFeedbackDialog, tallyEmbedUrl } from "@/lib/tally";

export function FeedbackDialog() {
  const { open, formId, closeFeedback } = useFeedbackDialog();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) closeFeedback(); }}>
      {/*
        Mobile sizing rules:
        - Cap total dialog height at 75svh (small viewport height) so iOS Safari's
          bottom chrome never hides the submit button.
        - Use flex column so the iframe fills only the remaining space below the
          header, not a fixed 70vh (which used to overflow past the screen).
      */}
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-background flex flex-col max-h-[75svh] sm:max-h-[80vh] rounded-2xl gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="font-display text-2xl text-grace">Share feedback</DialogTitle>
          <DialogDescription className="text-foreground/60">
            We read every message — thank you for helping us shape GraceNotes Daily.
          </DialogDescription>
        </DialogHeader>
        {formId && (
          <iframe
            src={tallyEmbedUrl(formId)}
            title="Feedback form"
            loading="lazy"
            className="w-full flex-1 min-h-0 border-0 bg-transparent"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
