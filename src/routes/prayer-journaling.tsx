import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy URL — 301 to the new /library/<slug> location.
export const Route = createFileRoute("/prayer-journaling")({
  beforeLoad: () => {
    throw redirect({
      to: "/library/$slug",
      params: { slug: "prayer-journaling" },
      statusCode: 301,
    });
  },
});
