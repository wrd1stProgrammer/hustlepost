import type { PublishViewMetricsSummary } from "@/lib/types/db";

const THREADS_GRAPH_BASE_URL = "https://graph.threads.net/v1.0";
const THREADS_CREATE_CONTAINER_URL = `${THREADS_GRAPH_BASE_URL}/me/threads`;
const THREADS_PUBLISH_URL = `${THREADS_GRAPH_BASE_URL}/me/threads_publish`;
const THREADS_MEDIA_FIELDS = "id,text,timestamp,permalink,username";
const THREADS_COMMENT_COLLECTION_LIMIT = "100";
const THREADS_COMMENT_FIELD_SETS = [
  "id,text,timestamp,permalink,username,media_type,media_product_type,is_reply,is_reply_owned_by_me,has_replies,hide_status,reply_approval_status,reply_audience,root_post,replied_to,children",
  "id,text,timestamp,permalink,username,is_reply,has_replies,root_post,replied_to,children",
  "id,text,timestamp,username,root_post,replied_to,children",
];
const THREADS_INSIGHT_METRICS = "views,likes,replies,reposts,quotes,shares";

export type PublishThreadsTextPostInput = {
  accessToken: string;
  text: string;
  username?: string | null;
  replyToId?: string | null;
  imageUrls?: string[] | null;
};

export type PublishThreadsTextPostResult = {
  externalPostId: string;
  externalPostUrl: string | null;
  containerId: string;
  raw: {
    container: unknown;
    publish: unknown;
  };
};

export type ThreadsMediaObject = {
  id: string;
  text?: string;
  timestamp?: string;
  permalink?: string;
  username?: string;
};

export type ThreadsCommentObject = {
  id: string;
  text: string | null;
  timestamp: string | null;
  permalink: string | null;
  username: string | null;
  mediaType: string | null;
  mediaProductType: string | null;
  isReply: boolean | null;
  isReplyOwnedByMe: boolean | null;
  hasReplies: boolean | null;
  hideStatus: string | null;
  replyApprovalStatus: string | null;
  replyAudience: string | null;
  rootPostId: string | null;
  repliedToId: string | null;
  childIds: string[];
  children: ThreadsCommentObject[];
  raw: Record<string, unknown>;
};

export type ThreadsCommentTreeResult = {
  source: "conversation" | "replies";
  comments: ThreadsCommentObject[];
  raw: unknown;
};

export type ThreadsMediaInsightsResult = PublishViewMetricsSummary & {
  raw: unknown;
};

function buildThreadsPostUrl(postId: string, username?: string | null) {
  if (username) {
    return `https://www.threads.net/@${username}/post/${postId}`;
  }

  return `https://www.threads.net/post/${postId}`;
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toNullableString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toNullableBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function extractThreadsReferenceId(value: unknown) {
  const directId = toNullableString(value);
  if (directId) {
    return directId;
  }

  if (!isRecord(value)) {
    return null;
  }

  const objectId = toNullableString(value.id ?? null);
  if (objectId) {
    return objectId;
  }

  const data = value.data;
  if (isRecord(data)) {
    return toNullableString(data.id ?? null);
  }

  if (Array.isArray(data)) {
    for (const entry of data) {
      if (!isRecord(entry)) {
        continue;
      }

      const entryId = toNullableString(entry.id ?? null);
      if (entryId) {
        return entryId;
      }
    }
  }

  return null;
}

function getThreadsCollectionEntries(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return [];
  }

  if (Array.isArray(value.data)) {
    return value.data;
  }

  return [];
}

function extractThreadsCommentChildIds(value: unknown) {
  const childIds = new Set<string>();

  for (const entry of getThreadsCollectionEntries(value)) {
    if (typeof entry === "string" && entry.trim().length > 0) {
      childIds.add(entry);
      continue;
    }

    if (!isRecord(entry)) {
      continue;
    }

    if (typeof entry.id === "string" && entry.id.trim().length > 0) {
      childIds.add(entry.id);
    }

    for (const childId of extractThreadsCommentChildIds(entry.children)) {
      childIds.add(childId);
    }
  }

  return [...childIds];
}

function flattenThreadsCommentRecords(
  value: unknown,
  seen = new Set<string>(),
) {
  const records: ThreadsCommentObject[] = [];

  for (const entry of getThreadsCollectionEntries(value)) {
    if (!isRecord(entry) || typeof entry.id !== "string" || !entry.id.trim()) {
      continue;
    }

    if (seen.has(entry.id)) {
      continue;
    }

    seen.add(entry.id);
    records.push(parseThreadsCommentObject(entry));

    for (const childRecord of flattenThreadsCommentRecords(entry.children, seen)) {
      records.push(childRecord);
    }
  }

  return records;
}

function mergeThreadsCommentObjects(
  target: ThreadsCommentObject,
  source: ThreadsCommentObject,
) {
  target.text = target.text ?? source.text;
  target.timestamp = target.timestamp ?? source.timestamp;
  target.permalink = target.permalink ?? source.permalink;
  target.username = target.username ?? source.username;
  target.mediaType = target.mediaType ?? source.mediaType;
  target.mediaProductType = target.mediaProductType ?? source.mediaProductType;
  target.isReply = target.isReply ?? source.isReply;
  target.isReplyOwnedByMe = target.isReplyOwnedByMe ?? source.isReplyOwnedByMe;
  target.hasReplies = target.hasReplies ?? source.hasReplies;
  target.hideStatus = target.hideStatus ?? source.hideStatus;
  target.replyApprovalStatus =
    target.replyApprovalStatus ?? source.replyApprovalStatus;
  target.replyAudience = target.replyAudience ?? source.replyAudience;
  target.rootPostId = target.rootPostId ?? source.rootPostId;
  target.repliedToId = target.repliedToId ?? source.repliedToId;
  target.childIds = [...new Set([...target.childIds, ...source.childIds])];
  target.raw = { ...source.raw, ...target.raw };
}

function parseThreadsCommentObject(raw: Record<string, unknown>): ThreadsCommentObject {
  const rootPostId = extractThreadsReferenceId(raw.root_post ?? raw.rootPost ?? null);
  const repliedToId = extractThreadsReferenceId(raw.replied_to ?? raw.repliedTo ?? null);

  return {
    id: raw.id as string,
    text: toNullableString(raw.text ?? null),
    timestamp: toNullableString(raw.timestamp ?? null),
    permalink: toNullableString(raw.permalink ?? null),
    username: toNullableString(raw.username ?? null),
    mediaType: toNullableString(raw.media_type ?? raw.mediaType ?? null),
    mediaProductType: toNullableString(
      raw.media_product_type ?? raw.mediaProductType ?? null,
    ),
    isReply: toNullableBoolean(raw.is_reply ?? raw.isReply ?? null),
    isReplyOwnedByMe: toNullableBoolean(
      raw.is_reply_owned_by_me ?? raw.isReplyOwnedByMe ?? null,
    ),
    hasReplies: toNullableBoolean(raw.has_replies ?? raw.hasReplies ?? null),
    hideStatus: toNullableString(raw.hide_status ?? raw.hideStatus ?? null),
    replyApprovalStatus: toNullableString(
      raw.reply_approval_status ?? raw.replyApprovalStatus ?? null,
    ),
    replyAudience: toNullableString(raw.reply_audience ?? raw.replyAudience ?? null),
    rootPostId,
    repliedToId,
    childIds: extractThreadsCommentChildIds(raw.children),
    children: [],
    raw,
  };
}

function buildThreadsCommentTree(records: ThreadsCommentObject[]) {
  const nodes = new Map<string, ThreadsCommentObject>();
  const orderedIds: string[] = [];

  for (const record of records) {
    const existing = nodes.get(record.id);

    if (!existing) {
      nodes.set(record.id, record);
      orderedIds.push(record.id);
      continue;
    }

    mergeThreadsCommentObjects(existing, record);
  }

  for (const node of nodes.values()) {
    node.children = [];
  }

  const parentByChildId = new Map<string, string>();
  for (const node of nodes.values()) {
    for (const childId of node.childIds) {
      if (nodes.has(childId) && !parentByChildId.has(childId)) {
        parentByChildId.set(childId, node.id);
      }
    }
  }

  const roots: ThreadsCommentObject[] = [];

  for (const id of orderedIds) {
    const node = nodes.get(id);

    if (!node) {
      continue;
    }

    const parentId =
      (node.repliedToId && nodes.has(node.repliedToId) ? node.repliedToId : null) ??
      parentByChildId.get(node.id) ??
      null;

    if (parentId && parentId !== node.id) {
      nodes.get(parentId)?.children.push(node);
      continue;
    }

    roots.push(node);
  }

  return roots;
}

function getThreadsCollectionNextUrl(
  currentUrl: URL,
  raw: unknown,
): string | null {
  if (!isRecord(raw) || !isRecord(raw.paging)) {
    return null;
  }

  if (typeof raw.paging.next === "string" && raw.paging.next) {
    return raw.paging.next;
  }

  const cursors = raw.paging.cursors;
  if (!isRecord(cursors) || typeof cursors.after !== "string" || !cursors.after) {
    return null;
  }

  const nextUrl = new URL(currentUrl.toString());
  nextUrl.searchParams.set("after", cursors.after);

  return nextUrl.toString();
}

function isThreadsUnsupportedFieldError(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const error =
    "error" in value && value.error && typeof value.error === "object"
      ? (value.error as Record<string, unknown>)
      : (value as Record<string, unknown>);
  const message =
    typeof error.message === "string" ? error.message : JSON.stringify(error);
  const code = typeof error.code === "number" ? error.code : null;

  return (
    /unknown field|unsupported field|invalid field|field.*does not exist/i.test(
      message,
    ) ||
    (code === 100 && /field|parameter/i.test(message))
  );
}

async function fetchThreadsCollectionPage(input: {
  accessToken: string;
  url: string;
}) {
  const response = await fetch(input.url, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    cache: "no-store",
  });

  const raw = await parseJson(response);

  if (!response.ok) {
    if (isThreadsNotFoundError(raw)) {
      return {
        items: [],
        nextUrl: null,
        raw,
      } as const;
    }

    throw new Error(
      `Threads comment collection fetch failed: ${JSON.stringify(raw)}`,
    );
  }

  return {
    items: flattenThreadsCommentRecords(raw),
    nextUrl: getThreadsCollectionNextUrl(new URL(input.url), raw),
    raw,
  } as const;
}

async function fetchThreadsCommentCollection(input: {
  accessToken: string;
  mediaId: string;
  endpoint: "conversation" | "replies";
}) {
  for (const fields of THREADS_COMMENT_FIELD_SETS) {
    try {
      const url = new URL(`${THREADS_GRAPH_BASE_URL}/${input.mediaId}/${input.endpoint}`);
      url.searchParams.set("fields", fields);
      url.searchParams.set("reverse", "false");
      url.searchParams.set("limit", THREADS_COMMENT_COLLECTION_LIMIT);

      const items: ThreadsCommentObject[] = [];
      const pageIds = new Set<string>();
      let nextUrl: string | null = url.toString();
      let pageRaw: unknown = null;

      while (nextUrl) {
        const page = await fetchThreadsCollectionPage({
          accessToken: input.accessToken,
          url: nextUrl,
        });

        pageRaw = page.raw;

        for (const item of page.items) {
          if (pageIds.has(item.id)) {
            continue;
          }

          pageIds.add(item.id);
          items.push(item);
        }

        nextUrl = page.nextUrl;
      }

      return {
        items,
        raw: pageRaw,
      } as const;
    } catch (error) {
      if (isThreadsUnsupportedFieldError(error) || isThreadsPermissionError(error)) {
        continue;
      }

      if (error instanceof Error && isThreadsUnsupportedFieldError((error as Error & { raw?: unknown }).raw)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    `Threads comment collection fetch failed for ${input.endpoint}: unsupported fields`,
  );
}

async function fetchThreadsCommentTree(
  input: {
    accessToken: string;
    mediaId: string;
  },
  visitedMediaIds = new Set<string>(),
): Promise<ThreadsCommentTreeResult> {
  if (visitedMediaIds.has(input.mediaId)) {
    return {
      source: "conversation",
      comments: [],
      raw: [],
    };
  }

  visitedMediaIds.add(input.mediaId);

  try {
    const conversation = await fetchThreadsCommentCollection({
      accessToken: input.accessToken,
      mediaId: input.mediaId,
      endpoint: "conversation",
    });

    const records = [...conversation.items];
    const seenRecordIds = new Set(records.map((record) => record.id));

    try {
      const replies = await fetchThreadsCommentCollection({
        accessToken: input.accessToken,
        mediaId: input.mediaId,
        endpoint: "replies",
      });

      for (const replyRecord of replies.items) {
        if (seenRecordIds.has(replyRecord.id)) {
          continue;
        }

        seenRecordIds.add(replyRecord.id);
        records.push(replyRecord);
      }
    } catch {
      // Replies endpoint can fail per-account scope; keep conversation data as fallback.
    }

    const childIdsToFetch = new Set<string>();

    for (const record of records) {
      for (const childId of record.childIds) {
        if (!seenRecordIds.has(childId)) {
          childIdsToFetch.add(childId);
        }
      }
    }

    for (const childId of childIdsToFetch) {
      if (visitedMediaIds.has(childId)) {
        continue;
      }

      try {
        const childTree = await fetchThreadsCommentTree(
          {
            accessToken: input.accessToken,
            mediaId: childId,
          },
          visitedMediaIds,
        );

        for (const childRecord of flattenThreadsCommentRecords(childTree.comments)) {
          if (seenRecordIds.has(childRecord.id)) {
            continue;
          }

          seenRecordIds.add(childRecord.id);
          records.push(childRecord);
        }
      } catch {
        // Ignore unavailable child threads and keep the rest of the tree.
      }
    }

    return {
      source: "conversation",
      comments: buildThreadsCommentTree(records),
      raw: conversation.raw,
    };
  } catch (error) {
    if (!(error instanceof Error) || !isThreadsNotFoundError(error)) {
      if (!isThreadsUnsupportedFieldError(error)) {
        throw error;
      }
    }
  }

  const replies = await fetchThreadsCommentCollection({
    accessToken: input.accessToken,
    mediaId: input.mediaId,
    endpoint: "replies",
  });

  const records = [...replies.items];
  const childIds = new Set<string>();

  for (const record of replies.items) {
    for (const childId of record.childIds) {
      childIds.add(childId);
    }
  }

  for (const childId of childIds) {
    if (visitedMediaIds.has(childId)) {
      continue;
    }

    const childTree = await fetchThreadsCommentTree(
      {
        accessToken: input.accessToken,
        mediaId: childId,
      },
      visitedMediaIds,
    );

    for (const childRecord of flattenThreadsCommentRecords(childTree.comments)) {
      if (!records.some((record) => record.id === childRecord.id)) {
        records.push(childRecord);
      }
    }
  }

  return {
    source: "replies",
    comments: buildThreadsCommentTree(records),
    raw: replies.raw,
  };
}

export async function getThreadsMediaComments(input: {
  accessToken: string;
  mediaId: string;
}): Promise<ThreadsCommentTreeResult> {
  return fetchThreadsCommentTree(input);
}

function isThreadsPermissionError(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const error =
    "error" in value && value.error && typeof value.error === "object"
      ? (value.error as Record<string, unknown>)
      : (value as Record<string, unknown>);
  const message =
    typeof error.message === "string" ? error.message : JSON.stringify(error);
  const code = typeof error.code === "number" ? error.code : null;
  const errorSubcode =
    typeof error.error_subcode === "number" ? error.error_subcode : null;

  return (
    code === 10 ||
    code === 200 ||
    errorSubcode === 200 ||
    /permission|not authorized|requires.*permission|manage_insights/i.test(message)
  );
}

function isThreadsInvalidTokenError(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const error =
    "error" in value && value.error && typeof value.error === "object"
      ? (value.error as Record<string, unknown>)
      : (value as Record<string, unknown>);
  const message =
    typeof error.message === "string" ? error.message : JSON.stringify(error);
  const code = typeof error.code === "number" ? error.code : null;

  return code === 190 || /invalid token|expired token|oauthexception/i.test(message);
}

function extractThreadsInsightValue(raw: unknown, metricName: string) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const data = Array.isArray((raw as Record<string, unknown>).data)
    ? ((raw as Record<string, unknown>).data as Record<string, unknown>[])
    : [];
  const metric = data.find((entry) => entry.name === metricName);
  const values = Array.isArray(metric?.values)
    ? (metric?.values as Array<{ value?: unknown }>)
    : [];
  const firstValue = values[0]?.value;

  return typeof firstValue === "number" ? firstValue : null;
}

async function createThreadsContainer(input: {
  accessToken: string;
  params: Record<string, string>;
}) {
  const containerResponse = await fetch(THREADS_CREATE_CONTAINER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(input.params),
    cache: "no-store",
  });

  const rawContainer = await parseJson(containerResponse);

  if (!containerResponse.ok) {
    throw new Error(
      `Threads container creation failed: ${JSON.stringify(rawContainer)}`,
    );
  }

  const containerId =
    typeof rawContainer?.id === "string" ? rawContainer.id : null;

  if (!containerId) {
    throw new Error(
      `Threads container response missing id: ${JSON.stringify(rawContainer)}`,
    );
  }

  return {
    containerId,
    raw: rawContainer,
  };
}

async function publishThreadsContainer(input: {
  accessToken: string;
  containerId: string;
  username?: string | null;
  rawContainer: unknown;
}) {
  const maxPublishAttempts = 8;

  for (let attempt = 1; attempt <= maxPublishAttempts; attempt += 1) {
    const publishResponse = await fetch(THREADS_PUBLISH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        creation_id: input.containerId,
      }),
      cache: "no-store",
    });

    const rawPublish = await parseJson(publishResponse);

    if (!publishResponse.ok) {
      if (
        attempt < maxPublishAttempts &&
        isThreadsContainerNotReadyForPublish(rawPublish, input.containerId)
      ) {
        await sleep(getThreadsPublishRetryBackoffMs(attempt));
        continue;
      }

      throw new Error(`Threads publish failed: ${JSON.stringify(rawPublish)}`);
    }

    const postId = typeof rawPublish?.id === "string" ? rawPublish.id : null;

    if (!postId) {
      throw new Error(
        `Threads publish response missing post id: ${JSON.stringify(rawPublish)}`,
      );
    }

    return {
      externalPostId: postId,
      externalPostUrl: buildThreadsPostUrl(postId, input.username),
      containerId: input.containerId,
      raw: {
        container: input.rawContainer,
        publish: rawPublish,
      },
    } satisfies PublishThreadsTextPostResult;
  }

  throw new Error("Threads publish failed: exhausted retries");
}

export async function getThreadsMediaInsights(input: {
  accessToken: string;
  mediaId: string;
}): Promise<ThreadsMediaInsightsResult> {
  const url = new URL(`${THREADS_GRAPH_BASE_URL}/${input.mediaId}/insights`);
  url.searchParams.set("metric", THREADS_INSIGHT_METRICS);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    cache: "no-store",
  });

  const raw = await parseJson(response);
  const fetched_at = new Date().toISOString();

  if (!response.ok) {
    if (isThreadsPermissionError(raw)) {
      return {
        views: null,
        source: "permission_denied",
        fetched_at,
        raw,
      };
    }

    if (isThreadsInvalidTokenError(raw)) {
      return {
        views: null,
        source: "unavailable",
        fetched_at,
        raw,
      };
    }

    throw new Error(`Threads insights fetch failed: ${JSON.stringify(raw)}`);
  }

  return {
    views: extractThreadsInsightValue(raw, "views"),
    source: "cached",
    fetched_at,
    raw,
  };
}

function isThreadsNotFoundError(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const error =
    "error" in value && value.error && typeof value.error === "object"
      ? (value.error as Record<string, unknown>)
      : (value as Record<string, unknown>);
  const message =
    typeof error.message === "string" ? error.message : JSON.stringify(error);
  const code = typeof error.code === "number" ? error.code : null;

  return (
    code === 100 ||
    /unsupported get request/i.test(message) ||
    /does not exist/i.test(message) ||
    /cannot find/i.test(message)
  );
}

function isThreadsContainerNotReadyForPublish(
  value: unknown,
  _containerId: string,
) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const error =
    "error" in value && value.error && typeof value.error === "object"
      ? (value.error as Record<string, unknown>)
      : (value as Record<string, unknown>);
  const message =
    typeof error.message === "string" ? error.message : JSON.stringify(error);
  const code = typeof error.code === "number" ? error.code : null;
  const errorSubcode =
    typeof error.error_subcode === "number" ? error.error_subcode : null;

  if (code !== 24) {
    return false;
  }

  const looksLikeNotReady =
    errorSubcode === 4279009 ||
    /requested resource does not exist/i.test(message) ||
    /cannot find/i.test(message) ||
    /does not exist/i.test(message) ||
    /미디어를 찾을 수 없음/i.test(message);

  if (!looksLikeNotReady) {
    return false;
  }
  return true;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getThreadsPublishRetryBackoffMs(attempt: number) {
  return Math.min(5000, 400 * 2 ** Math.max(0, attempt - 1));
}

export async function getThreadsMediaObject(input: {
  accessToken: string;
  mediaId: string;
}) {
  const url = new URL(`${THREADS_GRAPH_BASE_URL}/${input.mediaId}`);
  url.searchParams.set("fields", THREADS_MEDIA_FIELDS);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    cache: "no-store",
  });

  const raw = await parseJson(response);

  if (!response.ok) {
    if (isThreadsNotFoundError(raw)) {
      return null;
    }

    throw new Error(`Threads media fetch failed: ${JSON.stringify(raw)}`);
  }

  if (!raw || typeof raw !== "object" || typeof raw.id !== "string") {
    throw new Error(`Threads media response missing id: ${JSON.stringify(raw)}`);
  }

  return raw as ThreadsMediaObject;
}

export async function deleteThreadsMediaObject(input: {
  accessToken: string;
  mediaId: string;
}) {
  const response = await fetch(`${THREADS_GRAPH_BASE_URL}/${input.mediaId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    cache: "no-store",
  });

  const raw = await parseJson(response);

  if (!response.ok) {
    if (isThreadsNotFoundError(raw)) {
      return {
        deleted: false,
        alreadyDeleted: true,
        raw,
      } as const;
    }

    throw new Error(`Threads delete failed: ${JSON.stringify(raw)}`);
  }

  return {
    deleted: true,
    alreadyDeleted: false,
    raw,
  } as const;
}

export async function replyToThreadsComment(input: {
  accessToken: string;
  commentId: string;
  text: string;
  username?: string | null;
}) {
  return publishThreadsTextPost({
    accessToken: input.accessToken,
    text: input.text,
    username: input.username,
    replyToId: input.commentId,
  });
}

export async function publishThreadsTextPost(
  input: PublishThreadsTextPostInput,
): Promise<PublishThreadsTextPostResult> {
  const text = input.text.trim();
  const imageUrls =
    input.imageUrls
      ?.map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 3) ?? [];

  if (!input.accessToken) {
    throw new Error("Missing Threads access token");
  }

  if (!text && imageUrls.length === 0) {
    throw new Error("Missing Threads post text");
  }

  if (imageUrls.length === 0) {
    const { containerId, raw } = await createThreadsContainer({
      accessToken: input.accessToken,
      params: {
        media_type: "TEXT",
        text,
        ...(input.replyToId ? { reply_to_id: input.replyToId } : {}),
      },
    });

    return publishThreadsContainer({
      accessToken: input.accessToken,
      containerId,
      username: input.username,
      rawContainer: raw,
    });
  }

  if (imageUrls.length === 1) {
    const { containerId, raw } = await createThreadsContainer({
      accessToken: input.accessToken,
      params: {
        media_type: "IMAGE",
        image_url: imageUrls[0],
        ...(text ? { text } : {}),
        ...(input.replyToId ? { reply_to_id: input.replyToId } : {}),
      },
    });

    return publishThreadsContainer({
      accessToken: input.accessToken,
      containerId,
      username: input.username,
      rawContainer: raw,
    });
  }

  const children: string[] = [];
  const childContainers: unknown[] = [];

  for (const imageUrl of imageUrls) {
    const { containerId, raw } = await createThreadsContainer({
      accessToken: input.accessToken,
      params: {
        media_type: "IMAGE",
        image_url: imageUrl,
        is_carousel_item: "true",
      },
    });

    children.push(containerId);
    childContainers.push(raw);
  }

  const { containerId, raw } = await createThreadsContainer({
    accessToken: input.accessToken,
    params: {
      media_type: "CAROUSEL",
      children: children.join(","),
      ...(text ? { text } : {}),
      ...(input.replyToId ? { reply_to_id: input.replyToId } : {}),
    },
  });

  return publishThreadsContainer({
    accessToken: input.accessToken,
    containerId,
    username: input.username,
    rawContainer: {
      carousel: raw,
      children: childContainers,
    },
  });
}
