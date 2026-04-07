import crypto from "node:crypto";

const THREADS_AUTH_URL = "https://threads.net/oauth/authorize";
const THREADS_TOKEN_URL = "https://graph.threads.net/oauth/access_token";
const THREADS_LONG_LIVED_URL = "https://graph.threads.net/access_token";
const THREADS_ME_URL =
  "https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url";
const THREADS_SCOPES = [
  "threads_basic",
  "threads_content_publish",
  "threads_manage_replies",
  "threads_read_replies",
  "threads_delete",
];

export function getThreadsScopes() {
  return [...THREADS_SCOPES];
}

function getThreadsEnv() {
  const appId = process.env.THREADS_APP_ID;
  const appSecret = process.env.THREADS_APP_SECRET;
  const redirectUri = process.env.THREADS_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    throw new Error("Missing Threads OAuth env vars");
  }

  return { appId, appSecret, redirectUri };
}

export function createThreadsOauthState() {
  return crypto.randomBytes(16).toString("hex");
}

export function buildThreadsAuthorizeUrl(state: string) {
  const { appId, redirectUri } = getThreadsEnv();
  const url = new URL(THREADS_AUTH_URL);

  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", THREADS_SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeThreadsCode(code: string) {
  const { appId, appSecret, redirectUri } = getThreadsEnv();
  const response = await fetch(THREADS_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
    cache: "no-store",
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(`Threads token exchange failed: ${JSON.stringify(json)}`);
  }

  return json as {
    access_token: string;
    user_id?: string;
    token_type?: string;
  };
}

export async function exchangeThreadsLongLivedToken(accessToken: string) {
  const { appSecret } = getThreadsEnv();
  const url = new URL(THREADS_LONG_LIVED_URL);

  url.searchParams.set("grant_type", "th_exchange_token");
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(
      `Threads long-lived exchange failed: ${JSON.stringify(json)}`,
    );
  }

  return json as {
    access_token: string;
    token_type?: string;
    expires_in?: number;
  };
}

export async function fetchThreadsMe(accessToken: string) {
  const response = await fetch(THREADS_ME_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(`Threads me fetch failed: ${JSON.stringify(json)}`);
  }

  return json as {
    id: string;
    name?: string;
    username?: string;
    threads_profile_picture_url?: string;
  };
}
