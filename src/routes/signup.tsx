import { createFileRoute, redirect } from "@tanstack/react-router";

// The sign-up flow is now unified with sign-in on /login.
// This redirect ensures any link that still points here (email, bookmarks) lands correctly.
export const Route = createFileRoute("/signup")({
  beforeLoad: () => {
    throw redirect({ to: "/login", replace: true });
  },
  component: () => null,
});
