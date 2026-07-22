// Legacy URL. The founder build story moved to /library/building-gracenotes-daily
// on 2026-07-22 so all writing lives under /library. Permanent server-side
// redirect, same pattern as the legacy /devotional routes.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/building-gracenotes-daily")({
  beforeLoad: () => {
    throw redirect({ to: "/library/building-gracenotes-daily", statusCode: 301 });
  },
});
