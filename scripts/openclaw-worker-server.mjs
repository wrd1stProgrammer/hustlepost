import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { loadEnv } from "./load-env.mjs";

const execFileAsync = promisify(execFile);

const DEFAULT_PORT = 4000;
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_WORKER_CWD = process.cwd();
const accountQueues = new Map();

function getQueueState(scraperAccount) {
  let state = accountQueues.get(scraperAccount);

  if (!state) {
    state = {
      tail: Promise.resolve(),
      waiting: 0,
      running: false,
    };
    accountQueues.set(scraperAccount, state);
  }

  return state;
}

function enqueueByScraperAccount(scraperAccount, task) {
  const state = getQueueState(scraperAccount);
  const queuePosition = state.waiting;
  state.waiting += 1;

  const run = state.tail
    .catch(() => undefined)
    .then(async () => {
      state.waiting -= 1;
      state.running = true;

      try {
        return await task();
      } finally {
        state.running = false;
      }
    });

  state.tail = run.finally(() => {
    const current = accountQueues.get(scraperAccount);
    if (
      current === state &&
      !state.running &&
      state.waiting <= 0 &&
      state.tail === run
    ) {
      accountQueues.delete(scraperAccount);
    }
  });

  return {
    queuePosition,
    run,
  };
}

function maybeLoadWorkerEnv() {
  const candidates = [
    process.env.WORKER_ENV_PATH,
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), ".env.local"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      loadEnv(candidate);
      return candidate;
    }
  }

  return null;
}

function json(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function unauthorized(response) {
  json(response, 401, { error: "Unauthorized" });
}

function notFound(response) {
  json(response, 404, { error: "Not found" });
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const body = Buffer.concat(chunks).toString("utf8").trim();
  return body ? JSON.parse(body) : {};
}

function getBearerToken(request) {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

function requireWorkerEnv(keys) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

function getWorkerConfig() {
  requireWorkerEnv(["WORKER_BEARER_TOKEN"]);

  return {
    token: process.env.WORKER_BEARER_TOKEN,
    host: process.env.OPENCLAW_WORKER_BIND_HOST || DEFAULT_HOST,
    port: Number(process.env.OPENCLAW_WORKER_PORT || DEFAULT_PORT),
    cwd: process.env.OPENCLAW_WORKER_CWD || DEFAULT_WORKER_CWD,
  };
}

function getScriptPath(type, cwd) {
  if (type === "search") {
    return path.resolve(cwd, "ingest-cluster.mjs");
  }

  return path.resolve(cwd, "ingest-home-feed.mjs");
}

function validatePayload(type, payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid JSON body");
  }

  if (typeof payload.topic_cluster !== "string" || !payload.topic_cluster.trim()) {
    throw new Error("topic_cluster is required");
  }

  if (typeof payload.scraper_account !== "string" || !payload.scraper_account.trim()) {
    throw new Error("scraper_account is required");
  }

  if (type === "search") {
    if (!Array.isArray(payload.keywords) || payload.keywords.length === 0) {
      throw new Error("keywords array is required");
    }
  }
}

function extractLastJsonObject(text) {
  const trimmed = text.trim();
  const candidates = [];

  for (let index = 0; index < trimmed.length; index += 1) {
    if (trimmed[index] === "{") {
      candidates.push(trimmed.slice(index));
    }
  }

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const candidate = candidates[index];

    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  throw new Error("Could not parse summary JSON from worker stdout");
}

async function runIngestion(type, payload, cwd) {
  const scriptPath = getScriptPath(type, cwd);
  const finalPayload = {
    locale: "ko",
    target_post_count: type === "search" ? 50 : 30,
    ...payload,
  };

  const { stdout, stderr } = await execFileAsync("node", [scriptPath, JSON.stringify(finalPayload)], {
    cwd,
    env: process.env,
    maxBuffer: 1024 * 1024 * 20,
  });

  const summary = extractLastJsonObject(stdout);
  return {
    ok: true,
    summary,
    stderr: stderr.trim() || null,
  };
}

maybeLoadWorkerEnv();
const config = getWorkerConfig();

const server = http.createServer(async (request, response) => {
  try {
    if (request.method !== "POST") {
      return notFound(response);
    }

    const token = getBearerToken(request);
    if (!token || token !== config.token) {
      return unauthorized(response);
    }

    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (
      url.pathname !== "/internal/ingest/search" &&
      url.pathname !== "/internal/ingest/home"
    ) {
      return notFound(response);
    }

    const type = url.pathname.endsWith("/search") ? "search" : "home";
    const payload = await readJsonBody(request);
    validatePayload(type, payload);
    const scraperAccount = payload.scraper_account;
    const { queuePosition, run } = enqueueByScraperAccount(
      scraperAccount,
      () => runIngestion(type, payload, config.cwd),
    );

    if (queuePosition > 0) {
      console.log(
        JSON.stringify({
          stage: "queued",
          type,
          scraper_account: scraperAccount,
          queue_position: queuePosition,
        }),
      );
    }

    console.log(
      JSON.stringify({
        stage: "start",
        type,
        scraper_account: scraperAccount,
        queue_position: queuePosition,
      }),
    );

    const result = await run;

    console.log(
      JSON.stringify({
        stage: "done",
        type,
        scraper_account: scraperAccount,
        queue_position: queuePosition,
        summary: result.summary,
      }),
    );

    return json(response, 200, {
      ...result,
      queue_position: queuePosition,
      scraper_account: scraperAccount,
    });
  } catch (error) {
    return json(response, 500, {
      error: error instanceof Error ? error.message : "Worker execution failed",
    });
  }
});

server.listen(config.port, config.host, () => {
  console.log(
    JSON.stringify(
      {
        message: "OpenClaw worker server listening",
        host: config.host,
        port: config.port,
        cwd: config.cwd,
      },
      null,
      2,
    ),
  );
});
