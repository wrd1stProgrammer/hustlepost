import "server-only";

import {
  callGlmChatCompletion,
  type GlmChatCompletionResult,
} from "@/lib/ai/glm";
import { VIRAL_CATEGORY_LABELS, type ViralCategory } from "@/lib/constants/marketing";
import type { SupportedPlatform } from "@/lib/types/db";
import type { ViralPostSummary } from "@/lib/types/marketing";

export type MarketingHookPrompt = {
  productName: string;
  audience: string;
  problem: string;
  benefits: string[];
  proofPoints?: string[];
  tone?: string;
  platform?: "x" | "threads" | "both";
  hookCount?: number;
};

export type MarketingHookResult = {
  hooks: string[];
  rawText: string;
  raw: GlmChatCompletionResult["raw"];
};

export type ViralHookPrompt = {
  category: ViralCategory;
  keyword: string;
  platformTargets: SupportedPlatform[];
  sourcePosts: ViralPostSummary[];
  hookCount?: number;
};

export type ThreadsDraftPrompt = {
  keywords: string[];
  sourcePosts: ViralPostSummary[];
  customization?: string;
  tone?: string;
  ctaStyle?: string;
  audience?: string;
  accountLabel?: string;
  hookCount?: number;
};

export type ThreadsDraftType = "informational" | "engagement" | "product";
type DraftOutputLanguage = "en" | "ko";

export type TypedThreadsDraftPrompt = {
  keywords: string[];
  sourcePosts: ViralPostSummary[];
  outputLanguage?: DraftOutputLanguage;
  audience?: string;
  accountLabel?: string;
  targetAudience?: string;
  productLink?: string;
  commonInstruction?: string;
  informationalFocus?: string;
  engagementFocus?: string;
  productFocus?: string;
  counts: Record<ThreadsDraftType, number>;
};

export type TypedThreadsDraftResult = {
  drafts: Record<ThreadsDraftType, string[]>;
  rawText: string;
  raw: GlmChatCompletionResult["raw"];
};

export type PolishThreadsDraftPrompt = {
  text: string;
  workspaceName?: string;
  keywords?: string[];
  customization?: {
    targetAudience?: string;
    productLink?: string;
    commonInstruction?: string;
    informationalFocus?: string;
    engagementFocus?: string;
    productFocus?: string;
  };
};

function getHookCount(value?: number) {
  if (!value || Number.isNaN(value)) {
    return 5;
  }

  return Math.min(Math.max(Math.trunc(value), 1), 12);
}

function buildPrompt(input: MarketingHookPrompt) {
  const platformLabel = input.platform ?? "both";
  const toneLabel = input.tone ?? "clear and punchy";
  const proofPoints = input.proofPoints?.length
    ? input.proofPoints.map((point) => `- ${point}`).join("\n")
    : "- none provided";
  const benefits = input.benefits.map((benefit) => `- ${benefit}`).join("\n");

  return [
    "You are writing short-form marketing hooks for social posts.",
    `Platform: ${platformLabel}`,
    `Tone: ${toneLabel}`,
    `Product: ${input.productName}`,
    `Audience: ${input.audience}`,
    `Problem: ${input.problem}`,
    "Benefits:",
    benefits,
    "Proof points:",
    proofPoints,
    "Return strict JSON only in this shape:",
    `{"hooks":["hook 1","hook 2"]}`,
    `Generate exactly ${getHookCount(input.hookCount)} hooks.`,
    "Keep each hook concise, specific, and non-repetitive.",
  ].join("\n");
}

function parseHooks(text: string) {
  const trimmed = text.trim();

  const jsonMatch = trimmed.match(/\{[\s\S]*\}$/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as { hooks?: unknown };
      if (Array.isArray(parsed.hooks)) {
        return parsed.hooks
          .map((hook) => (typeof hook === "string" ? hook.trim() : ""))
          .filter(Boolean);
      }
    } catch {
      // Fallback to line parsing below.
    }
  }

  const hooksArrayMatch = trimmed.match(/"hooks"\s*:\s*\[([\s\S]*?)\]/);
  if (hooksArrayMatch) {
    const extracted = Array.from(
      hooksArrayMatch[1].matchAll(/"((?:\\.|[^"\\])*)"/g),
    )
      .map((match) => match[1]?.replace(/\\"/g, '"').trim() ?? "")
      .filter(Boolean);

    if (extracted.length > 0) {
      return extracted;
    }
  }

  if (
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    trimmed.includes('"hooks"')
  ) {
    return [];
  }

  return trimmed
    .split("\n")
    .map((line) => line.replace(/^\s*[-*\d.]+\s*/, "").trim())
    .filter(Boolean);
}

function parseDraftBuckets(text: string): Record<ThreadsDraftType, string[]> {
  const emptyBuckets: Record<ThreadsDraftType, string[]> = {
    informational: [],
    engagement: [],
    product: [],
  };

  const trimmed = text.trim();
  const objectStarts: number[] = [];

  for (let index = 0; index < trimmed.length; index += 1) {
    if (trimmed[index] === "{") {
      objectStarts.push(index);
    }
  }

  const normalizeBucket = (value: unknown) =>
    Array.isArray(value)
      ? value
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter(Boolean)
      : [];

  for (let index = objectStarts.length - 1; index >= 0; index -= 1) {
    const candidate = trimmed.slice(objectStarts[index]);

    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const root =
        parsed.drafts && typeof parsed.drafts === "object" && parsed.drafts
          ? (parsed.drafts as Record<string, unknown>)
          : parsed;

      const productValue =
        root.product ?? root.product_led ?? root.productLed ?? root["product-integrated"];

      return {
        informational: normalizeBucket(root.informational),
        engagement: normalizeBucket(root.engagement),
        product: normalizeBucket(productValue),
      };
    } catch {
      continue;
    }
  }

  return emptyBuckets;
}

export async function generateMarketingHooks(
  input: MarketingHookPrompt,
): Promise<MarketingHookResult> {
  const completion = await callGlmChatCompletion({
    model: "glm-4.7",
    temperature: 0.8,
    maxTokens: 900,
    messages: [
      {
        role: "system",
        content:
          "You are a senior growth copywriter. Output only valid JSON unless asked otherwise.",
      },
      {
        role: "user",
        content: buildPrompt(input),
      },
    ],
  });

  return {
    hooks: parseHooks(completion.text),
    rawText: completion.text,
    raw: completion.raw,
  };
}

function buildSourcePostBlock(posts: ViralPostSummary[], limit = 8) {
  return posts
    .slice(0, limit)
    .map((post, index) => {
      return [
        `Reference ${index + 1}`,
        cleanSourcePostText(post.content_text || "", 260),
      ].join("\n");
    })
    .join("\n\n");
}

function cleanSourcePostText(rawText: string, maxLength = 220) {
  const cleaned = rawText
    .replace(/\r/g, "\n")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/@\w+/g, " ")
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, " ")
    .replace(/\b\d{1,2}:\d{2}\b/g, " ")
    .replace(/\bmore\b/gi, " ")
    .replace(/\bthreads?\s+edited\b/gi, " ")
    .replace(/\b(?:ai\s+threads?\s+edited|edited\s+threads?)\b/gi, " ")
    .replace(/\bfollow[a-z0-9_]*\b/gi, " ")
    .replace(/\.[a-z][a-z0-9_]{2,}\b/gi, " ")
    .replace(/[<>]/g, " ")
    .replace(/[→←↔↗↘]/g, " ")
    .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, " ")
    .replace(/[•▪︎·]+/g, " ")
    .replace(/\bviews?=\d+\b/gi, " ")
    .replace(/\blikes?=\d+\b/gi, " ")
    .replace(/\bvirality=\d+(?:\.\d+)?\b/gi, " ")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 4 &&
        !/^post\s+\d+/i.test(line) &&
        !/^author:/i.test(line) &&
        !/^metrics:/i.test(line),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.slice(0, maxLength);
}

function countLanguageChars(text: string) {
  const hangulCount = (text.match(/[가-힣]/g) ?? []).length;
  const latinCount = (text.match(/[A-Za-z]/g) ?? []).length;

  return {
    hangulCount,
    latinCount,
    alphaTotal: hangulCount + latinCount,
  };
}

function hasAnyDrafts(drafts: Record<ThreadsDraftType, string[]>) {
  return (
    drafts.informational.length > 0 ||
    drafts.engagement.length > 0 ||
    drafts.product.length > 0
  );
}

function sanitizeDraftText(text: string, maxLength = 220) {
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function splitDraftSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function formatThreadsParagraphs(text: string) {
  const compact = text
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!compact) return "";

  if (compact.includes("\n\n")) {
    return compact;
  }

  const sentences = splitDraftSentences(compact);

  if (sentences.length >= 2) {
    const chunks: string[] = [];
    for (let index = 0; index < sentences.length; index += 2) {
      chunks.push(sentences.slice(index, index + 2).join(" ").trim());
    }

    return chunks.filter(Boolean).join("\n\n");
  }

  return compact.replace(/\n+/g, "\n");
}

function containsSourceLeakage(text: string) {
  return (
    /\bmore\b/i.test(text) ||
    /\bverified\b/i.test(text) ||
    /\bthreads?\s+edited\b/i.test(text) ||
    /\b(?:ai\s+threads?\s+edited|edited\s+threads?)\b/i.test(text) ||
    /\bfollow[a-z0-9_]*\b/i.test(text) ||
    /\.[a-z][a-z0-9_]{2,}\b/i.test(text) ||
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(text) ||
    /\b(?:job\s*vacancy|jawatan\s*kosong|resume|apply\s*now)\b/i.test(text) ||
    /\b(?:whatsapp|dm\s*(?:for|to|order)|profile\s*link)\b/i.test(text) ||
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text) ||
    /https?:\/\/\S+/i.test(text) ||
    /views?=\d+/i.test(text) ||
    /likes?=\d+/i.test(text) ||
    /virality=\d+/i.test(text)
  );
}

function cleanGeneratedDraftText(rawText: string, maxLength = 420) {
  const cleaned = rawText
    .replace(/\r/g, "\n")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\bmore\b/gi, " ")
    .replace(/\bverified\b/gi, " ")
    .replace(/\bthreads?\s+edited\b/gi, " ")
    .replace(/\b(?:ai\s+threads?\s+edited|edited\s+threads?)\b/gi, " ")
    .replace(/\bfollow[a-z0-9_]*\b/gi, " ")
    .replace(/\.[a-z][a-z0-9_]{2,}\b/gi, " ")
    .replace(/[<>]/g, " ")
    .replace(/[→←↔↗↘]/g, " ")
    .replace(/[•▪︎·]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleaned.slice(0, maxLength);
}

function isLikelyLanguageMismatch(
  text: string,
  outputLanguage: DraftOutputLanguage,
) {
  const { hangulCount, latinCount, alphaTotal } = countLanguageChars(text);

  if (alphaTotal < 12) return false;

  if (outputLanguage === "ko") {
    return hangulCount / alphaTotal < 0.45;
  }

  return latinCount / alphaTotal < 0.7;
}

function hasDisallowedScriptForLanguage(
  text: string,
  outputLanguage: DraftOutputLanguage,
) {
  const { hangulCount, alphaTotal } = countLanguageChars(text);
  if (alphaTotal < 8) return false;

  if (outputLanguage === "en") {
    return hangulCount >= 2;
  }

  return false;
}

function tokenizeForSimilarity(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  );
}

function calcJaccardSimilarity(left: string, right: string) {
  const leftTokens = tokenizeForSimilarity(left);
  const rightTokens = tokenizeForSimilarity(right);

  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }

  const union = leftTokens.size + rightTokens.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function finalizeDraftText(text: string) {
  return formatThreadsParagraphs(cleanGeneratedDraftText(text, 420));
}

function hasLowQualityPatterns(text: string) {
  return (
    /(?:\d+\.\s*\[[^\]]+\])/.test(text) ||
    /(?:\d+\.\s*[A-Za-z가-힣][^.\n]{0,45}\s*-\s*[A-Za-z가-힣])/.test(text) ||
    /(?:\.\w+\s+verified)/i.test(text) ||
    /\bthreads?\s+edited\b/i.test(text)
  );
}

function buildLanguageSafeSourceHint(input: {
  text: string;
  outputLanguage: DraftOutputLanguage;
  keyword: string;
  index: number;
}) {
  const cleaned = cleanSourcePostText(input.text, 180);
  const { hangulCount, latinCount } = countLanguageChars(cleaned);

  if (!cleaned) {
    if (input.outputLanguage === "ko") {
      const koFallbacks = [
        `${input.keyword}에서 가장 먼저 지킬 기준 한 가지를 정리해보세요.`,
        `${input.keyword}를 오래 유지하게 만드는 현실적인 루틴을 먼저 잡아보세요.`,
        `${input.keyword}는 강도보다 반복 가능한 구조가 핵심입니다.`,
      ];
      return koFallbacks[input.index % koFallbacks.length];
    }

    const enFallbacks = [
      `Start ${input.keyword} with one clear baseline you can measure weekly.`,
      `In ${input.keyword}, consistency usually comes from repeatable steps.`,
      `Build ${input.keyword} around a simple routine you can sustain.`,
    ];
    return enFallbacks[input.index % enFallbacks.length];
  }

  if (input.outputLanguage === "en" && hangulCount > latinCount) {
    const enLocalizationFallbacks = [
      `The key lesson is to define a baseline first, then scale gradually.`,
      `The main takeaway is to simplify the process and keep it repeatable.`,
      `A practical structure beats motivation spikes when consistency matters.`,
    ];
    return enLocalizationFallbacks[input.index % enLocalizationFallbacks.length];
  }

  if (input.outputLanguage === "ko" && latinCount > hangulCount * 2) {
    const koLocalizationFallbacks = [
      "핵심은 시작 기준을 먼저 정하고 점진적으로 늘리는 것입니다.",
      "복잡한 방식보다 반복 가능한 구조를 먼저 만드는 것이 중요합니다.",
      "의욕보다 시스템을 먼저 고정해야 지속하기 쉬워집니다.",
    ];
    return koLocalizationFallbacks[input.index % koLocalizationFallbacks.length];
  }

  return cleaned;
}

function needsLocalizationRepair(
  drafts: Record<ThreadsDraftType, string[]>,
  outputLanguage: DraftOutputLanguage,
) {
  const allDrafts = [
    ...drafts.informational,
    ...drafts.engagement,
    ...drafts.product,
  ];

  return allDrafts.some((text) => {
    const finalized = finalizeDraftText(text);
    return (
      !finalized ||
      containsSourceLeakage(finalized) ||
      hasLowQualityPatterns(finalized) ||
      isLikelyLanguageMismatch(finalized, outputLanguage) ||
      hasDisallowedScriptForLanguage(finalized, outputLanguage)
    );
  });
}

async function localizeTypedDraftBuckets(input: {
  drafts: Record<ThreadsDraftType, string[]>;
  counts: Record<ThreadsDraftType, number>;
  outputLanguage: DraftOutputLanguage;
}) {
  const languageLabel = input.outputLanguage === "ko" ? "Korean" : "English";

  const completion = await callGlmChatCompletion({
    model: "glm-4.7",
    temperature: 0.2,
    maxTokens: 1800,
    thinking: false,
    messages: [
      {
        role: "system",
        content:
          "You localize social drafts into one target language and return strict JSON only.",
      },
      {
        role: "user",
        content: [
          `Rewrite the drafts below so every draft is fully natural ${languageLabel}.`,
          `Target language is mandatory: ${languageLabel}.`,
          `Required counts: informational=${input.counts.informational}, engagement=${input.counts.engagement}, product=${input.counts.product}.`,
          "Do not change draft intent or draft type.",
          "Translate any non-target-language fragments.",
          "Remove copied source artifacts (e.g. More, Verified, Threads Edited, handles, metadata, noisy lists).",
          "Keep Threads style: short paragraphs, natural cadence, conversational, no hashtags, no emojis unless already essential.",
          input.outputLanguage === "en"
            ? "Output must not include Hangul characters."
            : "Output should stay Korean-first while keeping proper nouns as needed.",
          'Return JSON only in this exact shape: {"informational":["..."],"engagement":["..."],"product":["..."]}',
          "Drafts to localize:",
          JSON.stringify(input.drafts),
        ].join("\n\n"),
      },
    ],
  });

  return {
    drafts: parseDraftBuckets(completion.text),
    rawText: completion.text,
    raw: completion.raw,
  };
}

function normalizeDraftBucket(
  drafts: string[],
  fallbackBuilder: (index: number) => string,
  outputLanguage: DraftOutputLanguage,
) {
  const normalized: string[] = [];

  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index] ?? "";
    const finalized = finalizeDraftText(draft);
    const shouldFallback =
      !finalized ||
      containsSourceLeakage(finalized) ||
      hasLowQualityPatterns(finalized) ||
      isLikelyLanguageMismatch(finalized, outputLanguage) ||
      hasDisallowedScriptForLanguage(finalized, outputLanguage);

    const candidate = shouldFallback ? fallbackBuilder(index) : finalized;
    const normalizedCandidate = finalizeDraftText(candidate);
    const candidateStillInvalid =
      !normalizedCandidate ||
      containsSourceLeakage(normalizedCandidate) ||
      hasLowQualityPatterns(normalizedCandidate) ||
      isLikelyLanguageMismatch(normalizedCandidate, outputLanguage) ||
      hasDisallowedScriptForLanguage(normalizedCandidate, outputLanguage);
    const finalizedCandidate = candidateStillInvalid
      ? finalizeDraftText(fallbackBuilder(index + 31))
      : normalizedCandidate;

    const isNearDuplicate = normalized.some(
      (existing) => calcJaccardSimilarity(existing, finalizedCandidate) >= 0.74,
    );

    if (isNearDuplicate) {
      normalized.push(finalizeDraftText(fallbackBuilder(index + 17)));
    } else {
      normalized.push(finalizedCandidate);
    }
  }

  return normalized;
}

export function buildProductReplyTexts(input: {
  productLink?: string;
  accountLabel?: string;
  targetAudience?: string;
  outputLanguage?: DraftOutputLanguage;
}) {
  const link = input.productLink?.trim();
  if (!link) return [];

  const audience = input.targetAudience?.trim();
  const language: DraftOutputLanguage = input.outputLanguage === "ko" ? "ko" : "en";
  const owner =
    input.accountLabel?.trim() || (language === "ko" ? "이 워크스페이스" : "this workspace");

  return [
    [
      language === "ko"
        ? audience
          ? `${audience} 기준으로 더 자세한 정리와 링크는 여기 남겨둘게요.`
          : `${owner}에서 참고할 링크를 여기 남겨둘게요.`
        : audience
          ? `For ${audience}, I'll leave the full breakdown and link here.`
          : `I'll leave the reference link here for ${owner}.`,
      link,
    ].join("\n"),
  ];
}

export function buildProductReplyText(input: {
  productLink?: string;
  accountLabel?: string;
  targetAudience?: string;
  outputLanguage?: DraftOutputLanguage;
}) {
  return buildProductReplyTexts(input)[0] ?? "";
}

function buildFallbackTypedDrafts(
  input: TypedThreadsDraftPrompt,
): Record<ThreadsDraftType, string[]> {
  const keywords = input.keywords.filter(Boolean);
  const outputLanguage: DraftOutputLanguage = input.outputLanguage === "ko" ? "ko" : "en";
  const sourceTexts = input.sourcePosts
    .map((post, index) =>
      buildLanguageSafeSourceHint({
        text: post.content_text || "",
        outputLanguage,
        keyword:
          keywords[index % Math.max(keywords.length, 1)] ||
          (outputLanguage === "ko" ? "이 주제" : "this topic"),
        index,
      }),
    )
    .filter(Boolean);
  const audience =
    input.targetAudience?.trim() ||
    input.audience?.trim() ||
    (outputLanguage === "ko" ? "독자" : "readers");
  const productLink = input.productLink?.trim();

  const pickSource = (index: number) =>
    sourceTexts[index % Math.max(sourceTexts.length, 1)] ||
    (outputLanguage === "ko"
      ? `${keywords[index % Math.max(keywords.length, 1)] || "이 주제"}에 대한 핵심 포인트를 정리해보세요.`
      : `Summarize the key takeaway about ${keywords[index % Math.max(keywords.length, 1)] || "this topic"}.`);
  const pickKeyword = (index: number) =>
    keywords[index % Math.max(keywords.length, 1)] ||
    (outputLanguage === "ko" ? "이 주제" : "this topic");

  const buildDraft = (type: ThreadsDraftType, index: number) => {
    const keyword = pickKeyword(index);
    const source = pickSource(index);

    if (type === "informational") {
      if (outputLanguage === "ko") {
        const openers = [
          `${keyword}에서 자주 놓치는 기준이 있습니다.`,
          `${keyword}는 방법보다 순서를 먼저 잡아야 흔들리지 않아요.`,
          `${keyword}를 할 때 효과를 가르는 건 강도가 아니라 기준입니다.`,
        ];
        const closers = [
          `${audience}이라면 먼저 내 상황에 맞는 기준을 정하고 시작해보세요.`,
          `${audience} 기준으로 적용 가능한 한 가지부터 고정하면 결과가 안정됩니다.`,
          `${audience}이라면 오늘 바로 따라할 수 있는 한 단계만 먼저 정해보세요.`,
        ];

        return [openers[index % openers.length], `${source}`, closers[index % closers.length]].join(
          "\n\n",
        );
      }

      const openers = [
        `A key thing people miss in ${keyword} is the baseline.`,
        `${keyword} gets easier when you set the sequence before intensity.`,
        `The biggest miss in ${keyword} is using effort without a clear standard.`,
      ];
      const closers = [
        `If you're part of ${audience}, start by setting a realistic baseline first.`,
        `For ${audience}, consistency usually comes from a smaller but repeatable rule.`,
        `If you're in ${audience}, pick one measurable step and lock it in this week.`,
      ];

      return [openers[index % openers.length], `${source}`, closers[index % closers.length]].join(
        "\n\n",
      );
    }

    if (type === "engagement") {
      if (outputLanguage === "ko") {
        const openers = [
          `${keyword}에서 가장 먼저 막히는 지점은 어디였나요?`,
          `${keyword} 하면서 효과가 안 나던 구간이 있었다면 어디였나요?`,
          `${keyword}를 계속 못 이어가게 만든 가장 큰 이유가 뭐였나요?`,
        ];
        const closers = [
          `${audience} 기준으로 실제로 버틸 수 있었던 방식이 궁금합니다.`,
          `${audience}이라면 현실적으로 유지된 방법을 댓글로 공유해 주세요.`,
          `${audience} 관점에서 가장 효과적이었던 접근을 듣고 싶어요.`,
        ];

        return [openers[index % openers.length], `${source}`, closers[index % closers.length]].join(
          "\n\n",
        );
      }

      const openers = [
        `What was the first blocker you hit when working on ${keyword}?`,
        `If ${keyword} stalled for you, where did it break first?`,
        `What made ${keyword} hard to sustain in your case?`,
      ];
      const closers = [
        `If you're in ${audience}, I'd like to hear what felt actually sustainable.`,
        `For ${audience}, which approach felt realistic enough to keep going?`,
        `If you're part of ${audience}, what finally made it stick?`,
      ];

      return [openers[index % openers.length], `${source}`, closers[index % closers.length]].join(
        "\n\n",
      );
    }

    if (outputLanguage === "ko") {
      const openers = [
        `${keyword}가 계속 흔들린다면 의지보다 방법의 문제일 수 있습니다.`,
        `${keyword}가 반복해서 실패한다면 기준 설계부터 다시 볼 필요가 있어요.`,
        `${keyword} 결과가 불안정하다면 실행 방식이 내 상황과 안 맞을 가능성이 큽니다.`,
      ];
      const closers = [
        productLink
          ? "필요하면 자세한 링크는 첫 댓글에 남겨둘게요."
          : "핵심 단계만 다시 정리해도 체감이 크게 달라질 수 있습니다.",
        productLink
          ? "상세 정리와 링크는 첫 댓글에서 확인할 수 있게 두겠습니다."
          : "한 번에 바꾸기보다 핵심 한 단계부터 고정해보세요.",
        productLink
          ? "자세한 안내는 첫 댓글 링크로 이어서 볼 수 있습니다."
          : "오늘은 가장 영향 큰 한 가지부터 바로 적용해보세요.",
      ];

      return [openers[index % openers.length], `${source}`, closers[index % closers.length]].join(
        "\n\n",
      );
    }

    const openers = [
      `If ${keyword} keeps breaking down, it's often a method mismatch, not a willpower issue.`,
      `${keyword} usually fails from setup gaps before effort gaps.`,
      `When ${keyword} feels unstable, the framework is often the real bottleneck.`,
    ];
    const closers = [
      productLink
        ? "I'll leave the detailed link in the first reply."
        : "A tighter step-by-step structure usually makes this much easier to sustain.",
      productLink
        ? "If helpful, I'll add the detailed link in the first reply."
        : "Start with one repeatable rule before scaling intensity.",
      productLink
        ? "The practical breakdown and link will be in the first reply."
        : "Small consistent checks outperform occasional hard pushes.",
    ];

    return [openers[index % openers.length], `${source}`, closers[index % closers.length]].join(
      "\n\n",
    );
  };

  return {
    informational: Array.from({ length: input.counts.informational }, (_, index) =>
      buildDraft("informational", index),
    ),
    engagement: Array.from({ length: input.counts.engagement }, (_, index) =>
      buildDraft("engagement", index),
    ),
    product: Array.from({ length: input.counts.product }, (_, index) =>
      buildDraft("product", index),
    ),
  };
}

async function repairTypedDraftBuckets(input: {
  rawText: string;
  counts: Record<ThreadsDraftType, number>;
  outputLanguage: DraftOutputLanguage;
}) {
  const languageLabel = input.outputLanguage === "ko" ? "Korean" : "English";

  const completion = await callGlmChatCompletion({
    model: "glm-4.7",
    temperature: 0.2,
    maxTokens: 1400,
    thinking: false,
    messages: [
      {
        role: "system",
        content:
          "You repair malformed draft output into strict JSON. Return JSON only with informational, engagement, and product arrays.",
      },
      {
        role: "user",
        content: [
          "Convert the draft content below into strict JSON.",
          `Output language must stay in ${languageLabel}.`,
          `Need exactly ${input.counts.informational} informational drafts, ${input.counts.engagement} engagement drafts, and ${input.counts.product} product drafts.`,
          'Return JSON only in this exact shape: {"informational":["..."],"engagement":["..."],"product":["..."]}',
          "If the source content is partially structured, preserve the actual draft text and just normalize the format.",
          "Draft content:",
          input.rawText,
        ].join("\n\n"),
      },
    ],
  });

  return {
    drafts: parseDraftBuckets(completion.text),
    rawText: completion.text,
    raw: completion.raw,
  };
}

export async function generateViralHooks(
  input: ViralHookPrompt,
): Promise<MarketingHookResult> {
  const hookCount = getHookCount(input.hookCount);
  const categoryLabel = VIRAL_CATEGORY_LABELS[input.category];
  const platformLabel =
    input.platformTargets.length === 2
      ? "x and threads"
      : input.platformTargets.join(", ");
  const sourceBlock = buildSourcePostBlock(input.sourcePosts);

  const completion = await callGlmChatCompletion({
    model: "glm-4.7",
    temperature: 0.85,
    maxTokens: 1200,
    messages: [
      {
        role: "system",
        content:
          "You analyze viral social posts and write short, punchy hook variants. Return strict JSON only.",
      },
      {
        role: "user",
        content: [
          `Category: ${categoryLabel}`,
          `Keyword: ${input.keyword}`,
          `Target platforms: ${platformLabel}`,
          `Write exactly ${hookCount} unique single-post hooks.`,
          "Style: high-signal, hook-first, founder/creator voice, no hashtags, no emojis, no numbering in the hook itself.",
          'Return JSON only in this shape: {"hooks":["hook 1","hook 2"]}',
          "Use the source posts only as pattern inspiration. Do not copy them verbatim.",
          "Source posts:",
          sourceBlock,
        ].join("\n\n"),
      },
    ],
  });

  return {
    hooks: parseHooks(completion.text).slice(0, hookCount),
    rawText: completion.text,
    raw: completion.raw,
  };
}

export async function generateThreadsDrafts(
  input: ThreadsDraftPrompt,
): Promise<MarketingHookResult> {
  const hookCount = getHookCount(input.hookCount);
  const sourceBlock = buildSourcePostBlock(input.sourcePosts);
  const customization = input.customization?.trim() || "none";
  const tone = input.tone?.trim() || "clear, high-signal, conversational";
  const ctaStyle = input.ctaStyle?.trim() || "soft CTA";
  const audience = input.audience?.trim() || "threads audience interested in the topic";
  const accountLabel = input.accountLabel?.trim() || "a Threads account";

  const completion = await callGlmChatCompletion({
    model: "glm-4.7",
    temperature: 0.85,
    maxTokens: 1400,
    thinking: false,
    messages: [
      {
        role: "system",
        content:
          "You write Threads post drafts grounded in source material. Return strict JSON only.",
      },
      {
        role: "user",
        content: [
          "Create Threads-ready draft posts based on the source posts below.",
          `Keywords: ${input.keywords.join(", ")}`,
          `Audience: ${audience}`,
          `Account context: ${accountLabel}`,
          `Tone: ${tone}`,
          `CTA style: ${ctaStyle}`,
          `Customization: ${customization}`,
          `Write exactly ${hookCount} distinct draft posts.`,
          "Each draft should feel like a complete Threads post, not just a one-line hook.",
          "Keep them concise, readable, and non-repetitive. No hashtags. No emojis unless customization explicitly asks for them.",
          'Return JSON only in this shape: {"hooks":["draft 1","draft 2"]}',
          "Use the source posts for inspiration and framing only. Do not copy them verbatim.",
          "Source posts:",
          sourceBlock,
        ].join("\n\n"),
      },
    ],
  });

  return {
    hooks: parseHooks(completion.text).slice(0, hookCount),
    rawText: completion.text,
    raw: completion.raw,
  };
}

export async function generateTypedThreadsDrafts(
  input: TypedThreadsDraftPrompt,
): Promise<TypedThreadsDraftResult> {
  const outputLanguage: DraftOutputLanguage = input.outputLanguage === "ko" ? "ko" : "en";
  const languageLabel = outputLanguage === "ko" ? "Korean" : "English";
  const sourceBlock = buildSourcePostBlock(
    input.sourcePosts,
    Math.max(input.sourcePosts.length, 1),
  );
  const audience = input.audience?.trim() || "Threads followers interested in the topic";
  const accountLabel = input.accountLabel?.trim() || "a Threads account";
  const targetAudience = input.targetAudience?.trim() || "none";
  const productLink = input.productLink?.trim() || "none";
  const commonInstruction = input.commonInstruction?.trim() || "none";
  const informationalFocus = input.informationalFocus?.trim() || "teach something useful";
  const engagementFocus = input.engagementFocus?.trim() || "invite replies naturally";
  const productFocus =
    input.productFocus?.trim() || "introduce the product or service naturally";

  const buildTypedPrompt = (strictMode = false) =>
    [
      "Create grouped Threads post drafts based on the source posts below.",
      `Output language: ${languageLabel}`,
      `Write every draft entirely in ${languageLabel}.`,
      `Language lock: Even if keywords, source posts, or workspace customization are in another language, translate ideas first and write final copy only in ${languageLabel}.`,
      outputLanguage === "en"
        ? "Hard rule: output must not include Hangul characters in the final drafts."
        : "Hard rule: keep final drafts Korean-first and culturally natural for Korean Threads readers.",
      "Localize wording for native social context in the target language; avoid literal translation tone.",
      `Keywords: ${input.keywords.join(", ")}`,
      `Audience: ${audience}`,
      `Account context: ${accountLabel}`,
      `Target audience: ${targetAudience}`,
      `Product link: ${productLink}`,
      `Common instruction: ${commonInstruction}`,
      `Informational focus: ${informationalFocus}`,
      `Engagement focus: ${engagementFocus}`,
      `Product focus: ${productFocus}`,
      `Write exactly ${input.counts.informational} informational drafts, ${input.counts.engagement} engagement drafts, and ${input.counts.product} product-integrated drafts.`,
      "Informational drafts should teach, clarify, or summarize something worth saving.",
      "Engagement drafts should encourage replies, reactions, or conversation without feeling clickbait-y.",
      "Product drafts should naturally weave in the product or service, without sounding like a hard ad.",
      "If a product link exists, do not paste the URL into the main body. Instead, end with a soft cue that the link will be left in the first reply.",
      "Each draft should feel like a complete Threads post, not just a one-line hook.",
      "Format each draft with short paragraph breaks suitable for Threads.",
      "Do not include usernames, timestamps, 'More', 'Verified', links, copied source lists, or source metadata in the draft.",
      "Each draft must start with a different opening sentence pattern to reduce repetition.",
      strictMode
        ? "Strict mode: Return pure JSON only. No markdown, no commentary, no analysis, no reasoning text."
        : "Return strict JSON only.",
      "Keep them concise, readable, non-repetitive, and grounded in the source posts. No hashtags. No emojis unless explicitly requested.",
      'Return JSON only in this exact shape: {"informational":["..."],"engagement":["..."],"product":["..."]}',
      "Use the source posts for inspiration and framing only. Do not copy them verbatim.",
      "Source posts:",
      sourceBlock,
    ].join("\n\n");

  let drafts = {
    informational: [] as string[],
    engagement: [] as string[],
    product: [] as string[],
  };
  let rawText = "";
  let raw: GlmChatCompletionResult["raw"] = null;

  try {
    const completion = await callGlmChatCompletion({
      model: "glm-4.7",
      temperature: 0.85,
      maxTokens: 1600,
      thinking: false,
      messages: [
        {
          role: "system",
          content:
            "You write Threads-ready post drafts. Return strict JSON only with informational, engagement, and product arrays.",
        },
        {
          role: "user",
          content: buildTypedPrompt(false),
        },
      ],
    });

    drafts = parseDraftBuckets(completion.text);
    rawText = completion.text;
    raw = completion.raw;

    if (!hasAnyDrafts(drafts)) {
      const repaired = await repairTypedDraftBuckets({
        rawText: completion.text,
        counts: input.counts,
        outputLanguage,
      });

      if (hasAnyDrafts(repaired.drafts)) {
        drafts = repaired.drafts;
        rawText = repaired.rawText;
        raw = repaired.raw;
      }
    }

    if (!hasAnyDrafts(drafts)) {
      const retryCompletion = await callGlmChatCompletion({
        model: "glm-4.7",
        temperature: 0.45,
        maxTokens: 1800,
        thinking: false,
        messages: [
          {
            role: "system",
            content:
              "You write Threads-ready post drafts. Return strict JSON only with informational, engagement, and product arrays.",
          },
          {
            role: "user",
            content: buildTypedPrompt(true),
          },
        ],
      });

      const retryDrafts = parseDraftBuckets(retryCompletion.text);
      if (hasAnyDrafts(retryDrafts)) {
        drafts = retryDrafts;
        rawText = retryCompletion.text;
        raw = retryCompletion.raw;
      }
    }
  } catch (error) {
    console.error("[generateTypedThreadsDrafts] falling back to local draft synthesis", error);
  }

  if (!hasAnyDrafts(drafts)) {
    drafts = buildFallbackTypedDrafts(input);
    rawText = rawText || "fallback:local";
  }

  if (hasAnyDrafts(drafts) && needsLocalizationRepair(drafts, outputLanguage)) {
    try {
      const localized = await localizeTypedDraftBuckets({
        drafts,
        counts: input.counts,
        outputLanguage,
      });

      if (hasAnyDrafts(localized.drafts)) {
        drafts = localized.drafts;
        rawText = localized.rawText;
        raw = localized.raw;
      }
    } catch (error) {
      console.error("[generateTypedThreadsDrafts] localization repair failed", error);
    }
  }

  const fallbackDrafts = buildFallbackTypedDrafts(input);
  drafts = {
    informational: normalizeDraftBucket(
      drafts.informational.slice(0, input.counts.informational),
      (index) => fallbackDrafts.informational[index] ?? "",
      outputLanguage,
    ),
    engagement: normalizeDraftBucket(
      drafts.engagement.slice(0, input.counts.engagement),
      (index) => fallbackDrafts.engagement[index] ?? "",
      outputLanguage,
    ),
    product: normalizeDraftBucket(
      drafts.product.slice(0, input.counts.product),
      (index) => fallbackDrafts.product[index] ?? "",
      outputLanguage,
    ),
  };

  return {
    drafts,
    rawText,
    raw,
  };
}

export async function polishThreadsDraft(
  input: PolishThreadsDraftPrompt,
): Promise<MarketingHookResult> {
  const completion = await callGlmChatCompletion({
    model: "glm-4.7",
    temperature: 0.7,
    maxTokens: 900,
    thinking: false,
    messages: [
      {
        role: "system",
        content:
          "You rewrite rough Threads drafts into cleaner, more publishable Threads posts. Return plain text only.",
      },
      {
        role: "user",
        content: [
          `Workspace: ${input.workspaceName || "main"}`,
          `Keywords: ${(input.keywords ?? []).join(", ") || "none"}`,
          `Target audience: ${input.customization?.targetAudience || "none"}`,
          `Product link: ${input.customization?.productLink || "none"}`,
          `Common instruction: ${input.customization?.commonInstruction || "none"}`,
          `Informational focus: ${input.customization?.informationalFocus || "none"}`,
          `Engagement focus: ${input.customization?.engagementFocus || "none"}`,
          `Product focus: ${input.customization?.productFocus || "none"}`,
          "Rewrite the text below into a cleaner Threads-ready post.",
          "Keep the meaning, improve rhythm and readability, avoid hashtags, avoid emojis unless clearly needed, and keep it concise.",
          "Return only the rewritten post text.",
          "Original text:",
          input.text,
        ].join("\n\n"),
      },
    ],
  });

  return {
    hooks: [completion.text.trim()],
    rawText: completion.text,
    raw: completion.raw,
  };
}
