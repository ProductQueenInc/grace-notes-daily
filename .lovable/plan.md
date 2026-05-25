## Goal

Replace default Supabase auth emails with GraceNotes Daily–branded templates. Polish the two flows users actually see during onboarding (signup confirmation + password reset). Leave the other four as clean branded defaults.

## Sender

- **From:** `GraceNotes Daily <hello@notify.gracenotesdaily.com>`
- **Reply-To:** none for now (replies bounce — these are system emails, not conversational)
- Tomorrow: set up `hello@gracenotesdaily.com` → `cindy@product-queen.com` forwarding at the registrar, then I'll add it as Reply-To.

## What gets scaffolded

One pass creates 6 React Email templates + the auth-email-hook server route:

1. **`signup.tsx`** — polished copy (primary onboarding email)
2. **`recovery.tsx`** — polished copy (password reset)
3. `magic-link.tsx` — branded shell, default body
4. `email-change.tsx` — branded shell, default body
5. `invite.tsx` — branded shell, default body
6. `reauthentication.tsx` — branded shell, default body

## Brand styling (applied to all 6)

- White email body background (#ffffff) — hard rule, regardless of app theme
- Text-based "GraceNotes Daily" wordmark header in `--grace` (#285c37) — no image, avoids broken-image fallbacks in email clients
- Fraunces for headings with Georgia fallback; Nunito for body with system-ui fallback (email clients don't reliably load Google Fonts)
- `--grace` headings, `--gold` (#debe36) on the primary CTA button
- Soft footer: "GraceNotes Daily · gracenotesdaily.com"
- Generous padding, calm spacing — matches the in-app glass surfaces in feel

## Polish copy (the two that matter)

**Signup confirmation** — warm, one-line welcome + CTA "Confirm your email". Reverent, no exclamation points, no marketing language. Tone matches the app: held, seen, welcome.

**Password reset** — short, calm, security-aware. CTA "Set a new password". Mentions the link expires and that they can ignore the email if they didn't request it.

The other four get the branded shell with Supabase's default body copy, lightly cleaned.

## After scaffolding

- Templates live in `supabase/functions/_shared/email-templates/*.tsx` and can be edited any time
- Server route deploys with the app on next publish — no separate deploy step
- DNS for `notify.gracenotesdaily.com` continues verifying in the background; setup status is visible in Cloud → Emails
- Emails start sending automatically once DNS verification completes

## Tomorrow

Once `hello@gracenotesdaily.com` forwarding is live, one small edit to the auth-email-hook adds `Reply-To: hello@gracenotesdaily.com` to all 6 templates.
