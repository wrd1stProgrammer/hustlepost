import crypto from "node:crypto";
import http from "node:http";
import { URL } from "node:url";
import { loadEnv, requireEnv } from "./load-env.mjs";
import { readStore, writeStore } from "./oauth-store.mjs";

loadEnv();
requireEnv([
  "X_CLIENT_ID",
  "X_CLIENT_SECRET",
  "X_REDIRECT_URI",
]);

const SCOPES = ["tweet.read", "users.read", "tweet.write", "offline.access"];
const AUTH_URL = "https://x.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const ME_URL = "https://api.x.com/2/users/me";
const CREATE_POST_URL = "https://api.x.com/2/tweets";

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sha256Base64Url(input) {
  return crypto
    .createHash("sha256")
    .update(input)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createPkce() {
  const codeVerifier = base64Url(crypto.randomBytes(32));
  const state = crypto.randomBytes(16).toString("hex");
  const codeChallenge = sha256Base64Url(codeVerifier);
  return { codeVerifier, state, codeChallenge };
}

async function exchangeCode(code) {
  const stored = readStore("x");
  if (!stored?.codeVerifier || !stored?.state) {
    throw new Error("Missing stored PKCE state. Run `node scripts/x-oauth-test.mjs auth` first.");
  }

  const form = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: process.env.X_CLIENT_ID,
    redirect_uri: process.env.X_REDIRECT_URI,
    code_verifier: stored.codeVerifier,
  });

  const credentials = Buffer.from(
    `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`,
  ).toString("base64");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`X token exchange failed: ${response.status} ${JSON.stringify(json)}`);
  }

  writeStore("x-token", json);
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
    throw new Error(`X /users/me failed: ${response.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function createTestPost(accessToken, text) {
  const response = await fetch(CREATE_POST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`X create post failed: ${response.status} ${JSON.stringify(json)}`);
  }
  return json;
}

function buildAuthUrl() {
  const pkce = createPkce();
  writeStore("x", pkce);

  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.X_CLIENT_ID);
  url.searchParams.set("redirect_uri", process.env.X_REDIRECT_URI);
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("state", pkce.state);
  url.searchParams.set("code_challenge", pkce.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

function startCallbackServer() {
  const redirect = new URL(process.env.X_REDIRECT_URI);
  const listenHost =
    redirect.hostname === "localhost" ? "127.0.0.1" : redirect.hostname;
  const server = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url, `${redirect.protocol}//${redirect.host}`);
    if (reqUrl.pathname !== redirect.pathname) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const code = reqUrl.searchParams.get("code");
    const state = reqUrl.searchParams.get("state");
    const error = reqUrl.searchParams.get("error");
    const errorDescription = reqUrl.searchParams.get("error_description");
    const stored = readStore("x");

    if (error) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end(`X OAuth error: ${error}\n${errorDescription ?? ""}`);
      return;
    }

    if (!code || !state || !stored || state !== stored.state) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("State mismatch or missing code.");
      return;
    }

    try {
      const token = await exchangeCode(code);
      const me = await getCurrentUser(token.access_token);
      let postResult = null;
      if (process.env.X_TEST_POST_TEXT) {
        postResult = await createTestPost(token.access_token, process.env.X_TEST_POST_TEXT);
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(
          {
            ok: true,
            me,
            postResult,
          },
          null,
          2,
        ),
      );
      server.close();
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(err instanceof Error ? err.message : String(err));
    }
  });

  server.listen(Number(redirect.port || 80), listenHost, () => {
    console.log(`X callback server listening on ${process.env.X_REDIRECT_URI}`);
    console.log("Open this URL in a browser while logged into the target X account:");
    console.log(buildAuthUrl());
  });
}

async function main() {
  const mode = process.argv[2] || "auth";

  if (mode === "auth") {
    console.log(buildAuthUrl());
    return;
  }

  if (mode === "server") {
    startCallbackServer();
    return;
  }

  if (mode === "post") {
    const token = readStore("x-token");
    if (!token?.access_token) {
      throw new Error("Missing stored X token. Complete OAuth first.");
    }
    const text = process.argv.slice(3).join(" ") || process.env.X_TEST_POST_TEXT;
    if (!text) {
      throw new Error("Provide post text via args or X_TEST_POST_TEXT.");
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
