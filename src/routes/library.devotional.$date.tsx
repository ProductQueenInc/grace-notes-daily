import { createFileRoute, notFound } from "@tanstack/react-router";
import { getStoredDevotional, getDevotionalNeighbours } from "@/lib/ai-stubs";
import { DevotionalView, devotionalHead } from "@/components/devotional-view";
import type { DevotionalResult } from "@/lib/ai.functions";
import type { NeighbourInfo } from "@/lib/devotional-archive.functions";

function isValidDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T12:00:00Z"));
}

export const Route = createFileRoute("/library/devotional/$date")({
  // Read-only. Serves the stored row or 404 (no on-demand generation from
  // arbitrary dated URLs). Generation lives in the cron + today path.
  loader: async ({
    params,
  }): Promise<{
    devotional: DevotionalResult;
    date: string;
    prev: NeighbourInfo;
    next: NeighbourInfo;
  }> => {
    if (!isValidDate(params.date)) throw notFound();
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
