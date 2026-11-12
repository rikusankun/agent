import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { defineAgent } from "eve";
import { defineDynamic } from "eve/models";
import {
  contextWindowFor,
  DEFAULT_FREE_MODEL_ID,
  endpointFor,
  findModel,
} from "@/lib/free-models";

/** Used when no OpenAI-compatible endpoint is configured. */
const GATEWAY_MODEL = "zai/glm-4.7-flashx";

export default defineAgent({
  model: defineDynamic((ctx) => {
    try {
      // 获取前端传来的模型，如果没有则用环境变量或默认值
      const chosen = ctx.session.auth.current?.attributes.model;
      const modelId =
        typeof chosen === "string" && findModel(chosen)
          ? chosen
          : (process.env.EVE_MODEL_ID ?? DEFAULT_FREE_MODEL_ID);

      // 本地 Ollama 与 DSH 网关使用不同端点
      const endpoint = endpointFor(modelId);
      if (!endpoint) return GATEWAY_MODEL;

      // 实例化兼容网关
      const provider = createOpenAICompatible({
        name: endpoint.name,
        baseURL: endpoint.baseURL,
        apiKey: endpoint.apiKey,
        includeUsage: true,
      });

      // 返回模型实例（上下文窗口按模型来源分别配置）
      return {
        model: provider(modelId),
        modelContextWindowTokens: contextWindowFor(modelId),
      };
    } catch (error) {
      // 【关键救命代码】如果网关连不上或报错，打印日志，并强制退回默认网关
      console.error("❌ [Agent] 自定义模型加载失败，已自动回退:", error);
      return GATEWAY_MODEL;
    }
  }),
});
