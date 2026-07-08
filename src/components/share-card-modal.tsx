import { createPortal } from "react-dom";
import { useEffect } from "react";
import {
  X,
  Sparkles,
  Copy,
  Twitter,
  Facebook,
  MessageCircle,
  Send,
  Linkedin,
  Mail,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  AtSign,
} from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { useShareCard } from "@/hooks/use-share-card";
import type { ShareContext } from "@/lib/share";
import { FEATURES } from "@/lib/feature-flags";

type Heading = { eyebrow?: string; title: string; subtitle?: string };

type PlatformKey =
  | "x"
  | "facebook"
  | "threads"
  | "whatsapp"
  | "telegram"
  | "linkedin"
  | "reddit"
  | "email"
  | "sms"
  | "copy";

type Platform = {
  key: PlatformKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Build the target URL. Return null to hide the button. */
  buildUrl: (link: string, title: string) => string | null;
  /** Only show on touch devices when true. */
  mobileOnly?: boolean;
};

const PLATFORMS: Platform[] = [
  {
    key: "x",
    label: "X",
    icon: Twitter,
    buildUrl: (link) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}`,
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: Facebook,
    buildUrl: (link) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
  },
  {
    key: "threads",
    label: "Threads",
    icon: AtSign,
    buildUrl: (link) => `https://www.threads.net/intent/post?text=${encodeURIComponent(link)}`,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    buildUrl: (link) => `https://wa.me/?text=${encodeURIComponent(link)}`,
  },
  {
    key: "telegram",
    label: "Telegram",
    icon: Send,
    buildUrl: (link) => `https://t.me/share/url?url=${encodeURIComponent(link)}`,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    buildUrl: (link) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
  },
  {
    key: "email",
    label: "Email",
    icon: Mail,
    buildUrl: (link, title) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(link)}`,
  },
  {
    key: "sms",
    label: "Messages",
    icon: MessageCircle,
    buildUrl: (link) => `sms:?body=${encodeURIComponent(link)}`,
    mobileOnly: true,
  },
];

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function ShareCardModal({
  open,
  ctx,
  heading,
  onClose,
  onDismiss,
  onShared,
}: {
  open: boolean;
  ctx: ShareContext | null;
  heading: Heading;
  onClose: () => void;
  /** Called when user picks "Maybe later" (persists dismissal). */
  onDismiss?: () => void;
  /** Called after the user picks a platform. */
  onShared?: () => void;
}) {
  // Still fires so a share_events row is created and we get deep_link back.
  // Ignore data.image_url and data.caption while shareImagePreview is off.
  const { data, isFetching, isError, refetch } = useShareCard(ctx, open);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open || typeof document === "undefined" || !ctx) return null;

  // Legacy preview modal — kept behind the flag for when we bring it back.
  // Body-swap: when the flag is on, load the old preview implementation.
  if (FEATURES.shareImagePreview) {
    // The full preview flow is intentionally not restored in this build.
    // Flipping the flag on requires bringing the old implementation back.
    // For now, fall through to the chooser so the flag never breaks the UI.
  }

  const link = data?.deep_link ?? "";
  const title = heading.title || "GraceNotes Daily";
  const mobile = isMobile();

  function openPlatform(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    onShared?.();
    onClose();
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
      onShared?.();
      onClose();
    } catch {
      toast.error("Couldn't copy");
    }
  }

  function maybeLater() {
    onDismiss?.();
    onClose();
  }

  const visiblePlatforms = PLATFORMS.filter((p) => !p.mobileOnly || mobile);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-md p-0 md:p-6">
      <div className="w-full md:max-w-md bg-background md:rounded-3xl rounded-t-3xl shadow-2xl fade-up max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-gradient-to-b from-background to-background/80 px-5 py-3.5 flex items-start justify-between gap-3 border-b border-black/5">
          <div className="min-w-0">
            {heading.eyebrow && (
              <p className="text-[11px] uppercase tracking-[0.2em] text-grace/70 flex items-center gap-1.5">
                <Icon icon={Sparkles} size="sm" className="text-gold" />
                {heading.eyebrow}
              </p>
            )}
            <h2 className="font-display text-xl md:text-2xl text-grace mt-0.5">
              {heading.title}
            </h2>
            {heading.subtitle && (
              <p className="text-sm text-foreground/65 mt-1">{heading.subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-9 h-9 rounded-full hover:bg-black/5 flex items-center justify-center text-foreground/60"
          >
            <Icon icon={X} size="md" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-foreground/70">Where would you like to share this?</p>

          {isError ? (
            <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4 text-sm">
              <p className="text-foreground/80 mb-3">
                Couldn't prepare your share link. Let's try again.
              </p>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-grace text-white font-semibold text-sm"
              >
                <Icon icon={RefreshCw} size="sm" tone="inherit" />
                Try again
              </button>
            </div>
          ) : isFetching || !link ? (
            <div className="flex items-center justify-center py-8 text-foreground/60 text-sm gap-2">
              <Icon icon={Loader2} size="sm" className="animate-spin" tone="inherit" />
              Preparing your link…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2">
                {visiblePlatforms.map((p) => {
                  const url = p.buildUrl(link, title);
                  if (!url) return null;
                  return (
                    <button
                      key={p.key}
                      onClick={() => openPlatform(url)}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/90 border border-border hover:border-grace/40 hover:bg-white transition py-3 px-1"
                    >
                      <span className="w-10 h-10 rounded-full bg-grace/10 text-grace inline-flex items-center justify-center">
                        <p.icon className="w-5 h-5" />
                      </span>
                      <span className="text-[11px] text-foreground/75 leading-none">
                        {p.label}
                      </span>
                    </button>
                  );
                })}
                <button
                  onClick={copyLink}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/90 border border-border hover:border-grace/40 hover:bg-white transition py-3 px-1"
                >
                  <span className="w-10 h-10 rounded-full bg-gold/15 text-gold-foreground inline-flex items-center justify-center">
                    <Copy className="w-5 h-5 text-grace" />
                  </span>
                  <span className="text-[11px] text-foreground/75 leading-none">
                    Copy link
                  </span>
                </button>
              </div>

              <div className="pt-1">
                <div className="flex items-center gap-2 rounded-xl bg-grace-soft/40 border border-black/5 px-3 py-2 text-xs text-foreground/60">
                  <Icon icon={LinkIcon} size="sm" tone="inherit" className="shrink-0" />
                  <span className="truncate">{link}</span>
                </div>
              </div>
            </>
          )}

          <button
            onClick={maybeLater}
            className="w-full text-sm text-foreground/60 hover:text-foreground/80 py-2"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
