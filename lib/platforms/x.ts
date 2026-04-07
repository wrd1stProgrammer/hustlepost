const X_POST_URL = "https://api.x.com/2/tweets";

export type PublishXTextPostInput = {
  accessToken: string;
  text: string;
  username?: string | null;
};

export type PublishXTextPostResult = {
  externalPostId: string;
  externalPostUrl: string | null;
  raw: unknown;
};

function buildXPostUrl(postId: string, username?: string | null) {
  if (username) {
    return `https://x.com/${username}/status/${postId}`;
  }

  return `https://x.com/i/web/status/${postId}`;
}

export async function publishXTextPost(
  input: PublishXTextPostInput,
): Promise<PublishXTextPostResult> {
  const text = input.text.trim();

  if (!input.accessToken) {
    throw new Error("Missing X access token");
  }

  if (!text) {
    throw new Error("Missing X post text");
  }

  const response = await fetch(X_POST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
    cache: "no-store",
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(`X publish failed: ${JSON.stringify(json)}`);
  }

  const postId = json?.data?.id;

  if (typeof postId !== "string" || !postId) {
    throw new Error(`X publish response missing post id: ${JSON.stringify(json)}`);
  }

  return {
    externalPostId: postId,
    externalPostUrl: buildXPostUrl(postId, input.username),
    raw: json,
  };
}
