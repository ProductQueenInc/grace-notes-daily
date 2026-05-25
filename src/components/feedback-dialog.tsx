import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useFeedbackDialog, tallyEmbedUrl } from "@/lib/tally";

export function FeedbackDialog() {
  const { open, formId, closeFeedback } = useFeedbackDialog();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) closeFeedback(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-background">
        <DialogHeader className="px-6 pt-6 pb-2">
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
            className="w-full h-[70vh] border-0 bg-transparent"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
