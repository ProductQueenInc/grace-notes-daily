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
import { MessageCircle } from "lucide-react";

import { openTallyForm } from "@/lib/tally";



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
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gold shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
      >
        <MessageCircle className="w-5 h-5 text-white" />
      </button>
    </QueryClientProvider>
  );
}
