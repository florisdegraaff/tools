export const GEMINI_MODELS = [
  { value: "gemini-3-flash-preview", label: "General purpose" },
  { value: "gemini-3.1-pro-preview", label: "High reasoning" },
] as const;

export type GeminiModel = (typeof GEMINI_MODELS)[number]["value"];

export const DEFAULT_GEMINI_MODEL: GeminiModel = GEMINI_MODELS[0].value;
