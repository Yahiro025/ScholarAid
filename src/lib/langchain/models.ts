/**
 * LangChain Model Configuration for ScholarAId
 *
 * Supports multiple free LLM providers:
 * 1. Google Gemini 2.0 Flash (FREE - best quality, requires API key)
 * 2. Google Gemini 2.5 Flash Preview (FREE - newest, requires API key)
 * 3. Groq Llama 3.3 70B (FREE - fastest, requires API key)
 * 4. z-ai-web-dev-sdk (always available, no API key needed)
 *
 * Set these in your .env file:
 * - GOOGLE_API_KEY=your_google_api_key  (Get free at https://aistudio.google.com/apikey)
 * - GROQ_API_KEY=your_groq_api_key      (Get free at https://console.groq.com/keys)
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

// ─── Model Provider Types ────────────────────────────────────────────────────

export type ModelProvider = "gemini" | "gemini-flash" | "groq";

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  temperature: number;
  maxTokens?: number;
}

// ─── Default Configurations ──────────────────────────────────────────────────

export const MODEL_CONFIGS: Record<ModelProvider, ModelConfig> = {
  gemini: {
    provider: "gemini",
    model: "gemini-2.0-flash",
    temperature: 0.7,
    maxTokens: 4096,
  },
  "gemini-flash": {
    provider: "gemini-flash",
    model: "gemini-2.0-flash",
    temperature: 0.7,
    maxTokens: 4096,
  },
  groq: {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    maxTokens: 4096,
  },
};

// ─── Model Factory ───────────────────────────────────────────────────────────

let cachedModel: BaseChatModel | null = null;
let cachedProvider: ModelProvider | null = null;

/**
 * Get the best available chat model.
 * Priority: Gemini > Groq
 */
export function getChatModel(
  preferredProvider?: ModelProvider,
  config?: Partial<ModelConfig>
): BaseChatModel {
  const provider = preferredProvider ?? getBestAvailableProvider();

  // Return cached model if same provider
  if (cachedModel && cachedProvider === provider && !config) {
    return cachedModel;
  }

  const modelConfig = { ...MODEL_CONFIGS[provider], ...config };

  let model: BaseChatModel;

  switch (provider) {
    case "gemini":
    case "gemini-flash": {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        if (process.env.GROQ_API_KEY) {
            return getChatModel("groq", config);
        }
        throw new Error("Neither GOOGLE_API_KEY nor GROQ_API_KEY is set.");
      }
      model = new ChatGoogleGenerativeAI({
        apiKey,
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxTokens,
      });
      break;
    }

    case "groq": {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        if (process.env.GOOGLE_API_KEY) {
            return getChatModel("gemini", config);
        }
        throw new Error("Neither GOOGLE_API_KEY nor GROQ_API_KEY is set.");
      }
      model = new ChatGroq({
        apiKey,
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
      });
      break;
    }

    default: {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  // Cache the model instance
  cachedModel = model;
  cachedProvider = provider;

  console.log(`[LangChain] Using model: ${provider} (${modelConfig.model})`);
  return model;
}

/**
 * Get a model optimized for structured JSON output (lower temperature, more deterministic).
 */
export function getStructuredModel(
  preferredProvider?: ModelProvider
): BaseChatModel {
  return getChatModel(preferredProvider, {
    temperature: 0.1,
    maxTokens: 4096,
  });
}

/**
 * Get a model optimized for creative generation (higher temperature).
 */
export function getCreativeModel(
  preferredProvider?: ModelProvider
): BaseChatModel {
  return getChatModel(preferredProvider, {
    temperature: 0.8,
    maxTokens: 4096,
  });
}

/**
 * Determine the best available provider based on available API keys.
 */
function getBestAvailableProvider(): ModelProvider {
  if (process.env.GOOGLE_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  return "gemini"; // Default
}

/**
 * Get info about the currently active model for display purposes.
 */
export function getActiveModelInfo(): {
  provider: ModelProvider;
  model: string;
  isFree: boolean;
} {
  const provider = getBestAvailableProvider();
  const config = MODEL_CONFIGS[provider];
  return {
    provider,
    model: config.model,
    isFree: true,
  };
}

