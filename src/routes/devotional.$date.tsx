import { createFileRoute, notFound } from "@tanstack/react-router";
import { getSharedDevotional } from "@/lib/ai-stubs";
import { DevotionalView, devotionalHead } from "@/components/devotional-view";
import type { DevotionalResult } from "@/lib/ai.functions";

function isValidDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T12:00:00Z"));
}

export const Route = createFileRoute("/devotional/$date")({
  loader: async ({ params }): Promise<{ devotional: DevotionalResult | null; date: string }> => {
    if (!isValidDate(params.date)) throw notFound();
    try {
      const devotional = await getSharedDevotional(params.date);
      return { devotional, date: params.date };
    } catch (err) {
      console.error("[devotional/$date] generation failed:", err);
      return { devotional: null, date: params.date };
    }
  },
  head: ({ loaderData }) => devotionalHead(loaderData?.devotional ?? undefined, loaderData?.date),
  component: DevotionalDateRoute,
});

function DevotionalDateRoute() {
  const { devotional, date } = Route.useLoaderData();
  return <DevotionalView devotional={devotional} date={date} />;
}
