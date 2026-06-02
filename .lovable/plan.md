
# Plan — GraceNotes Daily Native Apps (iOS + Android)

Wrap the existing web app as native iOS + Android apps via **Capacitor**. One codebase, two stores. Your choices: **Physical-only Shopify shop**, **Magic link + Apple + Google sign-in (BYOK Google)**, **Hybrid audio**, **iPad-optimized layouts**.

---

## Responsiveness guarantee

Nothing on the current web app gets *worse*. Changes are additive:
- iPad (768–1024px) gains two-column layouts on Journey, Heart Notes, Prayers + wider Home hero. iPhone + desktop untouched.
- Login screen gains Apple + Google buttons (~80px taller, well within safe area).
- New `/shop/*` routes don't touch any existing route.
- All locked files stay locked: `styles.css`, `app-shell.tsx`, `app-sidebar.tsx`, `nature-background.tsx`, `page-header.tsx`, `player-dock.tsx`, `icon.tsx`, shadcn `ui/*`, onboarding structure, habit auto-mark rule.

---

## Phase 1 — Auth hardening (web first)

Done before any native work. Validates the auth contract on `gracenotesdaily.com`.

1. **You create Google OAuth credentials** in Google Cloud Console:
   - OAuth consent screen → "GraceNotes Daily", logo, support email, privacy + terms URLs
   - Authorized domains: `gracenotesdaily.com`, `lovable.app`
   - OAuth Client ID (Web): authorized redirect URIs = Supabase callback URL (I'll surface the exact URL from your Lovable Cloud auth settings)
   - Scopes: `openid`, `email`, `profile`
2. Paste Client ID + Secret into Lovable Cloud → Authentication → Google provider.
3. **Add Sign in with Apple** the same way (managed by Lovable Cloud, no Apple Developer Console work yet — that comes in Phase 7).
4. Update `src/routes/login.tsx`: Apple button + Google button **above** the magic-link input (magic link stays — same single screen, no `/signup` route).
5. Update `src/routes/auth/callback.tsx`: already handles PKCE, `token_hash`, and implicit flows. Add OAuth-specific error surfacing (the previous failure was silent — the new version will show "Sign-in didn't complete" with a Back button, same pattern as your existing error UI).
6. **Capacitor deep-link callback prep**: callback already lives at `/auth/callback`; add `gracenotesdaily://auth/callback` URL scheme handling so the same route works in the native shell.

### Why Google SSO will not fail this time

| Past failure (callback/redirect) | Mitigation |
|---|---|
| Lovable Preview's fetch proxy intercepts `/auth/v1/token` POST → "Failed to fetch" | **We test only on `gracenotesdaily.com`**, never the preview iframe. Preview is documented to break Supabase OAuth and there's no app-level fix |
| Redirect URI mismatch between preview + published origins | `redirect_uri: window.location.origin` (runtime, not hardcoded) + Google Console gets `gracenotesdaily.com` AND `*.lovable.app` listed |
| Session not detected after redirect (race condition) | `lovable.auth.signInWithOAuth` sets the session via `setSession(tokens)` synchronously — no `getSession()` polling race |
| Callback page shows blank on error | Updated callback already surfaces `error_description` from URL and shows recovery UI |
| Native app: webview blocks Google sign-in | `@capacitor/browser` opens the **system browser** (Safari/Chrome), not an in-app webview |
| Apple rejects iOS build because Google offered without Apple | Apple is added in the same phase — compliant by design |

## Phase 2 — Shopify shop (physical goods)

7. Enable Shopify integration. New dev store or connect existing — your call.
8. Storefront routes `/shop`, `/shop/$handle`, `/shop/cart` using your `.glass-on-hue` + `.glass-parchment` surfaces.
9. Cart → Shopify Storefront API. Checkout handed off to Shopify-hosted (no card data touches us).
10. Sidebar + mobile tab bar gains "Shop" entry.
11. ~2.9% + 30¢ per transaction. **No Apple cut** on physical goods.

## Phase 3 — Hybrid audio

12. Audio-only tracks → Supabase Storage (signed URLs). YouTube reserved for explicit video (preaching, music videos), clearly labelled.
13. Replace HTML `<audio>` with native-aware plugin so audio continues when backgrounded.
14. MediaSession metadata → lock screen, Control Center, CarPlay, Android Auto show title + art + play/pause/skip.
15. iOS: enable "Audio, AirPlay, PiP" background mode. Android: foreground service + media session.

## Phase 4 — Capacitor native shells

16. `bunx cap add ios` + `bunx cap add android`.
17. Install plugins: `app`, `push-notifications`, `splash-screen`, `status-bar`, `haptics`, `share`, `browser`, `preferences`.
18. Deep links (`gracenotesdaily://`) + Universal Links / App Links for `gracenotesdaily.com/*`.
19. Generate brand icon set (1024×1024 master → ~30 sizes) + splash (light + dark, brand greens). Also drops the missing `/public/icons/icon-192.png` and `icon-512.png` for PWA.

## Phase 5 — iPad-optimized layouts + responsive QA

20. Two-column layouts for Journey, Heart Notes, Prayers at ≥768px.
21. Wider Home hero + multi-column Listen grid on iPad.
22. Test matrix: iPhone SE / 15 / 16 Pro Max / iPad / iPad Pro 12.9" / Pixel 8 / Galaxy S24 / small Android / Galaxy Fold.
23. Dynamic Type (iOS) + font-scale (Android) — long content must reflow.
24. Dark mode pass (currently deferred per CLAUDE.md — strongly recommend before App Store submission).

## Phase 6 — Push notifications

25. Firebase project (free) + Apple Push key uploaded.
26. New `device_tokens` Supabase table (`user_id`, `token`, `platform`, RLS scoped to owner).
27. Permission prompt added to onboarding step 5 (in-context, never cold on launch — Apple guideline).
28. TanStack server function `sendPush` (FCM HTTP v1) + scheduled triggers:
    - Morning grace-note ready (respects `rhythms` + `timezone`)
    - Evening streak-at-risk reminder if today's habits incomplete
    - Optional: prayer milestones, weekly summary

## Phase 7 — Store submission

29. Apple Developer ($99/yr) + Google Play Developer ($25 one-time).
30. App Store Connect: screenshots at 6.7" + 6.5" + 5.5" + iPad 12.9", description, keywords, privacy policy URL (exists), support URL, age rating, **Privacy Nutrition Label** (declare: email, journal entries, prayers, device ID — all "linked to user").
31. Play Console: feature graphic 1024×500, screenshots, descriptions, content rating, Data Safety form.
32. Submit. Apple 1–3 days review, Google a few hours to 2 days. Budget 1–2 iOS rejection cycles.

---

## Google Play Console "About you" — your draft (copy/paste)

> **Background**
> I'm Cindy, founder of Product Queen (product-queen.com) and Habitue.Design. I've spent the last several years designing and launching consumer software products, with a focus on calm, considered user experiences in the wellness and habit-formation space. While this is my first app published on Google Play personally, I have hands-on experience across the full product lifecycle: discovery, UX, build, launch, support, and iteration on user feedback.
>
> **About this app — GraceNotes Daily**
> GraceNotes Daily (gracenotesdaily.com) is a soft, devotional companion for the Christian audience: a personalised daily reflection, prayer tracker, journal, and devotional reading, grounded in the user's faith phase and rhythms set during onboarding. The web app is live in production today and has been built with privacy, safety, and accessibility as first-class concerns — including a three-tier crisis-detection safety system, region-aware crisis-line lookup for 51 countries, and a strict imagery policy aligned to the audience.
>
> **Android & Play Console experience**
> This is my first time publishing on Google Play. I'm packaging the existing production web app as a native Android app using Capacitor, with native push notifications (FCM), background audio for the listen feature, and full support for phone and tablet form factors. I've reviewed the Play Console policies, Data Safety requirements, and target API level guidance, and I will use the internal testing track and pre-launch reports before any production release.
>
> **How I'll operate as a publisher**
> - Dedicated support email and in-app feedback channel already live
> - Privacy Policy and Terms published at gracenotesdaily.com/privacy and /terms
> - Minimal personal data collected (email, optional phone for backup sign-in, user-generated journal/prayer entries) — all linked to user, encrypted at rest, never sold or shared with advertisers
> - I will respond to user reviews and policy notices within 48 hours
>
> **Supporting links**
> - Live web app: https://gracenotesdaily.com
> - Founder studio: https://product-queen.com
> - Design studio: https://habitue.design
> - Privacy policy: https://gracenotesdaily.com/privacy
> - Terms of service: https://gracenotesdaily.com/terms

~2,100 of 5,000 chars. Honest, transfers credibility from your existing brands, pre-answers privacy/safety/support concerns, includes clickable proof.

---

## Timeline & cost

| Phase | Time |
|---|---|
| 1 — Auth (Apple + Google BYOK + native callback prep) | 3–4 days |
| 2 — Shopify shop | 3–5 days |
| 3 — Hybrid audio | 3–5 days |
| 4 — Capacitor shells + icons | 2–3 days |
| 5 — iPad layouts + responsive QA + dark mode | 5–7 days |
| 6 — Push notifications | 2–3 days |
| 7 — Store submission + review | 1–2 weeks (mostly waiting) |
| **Total elapsed** | **5–7 weeks** |

**Out of pocket: ~$125** ($99 Apple + $25 Google + Firebase free + Shopify dev store free until claimed).

---

## Build waves (so you're not blocked waiting on Apple)

**Wave 1 — Web** (Phases 1, 2, 3): ships to gracenotesdaily.com. Validates everything before native.

**Wave 2 — Native** (Phases 4, 5, 6, 7): Capacitor + push + QA + store submission.

---

## What I need from you to start Wave 1

1. **Approve this plan**
2. **Google Cloud Console**: create OAuth Client ID (I'll walk you through it step-by-step in chat once approved — takes ~10 min)
3. **Decide**: new Shopify dev store or connect existing?
4. **Decide**: OK to add dark mode tokens? (Strongly recommended for App Store)
5. **Start now in parallel** (no blocker, takes 24–48h for Apple approval): enroll in Apple Developer Program — $99/yr, https://developer.apple.com/programs/enroll

Approve and I'll start with Phase 1, Step 1 — surfacing your Supabase callback URL and walking you through Google Cloud Console setup.
