import { useRef, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { MessageCircle, Pause, Play, X, ChevronUp, ChevronDown, Rewind, FastForward, Shuffle, SkipForward } from "lucide-react";

import { openTallyForm } from "@/lib/tally";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { Icon } from "@/components/icon";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { PlayingBars } from "@/components/playing-bars";
import { initPostHog } from "@/lib/analytics";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "GraceNotes Daily | Christian Devotional & Prayer Journal" },
      { name: "description", content: "Your daily companion in faith. GraceNotes Daily combines guided devotionals, prayer journaling, and answered prayer tracking in one quiet, beautiful space." },
      { name: "author", content: "GraceNotes Daily" },
      { property: "og:title", content: "GraceNotes Daily | Christian Devotional & Prayer Journal" },
      { property: "og:description", content: "Your daily companion in faith. GraceNotes Daily combines guided devotionals, prayer journaling, and answered prayer tracking in one quiet, beautiful space." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.gracenotesdaily.com" },
      { property: "og:image", content: "https://www.gracenotesdaily.com/og/homepage.png" },
      { name: "twitter:image", content: "https://www.gracenotesdaily.com/og/homepage.png" },
      { name: "theme-color", content: "#2d5a27" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "GraceNotes" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@GraceNotesApp" },
      { name: "twitter:title", content: "GraceNotes Daily | Christian Devotional & Prayer Journal" },
      { name: "twitter:description", content: "Your daily companion in faith. GraceNotes Daily combines guided devotionals, prayer journaling, and answered prayer tracking in one quiet, beautiful space." },
    ],
    links: [
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300;9..144,400;9..144,500;9..144,600&family=Nunito:wght@300;400;500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/**
 * GlobalPlayer — the one true player. Lives here (root layout) so it never
 * unmounts during in-app navigation. Every authenticated page wraps itself
 * in its own <AppShell>, so anything inside AppShell remounts on navigation.
 * Here it is immortal.
 *
 * Expanded modal uses CSS display:none / flex (not conditional rendering) so
 * the iframe never unmounts while a track is active — audio keeps playing
 * even when the modal is hidden. Browsers continue running iframes under
 * display:none.
 */
function GlobalPlayer() {
  const { track, isPlaying, toggle, close, setExpanded, expanded, playNext, toggleShuffle, shuffled, queue } = useAudioPlayer();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const sendYT = (func: "playVideo" | "pauseVideo") => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args: "" }),
      "*"
    );
  };

  // Sync YouTube play/pause via postMessage (works once iframe has loaded)
  useEffect(() => {
    if (!track?.youtubeId) return;
    sendYT(isPlaying ? "playVideo" : "pauseVideo");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, track?.youtubeId]);

  // Sync audio element play/pause. The audio element uses key={track.id} so it
  // remounts (with autoPlay) whenever the track changes — .load() here would
  // restart from 0 on every pause/resume. Only toggle play state.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || track?.youtubeId) return;
    if (isPlaying) {
      a.play().catch((err) => console.error("audio play failed:", err));
    } else {
      a.pause();
    }
  }, [isPlaying, track?.youtubeId]);

  // Media Session API — lock screen / headphone / car controls + metadata
  useEffect(() => {
    if (!("mediaSession" in navigator) || !track) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.speaker,
      album: "GraceNotes Daily",
      artwork: track.thumb ? [{ src: track.thumb, sizes: "512x512", type: "image/jpeg" }] : [],
    });
    navigator.mediaSession.setActionHandler("play", () => useAudioPlayer.getState().toggle());
    navigator.mediaSession.setActionHandler("pause", () => useAudioPlayer.getState().toggle());
    navigator.mediaSession.setActionHandler("nexttrack", () => useAudioPlayer.getState().playNext());
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
    };
  }, [track]);

  // Reset time on track change
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [track?.id]);

  if (!track) return null;

  const categoriesLabel = track.categories.join(" · ");
  const isAudio = !track.youtubeId && !!track.audioUrl;

  const fmt = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const seekBy = (delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min((a.duration || 0), a.currentTime + delta));
    setCurrentTime(a.currentTime);
  };

  const seekTo = (sec: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = sec;
    setCurrentTime(sec);
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* ── Expanded modal ── */}
      <div
        style={{ display: expanded ? "flex" : "none" }}
        className="fixed inset-0 z-[60] items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <div className="w-full max-w-3xl glass-on-hue rounded-3xl overflow-hidden shadow-2xl">

          {/* Controls — above the video */}
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="font-semibold text-white leading-tight truncate">{track.title}</p>
              <p className="text-xs text-white/70 truncate">
                {track.speaker} · {categoriesLabel}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
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

          {/* YouTube */}
          {track.youtubeId && (
            <div className="aspect-video bg-black">
              <iframe
                ref={iframeRef}
                src={`https://www.youtube.com/embed/${track.youtubeId}?enablejsapi=1&autoplay=1`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={track.title}
              />
            </div>
          )}

          {/* Audio-only expanded view with full transport */}
          {isAudio && (
            <div className="p-8 pb-10 text-center">
              <div
                className="w-40 h-40 mx-auto rounded-2xl bg-cover bg-center shadow-xl mb-6"
                style={{ backgroundImage: `url(${track.thumb})` }}
              />
              <p className="font-display text-xl text-white mb-1">{track.title}</p>
              <p className="text-sm text-white/70 mb-6">{track.speaker}</p>

              {/* Scrubber */}
              <div className="max-w-md mx-auto px-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onMouseDown={() => setIsScrubbing(true)}
                  onTouchStart={() => setIsScrubbing(true)}
                  onMouseUp={() => setIsScrubbing(false)}
                  onTouchEnd={() => setIsScrubbing(false)}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  aria-label="Seek"
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-gold"
                  style={{
                    background: `linear-gradient(to right, var(--gold) 0%, var(--gold) ${progressPct}%, rgba(255,255,255,0.18) ${progressPct}%, rgba(255,255,255,0.18) 100%)`,
                  }}
                />
                <div className="flex justify-between text-[11px] text-white/70 mt-1.5 tabular-nums">
                  <span>{fmt(currentTime)}</span>
                  <span>{fmt(duration)}</span>
                </div>
              </div>

              {/* Transport controls */}
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={toggleShuffle}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition ${shuffled ? "bg-gold text-white shadow-md" : "bg-white/15 hover:bg-white/25 text-white/70 hover:text-white"}`}
                  aria-label={shuffled ? "Shuffle on" : "Shuffle off"}
                >
                  <Shuffle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => seekBy(-15)}
                  className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition"
                  aria-label="Rewind 15 seconds"
                >
                  <Rewind className="w-5 h-5" />
                </button>
                <button
                  onClick={toggle}
                  className="w-14 h-14 rounded-full bg-gold hover:scale-105 text-white flex items-center justify-center shadow-lg transition"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6 ml-0.5" fill="currentColor" />}
                </button>
                <button
                  onClick={() => seekBy(15)}
                  className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition"
                  aria-label="Forward 15 seconds"
                >
                  <FastForward className="w-5 h-5" />
                </button>
                <button
                  onClick={playNext}
                  disabled={queue.length <= 1}
                  className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next track"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Persistent audio element (audio-only tracks) ── */}
      {isAudio && (
        <audio
          key={track.id}
          ref={audioRef}
          src={track.audioUrl}
          autoPlay={isPlaying}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => {
            if (!isScrubbing) setCurrentTime(e.currentTarget.currentTime);
          }}
          onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
          onEnded={playNext}
          onError={(e) => console.error("audio element error:", (e.currentTarget as HTMLAudioElement).error)}
          style={{ display: "none" }}
        />
      )}


      {/* ── Mini dock ── */}
      {!expanded && (
        <div className="fixed z-40 left-3 right-3 bottom-20 md:bottom-4 md:left-auto md:right-6 md:w-[360px] animate-slide-up pointer-events-auto">
          <div className="glass-on-hue rounded-2xl overflow-hidden flex items-center gap-3 p-2 relative">
            <span
              className="absolute top-0 left-0 h-0.5 bg-gold rounded-full transition-[width]"
              style={{ width: `${isAudio ? progressPct : 33}%` }}
            />
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
              aria-label="Open player"
            >
              <span
                className="relative w-12 h-12 rounded-xl bg-cover bg-center shrink-0 overflow-hidden"
                style={{ backgroundImage: `url(${track.thumb})` }}
              >
                <span className={`absolute inset-0 flex items-center justify-center ${isPlaying ? "bg-black/45" : "bg-black/60"}`}>
                  <PlayingBars playing={isPlaying} size="md" className="text-gold" />
                </span>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white truncate">
                  {track.title}
                </span>
                <span className="block text-[11px] text-white/70 truncate">
                  {track.speaker} · {categoriesLabel}
                </span>
              </span>
              <Icon icon={ChevronUp} size="sm" className="text-white/80 shrink-0" />
            </button>
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center shrink-0 transition"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              <Icon icon={isPlaying ? Pause : Play} size="sm" tone="inherit" />
            </button>
            {queue.length > 1 && (
              <button
                onClick={playNext}
                className="w-8 h-8 rounded-full hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center shrink-0 transition"
                aria-label="Next track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}
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

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    initPostHog();
  }, []);

  function openFeedback() {
    openTallyForm("VL4NY6");
  }



  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="bottom-center" theme="light" richColors closeButton />
      {/* Floating feedback button — visible on all pages including the authenticated app */}
      <button
        onClick={openFeedback}
        aria-label="Share feedback"
        title="Share feedback"
        className="fixed right-4 md:right-6 z-40 w-11 h-11 md:w-12 md:h-12 rounded-full bg-gold shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
      >
        <MessageCircle className="w-5 h-5 text-white" />
      </button>

      <FeedbackDialog />
      <GlobalPlayer />
    </QueryClientProvider>
  );
}

