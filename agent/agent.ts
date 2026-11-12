import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { defineAgent } from "eve";
import { defineDynamic } from "eve/models";
import { contextWindowFor, DEFAULT_FREE_MODEL_ID, findFreeModel } from "@/lib/free-models";

/** Used when no OpenAI-compatible endpoint is configured. */
const GATEWAY_MODEL = "zai/glm-4.7-flashx";

export default defineAgent({
  model: defineDynamic((ctx) => {
    const baseURL = process.env.EVE_MODEL_BASE_URL;
    if (!baseURL) return GATEWAY_MODEL;

    // The browser picks a model per turn; env is the fallback for non-browser callers.
    const chosen = ctx.session.auth.current?.attributes.model;
    const modelId =
      typeof chosen === "string" && findFreeModel(chosen)
        ? chosen
        : (process.env.EVE_MODEL_ID ?? DEFAULT_FREE_MODEL_ID);
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
        Number.isFinite(configured) && configured > 0 ? configured : contextWindowFor(modelId),
    };
  }),
});
