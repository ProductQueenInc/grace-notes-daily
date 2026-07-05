import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { Share2, Copy, X, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { useShareCard } from "@/hooks/use-share-card";
import type { ShareContext } from "@/lib/share";

type Heading = { eyebrow?: string; title: string; subtitle?: string };

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
  /** Called after the native sheet resolves (success or user cancel). */
  onShared?: () => void;
}) {
  const { data, isFetching, isError, refetch } = useShareCard(ctx, open);
  const [caption, setCaption] = useState("");

  // Reset editable caption when a new card lands.
  useEffect(() => {
    if (data?.caption) setCaption(data.caption);
  }, [data?.caption]);

  const canNativeShare = useMemo(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    [],
  );

  if (!open || typeof document === "undefined") return null;

  async function share() {
    if (!data) return;
    // Version A: title + url only. Never send `text` — some share targets
    // concatenate it onto the URL and break the deep link (see CLAUDE.md).
    const payload = { title: "GraceNotes Daily", url: data.deep_link };
    try {
      if (canNativeShare) {
        await navigator.share(payload);
      } else {
        await navigator.clipboard.writeText(data.deep_link);
        toast.success("Link copied");
      }
      onShared?.();
      onClose();
    } catch (err) {
      // User cancel throws AbortError — quietly ignore.
      if ((err as { name?: string })?.name !== "AbortError") {
        toast.error("Couldn't open share sheet");
      }
    }
  }

  async function copyCaption() {
    if (!caption.trim()) return;
    try {
      await navigator.clipboard.writeText(caption);
      toast.success("Caption copied");
    } catch {
      toast.error("Couldn't copy");
    }
  }

  function maybeLater() {
    onDismiss?.();
    onClose();
  }

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
          {/* Image / skeleton */}
          <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-grace-soft/60 border border-black/5">
            {data && !isFetching ? (
              <img
                src={data.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full animate-pulse bg-gradient-to-br from-grace-soft to-gold-soft/40" />
            )}
          </div>

          {/* Caption */}
          {isError ? (
            <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4 text-sm">
              <p className="text-foreground/80 mb-3">
                Couldn't build your share card. Let's try again.
              </p>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-grace text-white font-semibold text-sm"
              >
                <Icon icon={RefreshCw} size="sm" tone="inherit" />
                Try again
              </button>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/60 mb-1.5">
                Caption
              </label>
              {data && !isFetching ? (
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-border focus:outline-none focus:ring-2 focus:ring-grace resize-none text-sm leading-relaxed"
                  placeholder="Say something to go with it…"
                />
              ) : (
                <div className="h-16 rounded-xl bg-grace-soft/50 animate-pulse" />
              )}
              <p className="text-[11px] text-foreground/50 mt-1.5">
                Edited caption is copied to your clipboard. The share sheet
                sends the link only.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={copyCaption}
              disabled={!data || isFetching || !caption.trim()}
              className="py-3 rounded-full border-2 border-grace text-grace font-semibold flex items-center justify-center gap-1.5 text-sm disabled:opacity-50"
            >
              <Icon icon={Copy} size="sm" tone="inherit" /> Copy caption
            </button>
            <button
              onClick={share}
              disabled={!data || isFetching || isError}
              className="py-3 rounded-full gradient-gold text-gold-foreground font-semibold shadow flex items-center justify-center gap-1.5 text-sm disabled:opacity-50"
            >
              <Icon icon={Share2} size="sm" tone="inherit" /> Share
            </button>
          </div>

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
