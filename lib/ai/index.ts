export {
  callGlmChatCompletion,
  type GlmChatCompletionInput,
  type GlmChatCompletionResult,
  type GlmChatMessage,
} from "@/lib/ai/glm";
export {
  buildProductReplyText,
  buildProductReplyTexts,
  generateMarketingHooks,
  type MarketingHookPrompt,
  type MarketingHookResult,
  generateThreadsDrafts,
  type ThreadsDraftPrompt,
  generateTypedThreadsDrafts,
  type ThreadsDraftType,
  type TypedThreadsDraftPrompt,
  type TypedThreadsDraftResult,
  polishThreadsDraft,
  type PolishThreadsDraftPrompt,
  generateViralHooks,
  type ViralHookPrompt,
} from "@/lib/ai/hooks";
