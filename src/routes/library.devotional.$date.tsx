import { createFileRoute, notFound } from "@tanstack/react-router";
import { getStoredDevotional, getDevotionalNeighbours } from "@/lib/ai-stubs";
import { logShareClick } from "@/lib/share.functions";
import { DevotionalView, devotionalHead } from "@/components/devotional-view";
import type { DevotionalResult } from "@/lib/ai.functions";
import type { NeighbourInfo } from "@/lib/devotional-archive.functions";

function isValidDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T12:00:00Z"));
}

export const Route = createFileRoute("/library/devotional/$date")({
  // Read-only. Serves the stored row or 404 (no on-demand generation from
  // arbitrary dated URLs). Generation lives in the cron + today path.
  // ?s=<share_token> is PLG share attribution: logged fire-and-forget into
  // share_clicks (never blocks or fails the page), then ignored by the view.
  // Tokens are 8 hex chars as of 2026-07-22 (shortened from 32).
  validateSearch: (search: Record<string, unknown>): { s?: string } => {
    const s = typeof search.s === "string" && /^[0-9a-f]{8}$/i.test(search.s) ? search.s : undefined;
    return s ? { s } : {};
  },
  loaderDeps: ({ search }) => ({ s: search.s }),
  loader: async ({
    params,
    deps,
  }): Promise<{
    devotional: DevotionalResult;
    date: string;
    prev: NeighbourInfo;
    next: NeighbourInfo;
  }> => {
    if (!isValidDate(params.date)) throw notFound();
    if (deps.s) {
      // Fire-and-forget; logShareClick swallows its own errors.
      void logShareClick({ data: { token: deps.s } });
    }
    const [devotional, neighbours] = await Promise.all([
      getStoredDevotional(params.date),
      getDevotionalNeighbours({ data: { date: params.date } }),
    ]);
    if (!devotional) throw notFound();
    return {
      devotional,
      date: params.date,
      prev: neighbours.prev,
      next: neighbours.next,
    };
  },
  head: ({ loaderData }) => devotionalHead(loaderData?.devotional ?? undefined, loaderData?.date),
  component: LibraryDevotionalDateRoute,
});

function LibraryDevotionalDateRoute() {
  const { devotional, date, prev, next } = Route.useLoaderData();
  return <DevotionalView devotional={devotional} date={date} prev={prev} next={next} />;
}
