import "server-only";

export type GlmChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GlmChatCompletionInput = {
  messages: GlmChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  thinking?: boolean;
};

export type GlmChatCompletionResult = {
  text: string;
  raw: unknown;
};

const GLM_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
const GLM_DEFAULT_MODEL = "glm-4.7";

function getGlmApiKey() {
  const apiKey = process.env.GLM_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GLM_API_KEY");
  }

  return apiKey;
}

function getMessageText(message: unknown) {
  const normalizeMessagePart = (value: unknown) => {
    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value)) {
      return value
        .map((part) => {
          if (typeof part === "string") {
            return part;
          }

          if (part && typeof part === "object" && "text" in part) {
            const textValue = (part as { text?: unknown }).text;
            return typeof textValue === "string" ? textValue : "";
          }

          return "";
        })
        .filter(Boolean)
        .join("");
    }

    return "";
  };

  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message)) {
    return normalizeMessagePart(message);
  }

  if (message && typeof message === "object") {
    const messageObject = message as {
      content?: unknown;
      reasoning_content?: unknown;
      reasoningContent?: unknown;
    };

    const contentText = normalizeMessagePart(messageObject.content);
    if (contentText) {
      return contentText;
    }

    const reasoningText =
      normalizeMessagePart(messageObject.reasoning_content) ||
      normalizeMessagePart(messageObject.reasoningContent);

    if (reasoningText) {
      return reasoningText;
    }
  }

  return "";
}

export async function callGlmChatCompletion(
  input: GlmChatCompletionInput,
): Promise<GlmChatCompletionResult> {
  const response = await fetch(`${GLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getGlmApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model ?? GLM_DEFAULT_MODEL,
      messages: input.messages,
      temperature: input.temperature ?? 0.7,
      top_p: input.topP ?? 0.9,
      max_tokens: input.maxTokens ?? 800,
      ...(typeof input.thinking === "boolean"
        ? {
            thinking: {
              type: input.thinking ? "enabled" : "disabled",
            },
          }
        : {}),
    }),
    cache: "no-store",
  });

  const raw = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`GLM chat completion failed: ${JSON.stringify(raw)}`);
  }

  const text = getMessageText(raw?.choices?.[0]?.message);

  if (!text) {
    throw new Error(
      `GLM chat completion response missing text: ${JSON.stringify(raw)}`,
    );
  }

  return {
    text,
    raw,
  };
}
