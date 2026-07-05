import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy dated path - 301 to the new /library/devotional/$date URL so every
// shared link and indexed URL resolves without loss.
export const Route = createFileRoute("/devotional/$date")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/library/devotional/$date",
      params: { date: params.date },
      statusCode: 301,
    });
  },
});
