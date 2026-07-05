import { createFileRoute, notFound } from "@tanstack/react-router";
import { getStoredDevotional } from "@/lib/ai-stubs";
import { DevotionalView, devotionalHead } from "@/components/devotional-view";
import type { DevotionalResult } from "@/lib/ai.functions";

function isValidDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T12:00:00Z"));
}

export const Route = createFileRoute("/devotional/$date")({
  // Archive URLs are READ-ONLY: they serve the stored row or 404. They never
  // trigger generation (so crawlers can't mint devotionals for arbitrary
  // dates) and never show a placeholder - a dated page simply doesn't exist
  // until its devotional does. Generation lives in the cron and the today
  // paths (in-app + /devotional index).
  loader: async ({ params }): Promise<{ devotional: DevotionalResult; date: string }> => {
    if (!isValidDate(params.date)) throw notFound();
    const devotional = await getStoredDevotional(params.date);
    if (!devotional) throw notFound();
    return { devotional, date: params.date };
  },
  head: ({ loaderData }) => devotionalHead(loaderData?.devotional ?? undefined, loaderData?.date),
  component: DevotionalDateRoute,
});

function DevotionalDateRoute() {
  const { devotional, date } = Route.useLoaderData();
  return <DevotionalView devotional={devotional} date={date} />;
}
