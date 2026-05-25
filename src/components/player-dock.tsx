import { useRef, useEffect } from "react";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { Icon } from "@/components/icon";
import { Pause, Play, X, ChevronUp, ChevronDown } from "lucide-react";

/**
 * Persistent player that lives inside <AppShell> and never unmounts during
 * authenticated navigation.
 *
 * YouTube tracks: one iframe is kept in the DOM at all times. When minimised
 * the iframe is hidden (1x1 px, opacity 0) but still running so audio
 * continues seamlessly as the user navigates. When expanded the same iframe
 * is repositioned to fill the screen — no src change, no reload.
 *
 * Audio tracks: a hidden <audio> element is kept in the DOM; play/pause is
 * controlled via the ref's play() / pause() methods.
 */
export function PlayerDock() {
  const { track, isPlaying, toggle, close, setExpanded, expanded } = useAudioPlayer();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Send play/pause commands to the YouTube iframe via postMessage.
  // autoplay=1 in the URL handles the very first play; postMessage handles
  // subsequent toggle calls once the player is ready.
  const sendYT = (func: "playVideo" | "pauseVideo") => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args: "" }),
      "*"
    );
  };

  useEffect(() => {
    if (!track?.youtubeId) return;
    sendYT(isPlaying ? "playVideo" : "pauseVideo");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, track?.youtubeId]);

  useEffect(() => {
    if (!audioRef.current || track?.youtubeId) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, track?.youtubeId, track?.audioUrl]);

  if (!track) return null;

  const categoriesLabel = track.categories.join(" · ");

  return (
    <>
      {/* ── Persistent YouTube iframe ─────────────────────────────────────
          CSS-toggled, never unmounted. When minimised it is invisible but
          still active so audio continues during in-app navigation.         */}
      {track.youtubeId && (
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${track.youtubeId}?enablejsapi=1&autoplay=1`}
          allow="autoplay; encrypted-media"
          allowFullScreen
          title={track.title}
          style={
            expanded
              ? {
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                  zIndex: 51,
                }
              : {
                  position: "fixed",
                  bottom: 0,
                  right: 0,
                  width: "1px",
                  height: "1px",
                  opacity: 0,
                  pointerEvents: "none",
                  border: "none",
                  zIndex: -1,
                }
          }
        />
      )}

      {/* ── Persistent audio element (audio-only tracks) ─────────────── */}
      {!track.youtubeId && track.audioUrl && (
        <audio
          ref={audioRef}
          src={track.audioUrl}
          autoPlay={isPlaying}
          style={{ display: "none" }}
        />
      )}

      {/* ── Expanded overlay ─────────────────────────────────────────── */}
      {expanded && (
        <>
          {/* Backdrop sits below the iframe */}
          <div className="fixed inset-0 bg-black/90 z-50" />

          {/* For audio-only: show album art centered on the backdrop */}
          {!track.youtubeId && (
            <div className="fixed inset-0 z-[52] flex items-center justify-center p-6 pointer-events-none">
              <div className="text-center">
                <div
                  className="w-48 h-48 mx-auto rounded-2xl bg-cover bg-center shadow-2xl mb-6"
                  style={{ backgroundImage: `url(${track.thumb})` }}
                />
                <p className="font-display text-2xl text-white mb-1">{track.title}</p>
                <p className="text-sm text-white/70">{track.speaker}</p>
              </div>
            </div>
          )}

          {/* Controls bar — above the iframe (z-53) */}
          <div className="fixed top-0 inset-x-0 z-[53] flex items-center justify-between gap-4 p-4 bg-gradient-to-b from-black/70 to-transparent pointer-events-auto">
            <div className="min-w-0">
              <p className="font-semibold text-white leading-tight truncate">{track.title}</p>
              <p className="text-xs text-white/70 truncate">
                {track.speaker} · {categoriesLabel}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={toggle}
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                <Icon icon={isPlaying ? Pause : Play} size="sm" tone="inherit" />
              </button>
              <button
                onClick={() => setExpanded(false)}
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition"
                aria-label="Minimise player"
              >
                <Icon icon={ChevronDown} size="sm" tone="inherit" />
              </button>
              <button
                onClick={close}
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white/70 flex items-center justify-center transition"
                aria-label="Close player"
              >
                <Icon icon={X} size="sm" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Mini dock (shown when minimised) ─────────────────────────── */}
      {!expanded && (
        <div className="fixed z-40 left-3 right-3 bottom-20 md:bottom-4 md:left-auto md:right-6 md:w-[360px] animate-slide-up pointer-events-auto">
          <div className="glass-on-hue rounded-2xl overflow-hidden flex items-center gap-3 p-2 relative">
            {/* Decorative progress hint */}
            <span className="absolute top-0 left-0 h-0.5 w-1/3 bg-gold/80 rounded-full" />
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
              aria-label="Open player"
            >
              <span
                className="w-12 h-12 rounded-xl bg-cover bg-center shrink-0"
                style={{ backgroundImage: `url(${track.thumb})` }}
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white truncate">
                  {track.title}
                </span>
                <span className="block text-[11px] text-white/70 truncate">
                  {track.speaker} · {categoriesLabel}
                </span>
              </span>
              <Icon icon={ChevronUp} size="sm" className="text-white/60 shrink-0" />
            </button>
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center shrink-0 transition"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              <Icon icon={isPlaying ? Pause : Play} size="sm" tone="inherit" />
            </button>
            <button
              onClick={close}
              className="w-8 h-8 rounded-full hover:bg-white/15 text-white/70 flex items-center justify-center shrink-0 transition"
              aria-label="Close player"
            >
              <Icon icon={X} size="sm" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
