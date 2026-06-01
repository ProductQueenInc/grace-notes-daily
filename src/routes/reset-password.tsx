import { createFileRoute, redirect } from "@tanstack/react-router";

// Passwords are no longer used — auth is phone OTP + magic link only.
// This redirect keeps any old links (emails, bookmarks) working.
export const Route = createFileRoute("/reset-password")({
  beforeLoad: () => {
    throw redirect({ to: "/login", replace: true });
  },
  component: () => null,
});
