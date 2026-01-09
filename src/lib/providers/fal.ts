/**
 * fal.ai Provider Implementation
 *
 * Implements ProviderInterface for fal.ai's AI model marketplace.
 * Provides model discovery via fal.ai's REST API and self-registers
 * in the provider registry when imported.
 *
 * Usage:
 *   import "@/lib/providers/fal"; // Just importing registers the provider
 *
 *   // Or get it from registry:
 *   import { getProvider } from "@/lib/providers";
 *   const fal = getProvider("fal");
 *
 * Note: fal.ai works without an API key but with rate limits.
 * Providing a key enables higher rate limits.
 */

import {
  ProviderInterface,
  ProviderModel,
  ModelCapability,
  GenerationInput,
  GenerationOutput,
  registerProvider,
} from "@/lib/providers";

const FAL_API_BASE = "https://api.fal.ai/v1";
const PROVIDER_SETTINGS_KEY = "node-banana-provider-settings";

/**
 * Categories we care about for image/video generation
 */
const RELEVANT_CATEGORIES = [
  "text-to-image",
  "image-to-image",
  "text-to-video",
  "image-to-video",
];

/**
 * Response schema from fal.ai models endpoint
 */
interface FalModelsResponse {
  models: FalModel[];
  next_cursor: string | null;
  has_more: boolean;
}

/**
 * Model schema from fal.ai API
 */
interface FalModel {
  endpoint_id: string;
  metadata: {
    display_name: string;
    category: string;
    description: string;
    status: "active" | "deprecated";
    tags: string[];
    updated_at: string;
    is_favorited: boolean | null;
    thumbnail_url: string;
    model_url: string;
    date: string;
    highlighted: boolean;
    pinned: boolean;
    thumbnail_animated_url?: string;
    github_url?: string;
    license_type?: "commercial" | "research" | "private";
  };
  openapi?: Record<string, unknown>;
}

/**
 * Get API key from localStorage (client-side only)
 * Returns null when running on server or if not configured
 */
function getApiKeyFromStorage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const settingsJson = localStorage.getItem(PROVIDER_SETTINGS_KEY);
    if (!settingsJson) return null;

    const settings = JSON.parse(settingsJson);
    return settings?.providers?.fal?.apiKey ?? null;
  } catch {
    return null;
  }
}

/**
 * Map fal.ai category to ModelCapability
 * Returns the capability if it's one we support, null otherwise
 */
function mapCategoryToCapability(category: string): ModelCapability | null {
  if (RELEVANT_CATEGORIES.includes(category)) {
    return category as ModelCapability;
  }
  return null;
}

/**
 * Check if a model has a relevant category
 */
function isRelevantModel(model: FalModel): boolean {
  return RELEVANT_CATEGORIES.includes(model.metadata.category);
}

/**
 * Map fal.ai model to our normalized ProviderModel format
 */
function mapToProviderModel(model: FalModel): ProviderModel {
  const capability = mapCategoryToCapability(model.metadata.category);

  return {
    id: model.endpoint_id,
    name: model.metadata.display_name,
    description: model.metadata.description,
    provider: "fal",
    capabilities: capability ? [capability] : [],
    coverImage: model.metadata.thumbnail_url,
  };
}

/**
 * Build authorization headers for fal.ai API
 */
function buildHeaders(apiKey: string | null): HeadersInit {
  const headers: HeadersInit = {};
  if (apiKey) {
    headers["Authorization"] = `Key ${apiKey}`;
  }
  return headers;
}

/**
 * Build category filter query string for relevant categories
 */
function buildCategoryFilter(): string {
  return RELEVANT_CATEGORIES.map((cat) => `category=${encodeURIComponent(cat)}`).join("&");
}

/**
 * fal.ai provider implementation
 */
const falProvider: ProviderInterface = {
  id: "fal",
  name: "fal.ai",

  async listModels(): Promise<ProviderModel[]> {
    const apiKey = getApiKeyFromStorage();

    try {
      // Fetch models with category filter for relevant types
      const url = `${FAL_API_BASE}/models?${buildCategoryFilter()}&status=active`;
      const response = await fetch(url, {
        headers: buildHeaders(apiKey),
      });

      if (!response.ok) {
        throw new Error(`fal.ai API error: ${response.status}`);
      }

      const data: FalModelsResponse = await response.json();

      // Filter to relevant categories and map to ProviderModel
      return data.models.filter(isRelevantModel).map(mapToProviderModel);
    } catch (error) {
      console.error("[fal.ai] Failed to list models:", error);
      return [];
    }
  },

  async searchModels(query: string): Promise<ProviderModel[]> {
    const apiKey = getApiKeyFromStorage();

    try {
      // Search with query and category filter
      const url = `${FAL_API_BASE}/models?q=${encodeURIComponent(query)}&${buildCategoryFilter()}&status=active`;
      const response = await fetch(url, {
        headers: buildHeaders(apiKey),
      });

      if (!response.ok) {
        throw new Error(`fal.ai API error: ${response.status}`);
      }

      const data: FalModelsResponse = await response.json();

      // Filter to relevant categories and map to ProviderModel
      return data.models.filter(isRelevantModel).map(mapToProviderModel);
    } catch (error) {
      console.error("[fal.ai] Failed to search models:", error);
      return [];
    }
  },

  async getModel(modelId: string): Promise<ProviderModel | null> {
    const apiKey = getApiKeyFromStorage();

    try {
      // Fetch specific model by endpoint_id
      const url = `${FAL_API_BASE}/models?endpoint_id=${encodeURIComponent(modelId)}`;
      const response = await fetch(url, {
        headers: buildHeaders(apiKey),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`fal.ai API error: ${response.status}`);
      }

      const data: FalModelsResponse = await response.json();

      if (data.models.length === 0) {
        return null;
      }

      const model = data.models[0];

      // Check if it's a relevant model type
      if (!isRelevantModel(model)) {
        console.warn(`[fal.ai] Model ${modelId} is not an image/video model`);
        return null;
      }

      return mapToProviderModel(model);
    } catch (error) {
      console.error("[fal.ai] Failed to get model:", error);
      return null;
    }
  },

  async generate(_input: GenerationInput): Promise<GenerationOutput> {
    // Generation will be implemented in Phase 3
    return {
      success: false,
      error: "Not implemented - generation support coming in Phase 3",
    };
  },

  isConfigured(): boolean {
    // fal.ai works without API key (with rate limits)
    // Return true if key exists, but note that provider is usable without it
    return !!getApiKeyFromStorage();
  },

  getApiKey(): string | null {
    return getApiKeyFromStorage();
  },
};

// Self-register when module is imported
registerProvider(falProvider);

export default falProvider;
