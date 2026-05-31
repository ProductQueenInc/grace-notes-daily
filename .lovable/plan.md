I’m sorry this is staring at you right now. The immediate goal is to get you off the error page and stop the Google sign-in loop.

What I’ll implement after you approve this plan:

1. Switch the Google button away from the direct auth call and onto Lovable Cloud’s Google OAuth broker.
   - This is the supported path for this project.
   - It avoids relying on a manually configured callback URL in the app code.

2. Make the redirect simple and consistent.
   - Google sign-in will return to the current site origin, then the app can route the signed-in user normally.
   - This should work for the preview URL and the custom domain.

3. Keep email/password sign-in untouched.
   - I won’t change the working email flow.

4. Verify the login page no longer points Google through the broken direct flow.
   - I’ll inspect the updated code and, if possible, test the preview flow far enough to confirm it starts correctly.

What you should do right now:

1. Do not keep retrying the error page.
2. Come back to the Lovable preview login page.
3. Approve this plan so I can make the app-side fix.
4. After I’m done, refresh the preview.
5. Try “Continue with Google” once.

Important: if Google still shows an error after this change, the only thing left should be the Google/Lovable Cloud provider configuration, not the app button itself.