# API Testing Notes

## X

Official X tutorial still documents local testing with:

`http://127.0.0.1:5000/oauth/callback`

For this workspace:

1. Set your X developer app callback URL to:
   `http://localhost:3000/api/oauth/x/callback`
2. Start the local callback server:
   `node scripts/x-oauth-test.mjs server`
3. Open the printed authorization URL in a browser while logged into the target X account.
4. If you want to test an actual post in the callback flow, add:
   `X_TEST_POST_TEXT=hello from hustle-ai`
   to `.env.local`

## Threads

Threads OAuth currently expects an HTTPS redirect URI in practice. Your current local value is HTTP, so local exchange is blocked until you switch to an HTTPS callback.

Recommended test path:

1. Use an HTTPS callback URL, for example a temporary tunnel URL.
2. Register that exact HTTPS URL in Meta developer settings.
3. Generate the authorization URL:
   `node scripts/threads-oauth-test.mjs auth`
4. After the browser redirects with `?code=...`, exchange it manually:
   `node scripts/threads-oauth-test.mjs exchange <code>`
5. Test a text post:
   `node scripts/threads-oauth-test.mjs post "hello from hustle-ai"`

## Current blocker

- X is testable now with local HTTP callback.
- Threads still needs a valid HTTPS redirect URI before end-to-end OAuth can be completed locally.
