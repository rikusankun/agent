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

/** Unknown IDs still work; they just use the conservative default window. */
export function contextWindowFor(id: string): number {
  return findFreeModel(id)?.contextTokens ?? DEFAULT_CONTEXT_WINDOW;
}
