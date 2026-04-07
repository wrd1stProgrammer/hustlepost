import crypto from "node:crypto";

const X_AUTH_URL = "https://x.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const X_ME_URL = "https://api.x.com/2/users/me";
const X_SCOPES = ["tweet.read", "users.read", "tweet.write", "offline.access"];

function getXEnv() {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing X OAuth env vars");
  }

  return { clientId, clientSecret, redirectUri };
}

function sha256Base64Url(value: string) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("base64url");
}

export function createXOauthState() {
  const state = crypto.randomBytes(16).toString("hex");
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = sha256Base64Url(codeVerifier);

  return { state, codeVerifier, codeChallenge };
}

export function buildXAuthorizeUrl(input: {
  state: string;
  codeChallenge: string;
}) {
  const { clientId, redirectUri } = getXEnv();
  const url = new URL(X_AUTH_URL);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", X_SCOPES.join(" "));
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

export async function exchangeXCode(input: {
  code: string;
  codeVerifier: string;
}) {
  const { clientId, clientSecret, redirectUri } = getXEnv();
  const form = new URLSearchParams({
    code: input.code,
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: input.codeVerifier,
  });

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
    cache: "no-store",
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(`X token exchange failed: ${JSON.stringify(json)}`);
  }

  return json as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
}

export async function fetchXMe(accessToken: string) {
  const response = await fetch(X_ME_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(`X me fetch failed: ${JSON.stringify(json)}`);
  }

  return json as {
    data: {
      id: string;
      name: string;
      username: string;
    };
  };
}
