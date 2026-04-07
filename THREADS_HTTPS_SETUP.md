# Threads HTTPS Setup

Use this when testing Threads OAuth locally.

## 1. Start the app

```bash
pnpm dev
```

## 2. Start an HTTPS tunnel

```bash
bash scripts/run-threads-tunnel.sh
```

This prints a `https://...trycloudflare.com` URL.

## 3. Set the redirect URI

Take the tunnel URL and append:

```text
/api/oauth/threads/callback
```

Example:

```text
https://example-name.trycloudflare.com/api/oauth/threads/callback
```

Update `.env.local`:

```env
THREADS_REDIRECT_URI=https://example-name.trycloudflare.com/api/oauth/threads/callback
```

## 4. Update Meta developer console

Add the same exact redirect URI in the Threads OAuth redirect settings.

It must match:

- protocol
- hostname
- path

## 5. Restart the app

After changing `.env.local`, restart:

```bash
pnpm dev
```

## 6. Test the flow

Open the app using the tunnel domain, not localhost:

```text
https://example-name.trycloudflare.com/dashboard
```

Then click `Connect Threads account`.

## Notes

- Keep the tunnel terminal open during the test.
- If the tunnel URL changes, update both `.env.local` and the Meta console again.
- X can keep using `127.0.0.1`, but Threads OAuth should be tested through the HTTPS tunnel URL.
