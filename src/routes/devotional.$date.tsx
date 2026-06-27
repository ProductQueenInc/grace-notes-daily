import { createFileRoute, notFound } from "@tanstack/react-router";
import { getSharedDevotional } from "@/lib/ai-stubs";
import { DevotionalView, devotionalHead } from "@/components/devotional-view";

function isValidDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T12:00:00Z"));
}

export const Route = createFileRoute("/devotional/$date")({
  loader: async ({ params }) => {
    if (!isValidDate(params.date)) throw notFound();
    const devotional = await getSharedDevotional(params.date);
    return { devotional, date: params.date };
  },
  head: ({ loaderData }) => devotionalHead(loaderData?.devotional, loaderData?.date),
  component: DevotionalDateRoute,
});

function DevotionalDateRoute() {
  const { devotional, date } = Route.useLoaderData();
  return <DevotionalView devotional={devotional} date={date} />;
}
