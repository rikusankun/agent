import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { defineAgent } from "eve";
import { defineDynamic } from "eve/models";

/** Used when no OpenAI-compatible endpoint is configured. */
const GATEWAY_MODEL = "zai/glm-4.7-flashx";
const DEFAULT_CONTEXT_WINDOW = 128_000;

export default defineAgent({
  model: defineDynamic(() => {
    const baseURL = process.env.EVE_MODEL_BASE_URL;
    const modelId = process.env.EVE_MODEL_ID;
    if (!baseURL || !modelId) return GATEWAY_MODEL;

    const provider = createOpenAICompatible({
      name: "custom",
      baseURL,
      apiKey: process.env.EVE_MODEL_API_KEY,
      includeUsage: true,
    });

    const configured = Number(process.env.EVE_MODEL_CONTEXT_WINDOW);
    return {
      model: provider(modelId),
      modelContextWindowTokens:
        Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_CONTEXT_WINDOW,
    };
  }),
});
