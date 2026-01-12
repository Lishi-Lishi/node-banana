import { WorkflowSaveConfig, WorkflowCostData, ProviderSettings } from "@/types";

// Storage keys
export const STORAGE_KEY = "node-banana-workflow-configs";
export const COST_DATA_STORAGE_KEY = "node-banana-workflow-costs";
export const GENERATE_IMAGE_DEFAULTS_KEY = "node-banana-nanoBanana-defaults";
export const PROVIDER_SETTINGS_KEY = "node-banana-provider-settings";

// GenerateImage defaults interface
export interface GenerateImageDefaults {
  aspectRatio: string;
  resolution: string;
  model: string;
  useGoogleSearch: boolean;
}

const DEFAULT_GENERATE_IMAGE_SETTINGS: GenerateImageDefaults = {
  aspectRatio: "1:1",
  resolution: "1K",
  model: "nano-banana-pro",
  useGoogleSearch: false,
};

// Default provider settings
export const defaultProviderSettings: ProviderSettings = {
  providers: {
    gemini: { id: "gemini", name: "Google Gemini", enabled: true, apiKey: null, apiKeyEnvVar: "GEMINI_API_KEY" },
    openai: { id: "openai", name: "OpenAI", enabled: true, apiKey: null, apiKeyEnvVar: "OPENAI_API_KEY" },
    replicate: { id: "replicate", name: "Replicate", enabled: false, apiKey: null, apiKeyEnvVar: "REPLICATE_API_KEY" },
    fal: { id: "fal", name: "fal.ai", enabled: false, apiKey: null, apiKeyEnvVar: "FAL_API_KEY" },
  }
};

// Workflow configs helpers
export const loadSaveConfigs = (): Record<string, WorkflowSaveConfig> => {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
};

export const saveSaveConfig = (config: WorkflowSaveConfig): void => {
  if (typeof window === "undefined") return;
  const configs = loadSaveConfigs();
  configs[config.workflowId] = config;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
};

// Cost data helpers
export const loadWorkflowCostData = (workflowId: string): WorkflowCostData | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(COST_DATA_STORAGE_KEY);
  if (!stored) return null;
  try {
    const allCosts: Record<string, WorkflowCostData> = JSON.parse(stored);
    return allCosts[workflowId] || null;
  } catch {
    return null;
  }
};

export const saveWorkflowCostData = (data: WorkflowCostData): void => {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem(COST_DATA_STORAGE_KEY);
  let allCosts: Record<string, WorkflowCostData> = {};
  if (stored) {
    try {
      allCosts = JSON.parse(stored);
    } catch {
      allCosts = {};
    }
  }
  allCosts[data.workflowId] = data;
  localStorage.setItem(COST_DATA_STORAGE_KEY, JSON.stringify(allCosts));
};

// GenerateImage defaults helpers
export const loadGenerateImageDefaults = (): GenerateImageDefaults => {
  if (typeof window === "undefined") {
    return DEFAULT_GENERATE_IMAGE_SETTINGS;
  }
  const stored = localStorage.getItem(GENERATE_IMAGE_DEFAULTS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_GENERATE_IMAGE_SETTINGS;
    }
  }
  return DEFAULT_GENERATE_IMAGE_SETTINGS;
};

export const saveGenerateImageDefaults = (settings: Partial<GenerateImageDefaults>): void => {
  if (typeof window === "undefined") return;
  const current = loadGenerateImageDefaults();
  const updated = { ...current, ...settings };
  localStorage.setItem(GENERATE_IMAGE_DEFAULTS_KEY, JSON.stringify(updated));
};

// Provider settings helpers
export const getProviderSettings = (): ProviderSettings => {
  if (typeof window === "undefined") return defaultProviderSettings;
  const stored = localStorage.getItem(PROVIDER_SETTINGS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as ProviderSettings;
      // Merge with defaults to handle new providers added after user saved settings
      return {
        providers: {
          ...defaultProviderSettings.providers,
          ...parsed.providers,
        }
      };
    } catch {
      return defaultProviderSettings;
    }
  }
  return defaultProviderSettings;
};

export const saveProviderSettings = (settings: ProviderSettings): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROVIDER_SETTINGS_KEY, JSON.stringify(settings));
};

// Workflow ID generator
export const generateWorkflowId = (): string =>
  `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * @deprecated Backward-compatible alias. Use `GenerateImageDefaults` instead.
 */
export type NanoBananaDefaults = GenerateImageDefaults;

/**
 * @deprecated Backward-compatible alias. Use `loadGenerateImageDefaults` instead.
 */
export const loadNanoBananaDefaults = loadGenerateImageDefaults;

/**
 * @deprecated Backward-compatible alias. Use `saveGenerateImageDefaults` instead.
 */
export const saveNanoBananaDefaults = saveGenerateImageDefaults;
