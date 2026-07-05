import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy path - devotionals now live under /library/devotional. Preserve SEO
// with a 301 to the archive index.
export const Route = createFileRoute("/devotional/")({
  beforeLoad: () => {
    throw redirect({ to: "/library/devotional", statusCode: 301 });
  },
});
