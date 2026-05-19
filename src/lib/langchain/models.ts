/**
 * LangChain Model Configuration for ScholarAId
 *
 * Supports multiple LLM providers with the following hierarchy:
 * 1. gemini-3-flash-preview (Highest Priority)
 * 2. gemini-2.5-flash-preview-05-20
 * 3. llama-3.3-70b-versatile (Groq)
 * 4. z-ai-web-dev-sdk (Last Fallback)
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { BaseChatModel, BaseChatModelParams } from "@langchain/core/language_models/chat_models";
import { BaseMessage, AIMessage, ChatResult } from "@langchain/core/messages";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { generateChatResponse } from "z-ai-web-dev-sdk";

// ─── Z-AI SDK LangChain Wrapper ──────────────────────────────────────────────

/**
 * Custom LangChain wrapper for z-ai-web-dev-sdk to allow it to be used
 * as a standard BaseChatModel in our chains and fallback logic.
 */
export class ZAIChatModel extends BaseChatModel {
  _llmType() {
    return "z-ai-web-dev-sdk";
  }

  constructor(fields?: BaseChatModelParams) {
    super(fields ?? {});
  }

  async _generate(
    messages: BaseMessage[],
    options: this["ParsedArgs"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    const lastMessage = messages[messages.length - 1];
    const text = typeof lastMessage.content === "string" 
      ? lastMessage.content 
      : JSON.stringify(lastMessage.content);

    const response = await generateChatResponse({
      message: text,
    });

    return {
      generations: [
        {
          text: response,
          message: new AIMessage(response),
        },
      ],
    };
  }
}

// ─── Model Provider Types ────────────────────────────────────────────────────

export type ModelProvider = "gemini-3" | "gemini-2.5" | "groq" | "zai";

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  temperature: number;
  maxTokens?: number;
}

// ─── Default Configurations ──────────────────────────────────────────────────

export const MODEL_CONFIGS: Record<ModelProvider, ModelConfig> = {
  "gemini-3": {
    provider: "gemini-3",
    model: "gemini-3-flash-preview",
    temperature: 0.7,
    maxTokens: 4096,
  },
  "gemini-2.5": {
    provider: "gemini-2.5",
    model: "gemini-2.5-flash-preview-05-20",
    temperature: 0.7,
    maxTokens: 4096,
  },
  "groq": {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    maxTokens: 4096,
  },
  "zai": {
    provider: "zai",
    model: "z-ai-web-dev-sdk-v1",
    temperature: 0.7,
  },
};

// ─── Model Factory ───────────────────────────────────────────────────────────

let cachedModel: BaseChatModel | null = null;
let cachedProvider: ModelProvider | null = null;
let cachedTemp: number | null = null;

/**
 * Get the best available chat model based on the hierarchy.
 */
export function getChatModel(
  preferredProvider?: ModelProvider,
  config?: Partial<ModelConfig>
): BaseChatModel {
  const provider = preferredProvider ?? getBestAvailableProvider();
  const temp = config?.temperature ?? 0.7;

  // Return cached model if same provider and temperature
  if (cachedModel && cachedProvider === provider && cachedTemp === temp && !config?.maxTokens) {
    return cachedModel;
  }

  const modelConfig = { ...MODEL_CONFIGS[provider], ...config };

  let model: BaseChatModel;

  switch (provider) {
    case "gemini-3":
    case "gemini-2.5": {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) return getChatModel(getNextProvider(provider), config);
      
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
      if (!apiKey) return getChatModel(getNextProvider(provider), config);

      model = new ChatGroq({
        apiKey,
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
      });
      break;
    }

    case "zai": {
      model = new ZAIChatModel();
      break;
    }

    default: {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  // Cache the model instance
  cachedModel = model;
  cachedProvider = provider;
  cachedTemp = temp;

  console.log(`[LangChain] Using model: ${provider} (${modelConfig.model}) @ temp: ${modelConfig.temperature}`);
  return model;
}

/**
 * Get a model optimized for deterministic output (scholarship review/analysis).
 */
export function getStructuredModel(
  preferredProvider?: ModelProvider
): BaseChatModel {
  return getChatModel(preferredProvider, {
    temperature: 0.2,
    maxTokens: 4096,
  });
}

/**
 * Get a model optimized for creative generation (essays or suggestions).
 */
export function getCreativeModel(
  preferredProvider?: ModelProvider
): BaseChatModel {
  return getChatModel(preferredProvider, {
    temperature: 0.9,
    maxTokens: 4096,
  });
}

/**
 * Determine the best available provider based on the hierarchy and API keys.
 */
function getBestAvailableProvider(): ModelProvider {
  if (process.env.GOOGLE_API_KEY) return "gemini-3";
  if (process.env.GROQ_API_KEY) return "groq";
  return "zai";
}

/**
 * Get the next provider in the hierarchy if the current one is unavailable.
 */
function getNextProvider(current: ModelProvider): ModelProvider {
  const hierarchy: ModelProvider[] = ["gemini-3", "gemini-2.5", "groq", "zai"];
  const index = hierarchy.indexOf(current);
  if (index === -1 || index === hierarchy.length - 1) return "zai";
  return hierarchy[index + 1];
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
