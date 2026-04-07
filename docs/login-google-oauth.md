# Login Google OAuth Runbook

Google login is now wired in this app:

1. `/login` -> `signInWithOAuth(provider: "google")`
2. Google returns to Supabase callback
3. Supabase redirects to app callback `/auth/callback`
4. `/auth/callback` exchanges code for session and redirects to `/dashboard`

## Required env vars

Set these in `.env.local` and deployment:

```env
APP_URL=https://your-app.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
# fallback:
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

`APP_URL` must match the real browser origin.

Local examples:

```env
APP_URL=http://127.0.0.1:3000
# or
APP_URL=http://localhost:3000
```

## Supabase setup

1. Supabase Dashboard -> `Authentication` -> `Providers` -> `Google`
2. Enable Google provider, set Client ID / Client Secret
3. `Authentication` -> `URL Configuration`
4. Set `Site URL` to your `APP_URL`
5. Add redirect URL:

```text
<APP_URL>/auth/callback
```

## Google Cloud setup

1. Create OAuth client (`Web application`)
2. Add authorized redirect URI:

```text
https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
```

If using Supabase custom auth domain, use that custom domain callback URL.

## Quick verification

1. Open `/login`
2. Click `Continue with Google`
3. Complete Google auth
4. Confirm you land on `/dashboard`
5. Confirm session persists after refresh
