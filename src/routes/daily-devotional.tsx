import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy URL — 301 to the new /library/<slug> location.
export const Route = createFileRoute("/daily-devotional")({
  beforeLoad: () => {
    throw redirect({
      to: "/library/$slug",
      params: { slug: "daily-devotional" },
      statusCode: 301,
    });
  },
});
