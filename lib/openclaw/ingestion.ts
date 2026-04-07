type WorkerIngestionResponse = {
  topic_cluster: string;
  collected_count: number;
  valid_count: number;
  saved_count: number;
  duplicate_count: number;
  skipped_count: number;
  failed_batch_count: number;
  language_breakdown?: Record<string, number>;
  output_file?: string;
};

export type WorkerTopicCluster = "health_fitness" | "vibe_coding";

export type SearchIngestionInput = {
  keywords: string[];
  topic_cluster: string;
  locale?: string;
  target_post_count?: number;
  scraper_account: string;
};

export type HomeFeedIngestionInput = {
  topic_cluster: string;
  locale?: string;
  target_post_count?: number;
  scraper_account: string;
};

const HEALTH_FITNESS_HINTS = [
  "건강",
  "운동",
  "식단",
  "다이어트",
  "헬스",
  "피트니스",
  "health",
  "fitness",
  "diet",
  "workout",
];

const VIBE_CODING_HINTS = [
  "ai",
  "자동화",
  "에이전트",
  "바이브코딩",
  "코딩",
  "개발툴",
  "automation",
  "agent",
  "coding",
  "developer",
  "cursor",
];

function countClusterMatches(keywords: string[], hints: string[]) {
  return keywords.reduce((count, keyword) => {
    const normalized = keyword.trim().toLowerCase();
    return hints.some((hint) => normalized.includes(hint)) ? count + 1 : count;
  }, 0);
}

export function inferTopicClusterFromKeywords(
  keywords: string[],
): WorkerTopicCluster {
  const healthMatches = countClusterMatches(keywords, HEALTH_FITNESS_HINTS);
  const vibeMatches = countClusterMatches(keywords, VIBE_CODING_HINTS);

  return healthMatches > vibeMatches ? "health_fitness" : "vibe_coding";
}

export function getDefaultScraperAccountForCluster(
  topicCluster: WorkerTopicCluster,
) {
  return topicCluster === "health_fitness"
    ? "threads_scraper_01"
    : "threads_scraper_02";
}

function getWorkerBaseUrl() {
  const baseUrl = process.env.OPENCLAW_WORKER_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error("Missing OPENCLAW_WORKER_BASE_URL");
  }

  return baseUrl.replace(/\/+$/, "");
}

function getWorkerHeaders() {
  const token = process.env.OPENCLAW_WORKER_BEARER_TOKEN?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function getWorkerTimeoutMs() {
  const raw = process.env.OPENCLAW_WORKER_TIMEOUT_MS?.trim();
  const parsed = raw ? Number(raw) : Number.NaN;

  if (Number.isFinite(parsed) && parsed >= 30_000) {
    return parsed;
  }

  return 1000 * 60 * 12;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function normalizeWorkerResponse(data: unknown): WorkerIngestionResponse {
  if (!isRecord(data)) {
    return {} as WorkerIngestionResponse;
  }

  const summary = data.summary;
  if (isRecord(summary)) {
    return summary as WorkerIngestionResponse;
  }

  const result = data.result;
  if (isRecord(result)) {
    if (isRecord(result.summary)) {
      return result.summary as WorkerIngestionResponse;
    }
    return result as WorkerIngestionResponse;
  }

  return data as WorkerIngestionResponse;
}

async function callWorker<TPayload>(
  path: "/internal/ingest/search" | "/internal/ingest/home",
  payload: TPayload,
) {
  const timeoutMs = getWorkerTimeoutMs();
  let response: Response;

  try {
    response = await fetch(`${getWorkerBaseUrl()}${path}`, {
      method: "POST",
      headers: getWorkerHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" ||
        /aborted|timeout|time[\s-]?out/i.test(error.message))
    ) {
      throw new Error(
        `OpenClaw worker request timed out after ${Math.round(timeoutMs / 1000)}s`,
      );
    }

    throw new Error(
      `OpenClaw worker connection failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const text = await response.text();
  const data = text ? safeParseJson(text) : null;

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : text) || `Worker request failed with ${response.status}`;

    throw new Error(message);
  }

  return normalizeWorkerResponse(data);
}

function safeParseJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function triggerSearchIngestion(input: SearchIngestionInput) {
  return callWorker("/internal/ingest/search", {
    keywords: input.keywords,
    topic_cluster: input.topic_cluster,
    locale: input.locale ?? "ko",
    target_post_count: input.target_post_count ?? 50,
    scraper_account: input.scraper_account,
  });
}

export async function triggerHomeFeedIngestion(input: HomeFeedIngestionInput) {
  return callWorker("/internal/ingest/home", {
    topic_cluster: input.topic_cluster,
    locale: input.locale ?? "ko",
    target_post_count: input.target_post_count ?? 30,
    scraper_account: input.scraper_account,
  });
}
