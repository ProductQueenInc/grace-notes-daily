import { createFileRoute } from "@tanstack/react-router";
import { getSharedDevotional } from "@/lib/ai-stubs";
import { DevotionalView, devotionalHead } from "@/components/devotional-view";
import type { DevotionalResult } from "@/lib/ai.functions";

function todayISO() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

export const Route = createFileRoute("/devotional/")({
  loader: async (): Promise<{ devotional: DevotionalResult | null; date: string }> => {
    const date = todayISO();
    try {
      const devotional = await getSharedDevotional(date);
      // If a fallback was served, anchor the page (head tags, share URL) to
      // the devotional actually shown, not the date that failed to generate.
      return { devotional, date: devotional.servedDate ?? date };
    } catch (err) {
      console.error("[devotional/index] generation failed:", err);
      return { devotional: null, date };
    }
  },
  head: ({ loaderData }) => devotionalHead(loaderData?.devotional ?? undefined, loaderData?.date),
  component: DevotionalTodayRoute,
});

function DevotionalTodayRoute() {
  const { devotional, date } = Route.useLoaderData();
  return <DevotionalView devotional={devotional} date={date} />;
}
