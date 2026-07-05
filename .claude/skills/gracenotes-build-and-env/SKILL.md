---
name: gracenotes-build-and-env
description: Reproduce the GraceNotes Daily dev environment from scratch, build the app, and prepare the Capacitor native build for App Store submission. Load for setup, install, build errors, dependency issues, environment variables, TypeScript config, or Capacitor/iOS/Android questions. Triggers: build, install, env, setup, node modules, tsc errors, vite, capacitor, app store build.
---

# GraceNotes Build and Environment

## When NOT to use this skill

- Running/deploying an already-built app → `gracenotes-run-and-operate`
- Which env var configures what → `gracenotes-config-and-flags`

## From zero to running (verified commands)

```bash
git clone git@github.com:ProductQueenInc/grace-notes-daily.git
cd grace-notes-daily
npm install            # package-lock.json is authoritative for local work; a bun.lock also exists (Lovable artifact)
cp .env.example .env 2>/dev/null || true   # no .env.example exists; create .env by hand — see below
npm run dev            # vite dev
```

Required `.env` (client-side; real values in Cindy's local `.env`, never commit):

```
VITE_SUPABASE_URL=https://tkoebogweygaabndrsvl.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
ANTHROPIC_API_KEY=<server-side, used by createServerFn AI calls in dev>
OPENAI_API_KEY=<server-side>
```

Server-only secrets in production live in Supabase secrets / Cloudflare (see `gracenotes-config-and-flags`), NOT in `.env`.

## Build + checks

| Command | What it does |
|---|---|
| `npm run build` | vite production build (Cloudflare Worker target via `@cloudflare/vite-plugin`) |
| `npm run build:dev` | dev-mode build |
| `npx tsc --noEmit` | typecheck. KNOWN pre-existing errors: missing types for `marked`, `@react-email/*`, `@lovable.dev/*` (resolve in Lovable's build). A change is clean if it adds NO new errors. |
| `npm run lint` | eslint |
| `npm run format` | prettier |

**There is no test suite and no CI.** `package.json` has no test script; there is no `.github/` directory. Evidence standards are in `gracenotes-validation-and-qa`.

## Known traps

1. **`routeTree.gen.ts` is generated.** New routes require it to regenerate (dev server does this). Never hand-edit.
2. **Server runtime is Cloudflare Workers**, not Node: no `child_process`, `sharp`, `canvas`, `puppeteer`, full `os.*`. Read `process.env.X` inside `.handler()`, never at module scope. Never set `ssr.external` in `vite.config.ts`.
3. **Edge functions are Deno**: `npm:` imports, `Deno.env.get(...)`.
4. **Auth-protected server fns 401 during prerender** if called from a public route's loader.
5. **Stale `.git/index.lock`** can be left by crashed tooling (happened 2026-07-05); remove it before git ops.
6. **`npm install` vs bun**: Lovable uses its own pipeline. Don't commit a regenerated `bun.lock` unless you're using bun deliberately.

## Capacitor / App Store readiness (current truth: STUB)

`capacitor.config.ts` exists (appId `app.gracenotesdaily`, appName "GraceNotes Daily", webDir `dist/client`, PushNotifications/SplashScreen/StatusBar plugin blocks) but **no `@capacitor/*` packages are installed and no `ios/`/`android/` folders exist**.

To start the native build:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npm run build                      # produces dist/client
npx cap add ios && npx cap add android
npx cap sync
npx cap open ios                   # requires Xcode on macOS
```

Store assets: master icon `public/icons/icon-source.png` is 1254×1254 (≥1024 store minimum, safe to downscale). Native timeline decision (2026-07-05): **native is imminent (<3 months)** — deep links must be designed as Universal Links / App Links from day one (see `gracenotes-sharing-architecture-campaign`).

## Provenance and Maintenance

Written 2026-07-05 against `package.json` and `capacitor.config.ts` at commit `2758031`. Re-verify:

- Scripts: `node -e "console.log(require('./package.json').scripts)"`
- Capacitor still a stub: `ls ios android 2>/dev/null || echo "still stub"`
- Known tsc errors unchanged: `npx tsc --noEmit 2>&1 | grep -cE "marked|react-email|lovable.dev"`
- No CI yet: `ls .github 2>/dev/null || echo "no CI"`
