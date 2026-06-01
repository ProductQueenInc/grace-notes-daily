import { useState } from "react";
import { X, Download, Mail } from "lucide-react";
import { DoveMark } from "@/components/dove-mark";

interface DownloadGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  guideTitle: string;
  beehiivFormUrl: string; // paste your Beehiiv embed URL here per guide
}

export function DownloadGuideModal({
  isOpen,
  onClose,
  guideTitle,
  beehiivFormUrl,
}: DownloadGuideModalProps) {
  const [step, setStep] = useState<"form" | "success">("form");

  if (!isOpen) return null;

  function handleBeehiivMessage(e: React.SyntheticEvent<HTMLIFrameElement>) {
    // Beehiiv posts a message when subscription is successful.
    // We listen for it to advance to the success step.
    void e;
  }

  // Listen for Beehiiv success message from iframe
  if (typeof window !== "undefined") {
    window.onmessage = (e: MessageEvent) => {
      if (
        typeof e.data === "string" &&
        (e.data.includes("beehiiv") || e.data.includes("subscribed"))
      ) {
        setStep("success");
      }
    };
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md glass-parchment rounded-3xl overflow-hidden shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {step === "form" ? (
          <div className="p-8">
            <div className="text-center mb-6">
              <DoveMark variant="medallion" className="w-12 h-12 mx-auto mb-4" />
              <div className="flex items-center justify-center gap-2 mb-2">
                <Download className="w-4 h-4 text-gold" />
                <span className="text-gold text-sm font-semibold uppercase tracking-wider">Free Download</span>
              </div>
              <h2 className="font-display text-2xl text-white mb-2">{guideTitle}</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Enter your email and we'll send you the PDF along with a weekly grace note from GraceNotes Daily.
              </p>
            </div>

            {/* Beehiiv embed — replace the src with your actual Beehiiv form embed URL */}
            {beehiivFormUrl ? (
              <iframe
                src={beehiivFormUrl}
                className="w-full"
                style={{ height: "180px", border: "none" }}
                onLoad={handleBeehiivMessage}
                title="Subscribe to download"
              />
            ) : (
              /* Fallback shown while Beehiiv isn't wired up yet */
              <div className="bg-white/5 rounded-2xl p-4 text-center">
                <Mail className="w-8 h-8 text-gold mx-auto mb-3" />
                <p className="text-white/60 text-sm">
                  Beehiiv form coming soon — check back shortly.
                </p>
              </div>
            )}

            <p className="text-white/40 text-xs text-center mt-4">
              No spam. Unsubscribe any time.
            </p>
          </div>
        ) : (
          <div className="p-8 text-center">
            <DoveMark variant="medallion" className="w-14 h-14 mx-auto mb-4" />
            <h2 className="font-display text-2xl text-white mb-3">Check your inbox</h2>
            <p className="text-white/75 text-sm leading-relaxed mb-6">
              Your PDF is on its way. We've also sent you your first weekly grace note — a soft word to start the week well.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-full bg-gold text-white font-semibold text-sm hover:bg-gold/90 transition"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface DownloadGuideButtonProps {
  guideTitle: string;
  beehiivFormUrl?: string;
  className?: string;
  children?: React.ReactNode;
}

export function DownloadGuideButton({
  guideTitle,
  beehiivFormUrl = "",
  className,
  children,
}: DownloadGuideButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className}
      >
        {children ?? (
          <span className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download free PDF
          </span>
        )}
      </button>
      <DownloadGuideModal
        isOpen={open}
        onClose={() => setOpen(false)}
        guideTitle={guideTitle}
        beehiivFormUrl={beehiivFormUrl}
      />
    </>
  );
}
