---
name: gracenotes-change-control
description: How changes to GraceNotes Daily are classified, gated, sequenced, and reviewed. Load before committing, pushing, deploying, changing prompts, changing schema, or starting any feature that spans Canva, Lovable, and the backend. Triggers: change control, review, gating, sequencing, deploy order, who approves, can I change X, commit rules.
---

# GraceNotes Change Control

## When NOT to use this skill

- What the architecture IS → `gracenotes-architecture-contract`
- How to physically deploy → `gracenotes-run-and-operate`
- What evidence proves a change works → `gracenotes-validation-and-qa`

## Change classes

| Class | Examples | Gate |
|---|---|---|
| **A. Doc-only** | CLAUDE.md, roadmap.md, skills | Self-review. Push allowed. |
| **B. App code** | routes, components, server fns | `npx tsc --noEmit` (no NEW errors), CLAUDE.md §11 entry, then push. Goes live only when Cindy publishes via Lovable. |
| **C. Edge function** | `supabase/functions/*` | Class B checks + explicit redeploy (`supabase functions deploy <name>` or Supabase MCP). Code in git ≠ deployed code. |
| **D. Database** | migrations, RLS, GRANTs, cron | Migration file in `supabase/migrations/` AND applied to live DB. Verify RLS on every new table. Ask Cindy before destructive ops. |
| **E. Prompt** | grace-note / devotional prompts | MUST change both copies: `src/lib/ai.functions.ts` + the inlined copy in the matching edge function. Then Class C redeploy. |
| **F. Locked surface** | anything in the do-not-touch list (architecture contract) | STOP. Ask Cindy first. |

## Non-negotiables (with rationale)

1. **CLAUDE.md updated before every push** (its §9). Rationale: it is the handover of record; Lovable already fails to do this, so human/Claude sessions must compensate.
2. **Prompt dual-edit rule** (Class E). Rationale: edge functions can't import from `src/`; the copies drift silently.
3. **Backend gates Lovable.** No Lovable UI implementation against an endpoint until that endpoint's contract is finalized and documented in `gracenotes-canva-lovable-backend-contract`. Rationale: Lovable sessions have no memory; a moving contract multiplies rework across sessions.
4. **Canva gates Lovable parameterization.** No template parameterization until the Canva exports are approved (all 16 frames for the sharing project). Rationale: re-parameterizing after a design change costs a full Lovable session.
5. **Never trust the local tree without `git fetch`.** Lovable pushes to the same `main` (found 34 commits behind on 2026-07-05).
6. **No new edge functions unless cron or streaming forces it.**
7. **Roles never live on profiles** — separate `user_roles` + `has_role()` security-definer pattern.
8. **Imagery policy and NIV-grounding are content gates**, not preferences (see `faithapp-domain-reference`).

## Sequencing rule for cross-tool features

```
Canva design → owner approval → Backend contract finalized (frozen doc)
→ Backend implemented + validated → Lovable UI built against frozen contract
→ End-to-end validation
```

If you find yourself building Lovable UI while the backend contract is still moving, stop and freeze the contract first.

## Commit / push checklist (copy-paste)

```bash
git fetch origin && git status -sb          # stale check; resolve behind-ness first
npx tsc --noEmit                            # no NEW errors (pre-existing: marked/@react-email/@lovable.dev)
npm run lint                                # eslint
# update CLAUDE.md §11 with a dated entry, THEN:
git add -A && git commit -m "<what and why>"
git push origin main
```

Deploy reality: pushing does NOT deploy. The app goes live when Cindy publishes from Lovable. Edge functions go live only on explicit deploy. DB changes are live the moment applied — treat them as production surgery.

## Provenance and Maintenance

Written 2026-07-05. Sources: CLAUDE.md §5/§8/§9/§10a, git history (Lovable bot commits), live cron config. Re-verify:

- Do-not-touch list unchanged: `grep -A12 "Things to NOT touch" CLAUDE.md`
- Prompt dual-copy still required: `grep -l "OPENING_RULE" src/lib/ai.functions.ts supabase/functions/generate-daily-devotional/index.ts`
- Lovable still pushes to main: `git log --oneline -5 --author="gpt-engineer"`
