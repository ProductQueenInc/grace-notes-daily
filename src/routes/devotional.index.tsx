import { createFileRoute } from "@tanstack/react-router";
import { getSharedDevotional } from "@/lib/ai-stubs";
import { DevotionalView, devotionalHead } from "@/components/devotional-view";

function todayISO() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

export const Route = createFileRoute("/devotional/")({
  loader: async () => {
    const date = todayISO();
    const devotional = await getSharedDevotional(date);
    return { devotional, date };
  },
  head: ({ loaderData }) => devotionalHead(loaderData?.devotional, loaderData?.date),
  component: DevotionalTodayRoute,
});

function DevotionalTodayRoute() {
  const { devotional, date } = Route.useLoaderData();
  return <DevotionalView devotional={devotional} date={date} />;
}
