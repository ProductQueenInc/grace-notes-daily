# Auth rebuild — final plan

One sign-in screen, one input. Phone → OTP. Email → Magic Link. Backup contact captured in onboarding (and usable for sign-in once verified). Returning-device cookie flips the default copy between "Sign in" and "Create account."

## The sign-in screen

```
        GraceNotes Daily
   He's been waiting for you.

   [ phone number or email ]
        [  Continue  ]
```

- Single input. Detect `@` → email path. Detect digits/`+` → phone path. Show inline hint if neither.
- Phone path → 6-digit OTP screen (uses existing `input-otp.tsx`) → signed in.
- Email path → "Check your inbox" screen → user taps Magic Link → `/auth/callback` → signed in.
- Both produce a persistent session (Supabase JWT in localStorage, auto-refresh).

## Returning-device behaviour

- On first successful sign-in OR sign-up, set cookie `gn_has_account=1`, `Max-Age=31536000`, `SameSite=Lax`, `Secure`, `Path=/`.
- On `/login` mount, read cookie:
  - Cookie present → headline "Welcome back" + helper text "Enter your phone or email to sign in."
  - Cookie absent → headline "Begin your journey" + helper text "Enter your phone or email to create your account."
- Same form either way — the cookie only changes copy, not behaviour. Both phone OTP and Magic Link auto-create the account if it doesn't exist, so there is no separate "sign up" form.
- Privacy policy: add a short paragraph under "Cookies we use" describing `gn_has_account` as a non-essential preference cookie that remembers whether this device has signed in before, so we can show the right greeting. Set by the app, not a third party. Clearing it has no effect on the account.

## Onboarding — backup contact step

New step (inserted at the end, before "All set"):

> **One more thing — a backup way in.**
> If you signed up with your phone, give us an email. If you signed up with your email, give us a phone. We'll send a quick code to confirm it's yours. You can skip this and add it later in Settings.

Flow:
1. Detect which contact the user has (phone or email present on `auth.users`).
2. Show the *other* field.
3. On submit, call `supabase.auth.updateUser({ email })` or `{ phone }`.
4. Supabase sends a verification link (email) or OTP (phone).
5. Show the verify step inline (OTP input for phone, "check your inbox" copy for email).
6. On success, the backup is attached to the same `auth.users` row → user can sign in with either from now on.
7. On `identity_already_exists` error → toast: "That [email/phone] is already on another account. You can sign in with it instead." Don't block onboarding completion.
8. "Skip for now" button is always present.

## Files changed

1. **`src/lib/supabase.ts`** — `flowType: 'implicit'` → `'pkce'` (required for Magic Link callback exchange).
2. **`src/routes/login.tsx`** — replace entire form. Single input + detect logic + OTP step. Read `gn_has_account` cookie for greeting copy. Remove password fields, Google button, signup toggle.
3. **`src/routes/auth/callback.tsx`** — add `supabase.auth.exchangeCodeForSession(window.location.href)` when `?code=` present. Set `gn_has_account` cookie on success. Keep existing error surface.
4. **`src/hooks/use-auth.ts`** (or wherever sign-in success is observed) — set `gn_has_account` cookie on `SIGNED_IN` event.
5. **`src/routes/onboarding.tsx`** — add backup-contact step + verification sub-step.
6. **`src/routes/signup.tsx`** — delete (or redirect to `/login`).
7. **`src/routes/reset-password.tsx`** — delete (no passwords).
8. **`src/routes/privacy.tsx`** — add the cookie paragraph.

## Phone-number input

Use `libphonenumber-js` (already small, edge-safe) to parse to E.164. Default country = `navigator.language` region; small country-code dropdown beside the input if they need to override. Twilio Geo Permissions (your side) controls which countries actually receive SMS.

## Supabase / server-side setup

**Lovable Cloud → Auth → Providers:**
- Enable **Phone** → provider: Twilio → paste Account SID, Auth Token, Messaging Service SID.
- Confirm **Email** + Magic Link enabled (already is; templates already scaffolded).
- Disable **Email + Password** (no longer used).
- **Google**: leave provider configured but remove from UI. Re-enable later once stable.

**Email deliverability check (I'll run during build):** confirm DNS verification status for the sending domain; if anything is missing, surface the exact records.

## Twilio setup (you, one-time, ~10 min)

1. Upgrade to Pay-as-you-go.
2. Messaging → **Geo Permissions** → enable every country you expect signups from. The "United States only" default is what would block a Kenyan number.
3. Messaging → Services → create "GraceNotes Auth" → buy one US long code (~$1.15/mo) → add to service.
4. Messaging → **SMS Pumping Protection** → ON.
5. Copy Account SID, Auth Token, Messaging Service SID → paste into Supabase Phone provider.

## What's NOT changing

- `<NatureBackground />`, dove medallion, glass card, Fraunces/Nunito fonts, brand greens — login screen keeps the same visual identity.
- All other routes, hooks, and AI flows untouched.
- Google SSO provider stays configured in Supabase (just hidden from UI).

## Order of operations

1. **You:** Twilio Geo Permissions + Messaging Service + credentials → paste into Supabase.
2. **Me:** make all code changes above + run DNS check on email domain.
3. **You:** test phone signup with your own number + Magic Link with your own email + verify backup contact during onboarding works.
4. **Done.**

## Anything I'm still worried about

- **Email deliverability** — will verify DNS during build and report exact missing records if any.
- **`identity_already_exists` on backup** — handled with a clear toast; doesn't block onboarding.
- **Twilio international cost** — ~$0.05/SMS for non-US. 1,000 international signups ≈ $50. Acceptable.

Nothing else. Ready to build on your go.
