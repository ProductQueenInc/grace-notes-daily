import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Share2, Copy, X, RefreshCw, Sparkles, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { useShareCard } from "@/hooks/use-share-card";
import type { ShareContext } from "@/lib/share";
import { capture } from "@/lib/analytics";

type Heading = { eyebrow?: string; title: string; subtitle?: string };

/** One-shot flag: shown once per install so users learn the paste pattern. */
const PASTE_HINT_KEY = "gn:share:paste-hint-seen";

function filenameFor(ctx: ShareContext): string {
  switch (ctx.type) {
    case "grace_note":
      return `gracenotes-grace-note-${ctx.note_id}.png`;
    case "answered_prayer":
      return `gracenotes-answered-prayer-${ctx.prayer_id}.png`;
    case "milestone":
      return `gracenotes-${ctx.tier}-day-rhythm.png`;
    case "devotional":
      // Devotional is link-mode; no file download path.
      return `gracenotes-devotional-${ctx.date}.png`;
  }
}

async function imageUrlToFile(url: string, filename: string): Promise<File> {
  const res = await fetch(url, { credentials: "omit", cache: "force-cache" });
  if (!res.ok) throw new Error("image_fetch_failed");
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

export function ShareCardModal({
  open,
  ctx,
  heading,
  onClose,
  onDismiss,
  onShared,
  entryPoint = "manual_button",
}: {
  open: boolean;
  ctx: ShareContext | null;
  heading: Heading;
  onClose: () => void;
  /** Called when user picks "Maybe later" (persists dismissal). */
  onDismiss?: () => void;
  /** Called after the native sheet resolves (success or user cancel). */
  onShared?: () => void;
  /** Analytics only — was this shown automatically or via a manual share button? */
  entryPoint?: "auto_prompt" | "manual_button";
}) {
  // Mode: devotional = link share, grace_note = text share (noteText /
  // verseReference already ride on ctx — no render-share-card round trip
  // needed), everything else = image file share.
  const mode: "link" | "image" | "text" =
    ctx?.type === "devotional" ? "link" : ctx?.type === "grace_note" ? "text" : "image";

  const { data, isFetching, isError, refetch } = useShareCard(ctx, open && mode !== "text");

  // Capability probe (SSR-safe). File-share support varies wildly across
  // browsers; when false we fall back to Download image.
  const [canShareFiles, setCanShareFiles] = useState(false);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.canShare) return;
    try {
      const probe = new File([""], "probe.png", { type: "image/png" });
      setCanShareFiles(navigator.canShare({ files: [probe] }));
    } catch {
      /* noop */
    }
  }, []);

  const canNativeShare = useMemo(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    [],
  );

  const [sharing, setSharing] = useState(false);
  const [forceDownload, setForceDownload] = useState(false);

  // Reset transient state when the modal reopens with a new context.
  useEffect(() => {
    if (open) {
      setSharing(false);
      setForceDownload(false);
    }
  }, [open, ctx?.type]);

  // Any share UI opening, from any of the entry points that render this
  // shared component. Guarded so it only fires once per distinct open.
  const openedRef = useRef<string | null>(null);
  useEffect(() => {
    if (open && ctx) {
      const key = `${ctx.type}:${JSON.stringify(ctx)}:${entryPoint}`;
      if (openedRef.current !== key) {
        openedRef.current = key;
        capture("share_opened", {
          share_type: ctx.type,
          entry_point: entryPoint,
          mode,
          ...(ctx.type === "milestone" ? { tier: ctx.tier } : {}),
        });
      }
    } else {
      openedRef.current = null;
    }
  }, [open, ctx, mode, entryPoint]);

  if (!open || typeof document === "undefined" || !ctx) return null;

  // Answered-prayer/milestone captions are short marketing lines with no
  // link in them today — append the already-fetched trackable share link so
  // whoever receives the share can find their way back (roadmap "traffic
  // that comes back from a share").
  const captionWithLink =
    mode === "image" && data?.caption && data.deep_link
      ? `${data.caption}\n\n${data.deep_link}`
      : data?.caption;

  async function copyCaptionOnly() {
    if (!captionWithLink) return;
    try {
      await navigator.clipboard.writeText(captionWithLink);
      toast.success("Caption copied");
    } catch {
      toast.error("Couldn't copy");
    }
  }

  async function copyLink() {
    if (!data?.deep_link) return;
    try {
      await navigator.clipboard.writeText(data.deep_link);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy");
    }
  }

  async function shareLink() {
    if (!data || !ctx) return;
    // Devotional: title + url only. Never `text` — CLAUDE.md §0 rule #5.
    const payload = { title: "GraceNotes Daily", url: data.deep_link };
    try {
      if (canNativeShare) {
        await navigator.share(payload);
      } else {
        await copyLink();
      }
      capture("share_sheet_resolved", {
        share_type: ctx.type,
        method: canNativeShare ? "native_share" : "clipboard_copy",
      });
      onShared?.();
      onClose();
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") {
        capture("share_cancelled", { share_type: ctx.type, method: "native_share_dismissed" });
      } else {
        toast.error("Couldn't open share sheet");
      }
    }
  }

  /** Grace note share: the note's own words + verse reference, as plain
   * text — no image render, no deep link, nothing to dead-end. */
  async function shareText() {
    if (!ctx || ctx.type !== "grace_note") return;
    const text = `"${ctx.noteText.trim()}"\n\n— ${ctx.verseReference}\n\nToday's grace note from GraceNotes Daily`;
    try {
      if (canNativeShare) {
        await navigator.share({ title: "GraceNotes Daily", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied — paste it anywhere.");
      }
      capture("share_sheet_resolved", {
        share_type: ctx.type,
        method: canNativeShare ? "native_share" : "clipboard_copy",
      });
      onShared?.();
      onClose();
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") {
        capture("share_cancelled", { share_type: ctx.type, method: "native_share_dismissed" });
      } else {
        toast.error("Couldn't open share sheet");
      }
    }
  }

  async function shareImage() {
    if (!data || !ctx) return;
    setSharing(true);
    // Silently copy the caption FIRST so wherever the user lands, paste
    // is one gesture away. Failures fall through — the caption block is
    // still tappable for manual copy.
    let clipboardOk = false;
    if (captionWithLink) {
      try {
        await navigator.clipboard.writeText(captionWithLink);
        clipboardOk = true;
      } catch {
        /* in-app browsers may block; carry on */
      }
    }

    try {
      const file = await imageUrlToFile(data.image_url, filenameFor(ctx));
      await navigator.share({ files: [file], title: "GraceNotes Daily" });

      // First successful share of the session shows the teach-once toast.
      if (clipboardOk && typeof localStorage !== "undefined") {
        const seen = localStorage.getItem(PASTE_HINT_KEY);
        if (!seen) {
          toast("Caption copied — paste it when you get there.");
          localStorage.setItem(PASTE_HINT_KEY, "1");
        }
      }
      capture("share_sheet_resolved", { share_type: ctx.type, method: "native_share" });
      onShared?.();
      onClose();
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "AbortError") {
        // User cancelled from native sheet. Silent.
        capture("share_cancelled", { share_type: ctx.type, method: "native_share_dismissed" });
      } else if ((err as Error)?.message === "image_fetch_failed") {
        toast.error("Couldn't prepare the image");
        setForceDownload(true);
      } else {
        toast.error("Couldn't open share sheet");
        setForceDownload(true);
      }
    } finally {
      setSharing(false);
    }
  }

  function downloadImage() {
    if (!data || !ctx) return;
    // Same-origin, immutable-cached — a plain anchor download works.
    const a = document.createElement("a");
    a.href = data.image_url;
    a.download = filenameFor(ctx);
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Image downloaded");
    capture("share_sheet_resolved", { share_type: ctx.type, method: "image_download" });
    onShared?.();
  }

  function maybeLater() {
    if (ctx) capture("share_cancelled", { share_type: ctx.type, method: "maybe_later" });
    onDismiss?.();
    onClose();
  }

  const showDownloadFallback = mode === "image" && (!canShareFiles || forceDownload);

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
          {/* Image / skeleton (text mode has no image — nothing to render/fetch) */}
          {mode !== "text" && (
            <div className="mx-auto w-full max-w-[260px] aspect-[9/16] rounded-2xl overflow-hidden bg-grace-soft/60 border border-black/5">
              {data && !isFetching ? (
                <img
                  src={data.image_url}
                  alt=""
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full animate-pulse bg-gradient-to-br from-grace-soft to-gold-soft/40" />
              )}
            </div>
          )}

          {/* Text mode (grace note) */}
          {mode === "text" && ctx.type === "grace_note" ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-grace-soft/50 border border-black/5 px-5 py-6 text-center">
                <p className="font-display text-lg leading-relaxed text-grace">
                  &ldquo;{ctx.noteText}&rdquo;
                </p>
                <p className="text-sm text-foreground/60 mt-3">— {ctx.verseReference}</p>
              </div>
              <button
                onClick={shareText}
                className="w-full py-3 rounded-full gradient-gold text-gold-foreground font-semibold shadow flex items-center justify-center gap-2 text-sm"
              >
                <Icon icon={Share2} size="sm" tone="inherit" />
                {canNativeShare ? "Share" : "Copy"}
              </button>
            </div>
          ) : isError ? (
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
          ) : mode === "image" ? (
            <>
              {/* Tappable caption block: the block IS the copy button. */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/60">
                    Your caption
                  </p>

                </div>
                {data && !isFetching && captionWithLink ? (
                  <button
                    type="button"
                    onClick={copyCaptionOnly}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl bg-white/90 border border-border hover:border-grace/40 hover:bg-white transition group relative"
                  >
                    <span className="block text-sm leading-relaxed text-foreground/85 pr-6 whitespace-pre-wrap">
                      {captionWithLink}
                    </span>
                    <Icon
                      icon={Copy}
                      size="sm"
                      className="absolute top-2.5 right-2.5 text-grace/50 group-hover:text-grace/80 transition"
                    />
                  </button>
                ) : (
                  <div className="h-16 rounded-xl bg-grace-soft/50 animate-pulse" />
                )}
              </div>

              {/* Primary action: Share (or Download when file-share unavailable) */}
              <div className="pt-1 space-y-2">
                {showDownloadFallback ? (
                  <button
                    onClick={downloadImage}
                    disabled={!data || isFetching}
                    className="w-full py-3 rounded-full gradient-gold text-gold-foreground font-semibold shadow flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    <Icon icon={Download} size="sm" tone="inherit" />
                    Download image
                  </button>
                ) : (
                  <>
                    <button
                      onClick={shareImage}
                      disabled={!data || isFetching || sharing}
                      className="w-full py-3 rounded-full gradient-gold text-gold-foreground font-semibold shadow flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                    >
                      {sharing ? (
                        <>
                          <Icon icon={Loader2} size="sm" tone="inherit" className="animate-spin" />
                          Preparing…
                        </>
                      ) : (
                        <>
                          <Icon icon={Share2} size="sm" tone="inherit" />
                          Share
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-foreground/55 text-center px-2">
                      Caption is copied when you tap Share — paste it when you get there.
                    </p>
                  </>
                )}
              </div>
            </>
          ) : (
            // Link mode (devotional)
            <div className="pt-1">
              <button
                onClick={shareLink}
                disabled={!data || isFetching}
                className="w-full py-3 rounded-full gradient-gold text-gold-foreground font-semibold shadow flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <Icon icon={Share2} size="sm" tone="inherit" />
                {canNativeShare ? "Share" : "Copy link"}
              </button>
            </div>
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
