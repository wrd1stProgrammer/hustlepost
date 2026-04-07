import crypto from "node:crypto";
import { URL } from "node:url";
import { loadEnv, requireEnv } from "./load-env.mjs";
import { readStore, writeStore } from "./oauth-store.mjs";

loadEnv();
requireEnv([
  "THREADS_APP_ID",
  "THREADS_APP_SECRET",
  "THREADS_REDIRECT_URI",
]);

const AUTH_URL = "https://threads.net/oauth/authorize";
const TOKEN_URL = "https://graph.threads.net/oauth/access_token";
const LONG_LIVED_URL = "https://graph.threads.net/access_token";
const ME_URL = "https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url";
const CREATE_MEDIA_CONTAINER_URL = "https://graph.threads.net/v1.0/me/threads";
const PUBLISH_CONTAINER_URL = "https://graph.threads.net/v1.0/me/threads_publish";
const SCOPES = ["threads_basic", "threads_content_publish"];

function createState() {
  return crypto.randomBytes(16).toString("hex");
}

function buildAuthUrl() {
  const state = createState();
  writeStore("threads", { state });

  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", process.env.THREADS_APP_ID);
  url.searchParams.set("redirect_uri", process.env.THREADS_REDIRECT_URI);
  url.searchParams.set("scope", SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeCode(code) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.THREADS_APP_ID,
      client_secret: process.env.THREADS_APP_SECRET,
      grant_type: "authorization_code",
      redirect_uri: process.env.THREADS_REDIRECT_URI,
      code,
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Threads token exchange failed: ${response.status} ${JSON.stringify(json)}`);
  }
  writeStore("threads-short-token", json);
  return json;
}

async function exchangeLongLived(shortLivedToken) {
  const url = new URL(LONG_LIVED_URL);
  url.searchParams.set("grant_type", "th_exchange_token");
  url.searchParams.set("client_secret", process.env.THREADS_APP_SECRET);
  url.searchParams.set("access_token", shortLivedToken);

  const response = await fetch(url, { method: "GET" });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Threads long-lived exchange failed: ${response.status} ${JSON.stringify(json)}`);
  }
  writeStore("threads-token", json);
  return json;
}

async function getCurrentUser(accessToken) {
  const response = await fetch(ME_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Threads /me failed: ${response.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function createTestPost(accessToken, text) {
  const createResponse = await fetch(CREATE_MEDIA_CONTAINER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      media_type: "TEXT",
      text,
    }),
  });

  const createJson = await createResponse.json();
  if (!createResponse.ok) {
    throw new Error(`Threads create container failed: ${createResponse.status} ${JSON.stringify(createJson)}`);
  }

  const publishResponse = await fetch(PUBLISH_CONTAINER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      creation_id: createJson.id,
    }),
  });

  const publishJson = await publishResponse.json();
  if (!publishResponse.ok) {
    throw new Error(`Threads publish failed: ${publishResponse.status} ${JSON.stringify(publishJson)}`);
  }

  return {
    create: createJson,
    publish: publishJson,
  };
}

async function main() {
  const mode = process.argv[2] || "auth";

  if (mode === "auth") {
    const redirect = process.env.THREADS_REDIRECT_URI;
    if (!redirect.startsWith("https://")) {
      console.error("Threads redirect URI is not HTTPS. Meta usually requires HTTPS redirect URIs.");
      console.error(`Current value: ${redirect}`);
    }
    console.log(buildAuthUrl());
    return;
  }

  if (mode === "exchange") {
    const code = process.argv[3];
    if (!code) {
      throw new Error("Provide authorization code: node scripts/threads-oauth-test.mjs exchange <code>");
    }
    const shortToken = await exchangeCode(code);
    const longToken = await exchangeLongLived(shortToken.access_token);
    const me = await getCurrentUser(longToken.access_token);
    console.log(JSON.stringify({ shortToken, longToken, me }, null, 2));
    return;
  }

  if (mode === "post") {
    const token = readStore("threads-token");
    if (!token?.access_token) {
      throw new Error("Missing stored Threads token. Complete exchange first.");
    }
    const text = process.argv.slice(3).join(" ") || process.env.THREADS_TEST_POST_TEXT;
    if (!text) {
      throw new Error("Provide post text via args or THREADS_TEST_POST_TEXT.");
    }
    const result = await createTestPost(token.access_token, text);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  throw new Error(`Unknown mode: ${mode}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
