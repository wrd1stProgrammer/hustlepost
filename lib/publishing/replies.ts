const REPLY_CHAIN_PREFIX = "__PB_REPLY_CHAIN__:";

export function getScheduledPostReplyTexts(input: {
  replyTexts?: string[] | null;
  replyText?: string | null;
}) {
  if (Array.isArray(input.replyTexts) && input.replyTexts.length > 0) {
    return input.replyTexts
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  const replyText = typeof input.replyText === "string" ? input.replyText.trim() : "";
  if (!replyText) {
    return [];
  }

  if (!replyText.startsWith(REPLY_CHAIN_PREFIX)) {
    return [replyText];
  }

  try {
    const parsed = JSON.parse(replyText.slice(REPLY_CHAIN_PREFIX.length)) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [];
  }
}
