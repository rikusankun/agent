/**
 * dsh-our-free-model gateway catalogue.
 * IDs are the `id` field returned by /v1/models, not the display name.
 * The plugin can change its roster; run `curl <endpoint>/v1/models` to refresh.
 */

export interface FreeModel {
  readonly id: string;
  readonly label: string;
  readonly contextTokens: number;
  readonly vision: boolean;
  /** Served by a separate local endpoint (Ollama) instead of the DSH gateway. */
  readonly local?: boolean;
}

const K = (n: number) => n * 1024;

export const FREE_MODELS: readonly FreeModel[] = [
  { id: "our-free-model/big-pickle", label: "Big Pickle", contextTokens: K(256), vision: true },
  { id: "our-free-model/flint-40b-free", label: "Flint 40B", contextTokens: K(128), vision: false },
  {
    id: "our-free-model/mimo-v2.6-flash-free",
    label: "MiMo V2.6 Flash",
    contextTokens: K(1024),
    vision: true,
  },
  {
    id: "our-free-model/nemotron-3.5-super-vl-free",
    label: "Nemotron 3.5 Super VL",
    contextTokens: K(1024),
    vision: true,
  },
  {
    id: "our-free-model/nemotron-3.5-lightning-free",
    label: "Nemotron 3.5 Lightning",
    contextTokens: K(125),
    vision: false,
  },
  {
    id: "our-free-model/deepseek-v4.1-flash-free",
    label: "DeepSeek V4.1 Flash",
    contextTokens: K(1024),
    vision: true,
  },
  {
    id: "our-free-model/glm-5.3-flash-free",
    label: "GLM 5.3 Flash",
    contextTokens: K(1024),
    vision: true,
  },
  {
    id: "our-free-model/opencode/glm-5.3-flash-free",
    label: "EAC GLM 5.3 Flash",
    contextTokens: K(1024),
    vision: true,
  },
  {
    id: "our-free-model/opencode/nemotron-3.5-super-vl-free",
    label: "EAC Nemotron 3.5 Super VL",
    contextTokens: K(128),
    vision: false,
  },
  {
    id: "our-free-model/opencode/flint-40b-free",
    label: "EAC Flint 40B",
    contextTokens: K(128),
    vision: false,
  },
  {
    id: "our-free-model/opencode/deepseek-v4.1-flash-free",
    label: "EAC DeepSeek V4.1 Flash",
    contextTokens: K(1024),
    vision: true,
  },
  {
    id: "our-free-model/opencode/nemotron-3.5-lightning-free",
    label: "EAC Nemotron 3.5 Lightning",
    contextTokens: K(128),
    vision: false,
  },
  { id: "our-free-model/kilo-auto/free", label: "Kilo Auto", contextTokens: K(250), vision: false },
  {
    id: "our-free-model/nvidia/nemotron-3.5-super-vl:free",
    label: "Kilo Nemotron 3.5 Super VL",
    contextTokens: K(977),
    vision: true,
  },
  {
    id: "our-free-model/reflection/beam-free",
    label: "Kilo Beam 1.0",
    contextTokens: K(1024),
    vision: false,
  },
  {
    id: "our-free-model/stealth/glyph-cluster",
    label: "Kilo Glyph Cluster",
    contextTokens: K(250),
    vision: false,
  },
  {
    id: "our-free-model/dots-studio/dots-3-note-preview:free",
    label: "Kilo Dots3-Note",
    contextTokens: K(500),
    vision: true,
  },
  {
    id: "our-free-model/nvidia/nemotron-3.5-lightning:free",
    label: "Kilo Nemotron 3.5 Lightning",
    contextTokens: K(977),
    vision: false,
  },
  {
    id: "our-free-model/cohere/north-mini-code:free",
    label: "Kilo North Mini Code",
    contextTokens: K(250),
    vision: false,
  },
  {
    id: "our-free-model/nvidia/nemotron-3-ultra-550b-a55b:free",
    label: "Kilo Nemotron 3 Ultra",
    contextTokens: K(977),
    vision: false,
  },
  {
    id: "our-free-model/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    label: "Kilo Nemotron 3 Nano Omni",
    contextTokens: K(250),
    vision: true,
  },
  {
    id: "our-free-model/openrouter/free",
    label: "Kilo OpenRouter Free Router",
    contextTokens: K(195),
    vision: true,
  },
  {
    id: "our-free-model/combo:recommended-free",
    label: "推荐免费组 (2-model chain)",
    contextTokens: K(1024),
    vision: true,
  },
];

export const DEFAULT_FREE_MODEL_ID = "our-free-model/deepseek-v4.1-flash-free";
export const DEFAULT_CONTEXT_WINDOW = K(128);

export function findFreeModel(id: string): FreeModel | undefined {
  return FREE_MODELS.find((model) => model.id === id);
}

export const DEFAULT_LOCAL_BASE_URL = "http://127.0.0.1:11434/v1";

/**
 * Local OpenAI-compatible models (Ollama), declared as a comma-separated list of
 * IDs from `ollama list`. They use their own endpoint, not the DSH gateway.
 */
export function localModelsFromEnv(): FreeModel[] {
  return (process.env.EVE_LOCAL_MODEL_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => ({
      id,
      label: shortLabel(id),
      contextTokens: K(16),
      vision: false,
      local: true,
    }));
}

function shortLabel(id: string): string {
  const tail = id.split("/").pop() ?? id;
  return tail.length > 44 ? `${tail.slice(0, 41)}…` : tail;
}

export function allModels(): FreeModel[] {
  return [...FREE_MODELS, ...localModelsFromEnv()];
}

/** DSH catalogue plus locally installed models. Server-side only. */
export function findModel(id: string): FreeModel | undefined {
  return findFreeModel(id) ?? localModelsFromEnv().find((model) => model.id === id);
}

/** Each model resolves to its own OpenAI-compatible endpoint. */
export function endpointFor(id: string):
  | { readonly baseURL: string; readonly apiKey: string; readonly name: string }
  | undefined {
  if (findModel(id)?.local) {
    return {
      baseURL: process.env.EVE_LOCAL_MODEL_BASE_URL ?? DEFAULT_LOCAL_BASE_URL,
      apiKey: process.env.EVE_LOCAL_MODEL_API_KEY ?? "ollama",
      name: "ollama",
    };
  }
  const baseURL = process.env.EVE_MODEL_BASE_URL;
  if (!baseURL) return undefined;
  return { baseURL, apiKey: process.env.EVE_MODEL_API_KEY ?? "", name: "custom" };
}

export function contextWindowFor(id: string): number {
  const model = findModel(id);
  const override = Number(
    model?.local
      ? process.env.EVE_LOCAL_MODEL_CONTEXT_WINDOW
      : process.env.EVE_MODEL_CONTEXT_WINDOW,
  );
  if (Number.isFinite(override) && override > 0) return override;
  return model?.contextTokens ?? DEFAULT_CONTEXT_WINDOW;
}
