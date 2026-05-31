I would not rebuild auth from scratch yet. This looks more likely to be a redirect/session mismatch than a broken login system.

Plan:

1. **Confirm the actual failure path**
   - Reproduce Google sign-in in the preview.
   - Inspect the OAuth callback URL, network requests, and console errors right after account selection.
   - Check whether the session is missing, delayed, or stored in a different auth client.

2. **Fix the Google sign-in entry point**
   - The current code calls the direct Supabase Google OAuth method.
   - For this project’s managed Google auth, the safer path is the generated `lovable.auth.signInWithOAuth("google", ...)` wrapper.
   - Update only the Google button flow, not the whole auth UI.

3. **Unify the callback/session handling**
   - Make `/auth/callback` handle both email confirmation and OAuth consistently.
   - Ensure it waits for a verified user session before redirecting.
   - Send users to `/home`, letting `RequireAuth` move unfinished profiles to onboarding.

4. **Check preview vs published behavior**
   - If Google works on `gracenotesdaily.lovable.app` but fails only on the preview URL, the issue is likely the preview backend/auth configuration rather than app code.
   - In that case, avoid more auth rewrites and fix the environment/configuration path instead.

5. **Verify email/password separately**
   - Confirm normal login still signs in and lands on `/home` or `/onboarding`.
   - Confirm Google does not bounce back to `/login` after account selection.

What I would avoid:
- Rebuilding the full auth system.
- Changing database/profile/onboarding logic.
- Adding CORS hacks or broad redirect changes.
- Editing generated auth integration files.