import { useRef, useEffect } from "react";
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
import { MessageCircle, Pause, Play, X, ChevronUp, ChevronDown } from "lucide-react";

import { openTallyForm } from "@/lib/tally";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { Icon } from "@/components/icon";
import { useAudioPlayer } from "@/hooks/use-audio-player";

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
  const { track, isPlaying, toggle, close, setExpanded, expanded } = useAudioPlayer();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

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

  // Sync audio element play/pause
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
      {/* ── Expanded modal ──────────────────────────────────────────────
          display:none keeps the iframe alive in the DOM.
          Our header bar sits above the iframe; YouTube's UI stays inside
          the iframe box — zero overlap with our controls.                 */}
      <div
        style={{ display: expanded ? "flex" : "none" }}
        className="fixed inset-0 z-[60] items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <div className="w-full max-w-3xl glass-on-hue rounded-3xl overflow-hidden shadow-2xl">

          {/* Controls — above the video, never inside the iframe */}
          <div className="flex items-center justify-between gap-4 p-4">
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

          {/* YouTube — contained box, never full-screen */}
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

          {/* Audio-only expanded view */}
          {!track.youtubeId && track.audioUrl && (
            <div className="p-8 pb-10 text-center">
              <div
                className="w-40 h-40 mx-auto rounded-2xl bg-cover bg-center shadow-xl mb-6"
                style={{ backgroundImage: `url(${track.thumb})` }}
              />
              <p className="font-display text-xl text-white mb-1">{track.title}</p>
              <p className="text-sm text-white/70">{track.speaker}</p>
            </div>
          )}

        </div>
      </div>

      {/* ── Persistent audio element (audio-only tracks) ── */}
      {!track.youtubeId && track.audioUrl && (
        <audio
          ref={audioRef}
          src={track.audioUrl}
          autoPlay={isPlaying}
          style={{ display: "none" }}
        />
      )}

      {/* ── Mini dock ── */}
      {!expanded && (
        <div className="fixed z-40 left-3 right-3 bottom-20 md:bottom-4 md:left-auto md:right-6 md:w-[360px] animate-slide-up pointer-events-auto">
          <div className="glass-on-hue rounded-2xl overflow-hidden flex items-center gap-3 p-2 relative">
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

