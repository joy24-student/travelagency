import type {
  AIProviderId,
  ILLMProvider,
  LLMCompletionOptions,
  LLMResponse,
} from "./types";

// ─── Utility Helpers ──────────────────────────────────────────────────────────

const assertResponseOk = async (response: Response, providerName: string) => {
  if (response.ok) return;

  let detail = response.statusText;
  try {
    const body = await response.json();
    detail = body?.error?.message ?? body?.message ?? JSON.stringify(body);
  } catch {
    // Keep HTTP status text
  }

  throw new Error(`${providerName} AI Error (${response.status}): ${detail}`);
};

// ─── Google Gemini Provider (Default High-Speed / Cost-Effective) ─────────────

export class GeminiProvider implements ILLMProvider {
  readonly id: AIProviderId = "gemini";
  readonly defaultModel: string;

  constructor(model?: string) {
    this.defaultModel =
      model ??
      process.env.EXPO_PUBLIC_GEMINI_MODEL ??
      "gemini-2.0-flash";
  }

  isAvailable(): boolean {
    const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    return Boolean(key && key.trim().length > 0);
  }

  async complete(options: LLMCompletionOptions): Promise<LLMResponse> {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing EXPO_PUBLIC_GEMINI_API_KEY");
    }

    const model = this.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body: Record<string, unknown> = {
      contents: [
        {
          role: "user",
          parts: [{ text: options.userPrompt }],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 3500,
        responseMimeType:
          options.responseMimeType === "application/json"
            ? "application/json"
            : "text/plain",
      },
    };

    if (options.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: options.systemPrompt }],
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: options.abortSignal,
    });

    await assertResponseOk(response, "Gemini");
    const json = await response.json();

    const text =
      json.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text)
        ?.filter((val: unknown): val is string => typeof val === "string")
        ?.join("\n") ?? "";

    if (!text) {
      throw new Error("Gemini returned empty candidate text");
    }

    return {
      text,
      provider: "gemini",
      model,
      tokensUsed: json.usageMetadata?.totalTokenCount,
    };
  }
}

// ─── OpenAI Provider ──────────────────────────────────────────────────────────

export class OpenAIProvider implements ILLMProvider {
  readonly id: AIProviderId = "openai";
  readonly defaultModel: string;

  constructor(model?: string) {
    this.defaultModel =
      model ??
      process.env.EXPO_PUBLIC_OPENAI_MODEL ??
      "gpt-4o-mini";
  }

  isAvailable(): boolean {
    const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    return Boolean(key && key.trim().length > 0);
  }

  async complete(options: LLMCompletionOptions): Promise<LLMResponse> {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing EXPO_PUBLIC_OPENAI_API_KEY");
    }

    const model = this.defaultModel;
    const messages = [];

    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: options.userPrompt });

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 3500,
    };

    if (options.responseMimeType === "application/json") {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.abortSignal,
    });

    await assertResponseOk(response, "OpenAI");
    const json = await response.json();

    const text = json.choices?.[0]?.message?.content ?? "";
    if (!text) {
      throw new Error("OpenAI returned no text output");
    }

    return {
      text,
      provider: "openai",
      model,
      tokensUsed: json.usage?.total_tokens,
    };
  }
}

// ─── Anthropic Claude Provider ────────────────────────────────────────────────

export class ClaudeProvider implements ILLMProvider {
  readonly id: AIProviderId = "claude";
  readonly defaultModel: string;

  constructor(model?: string) {
    this.defaultModel =
      model ??
      process.env.EXPO_PUBLIC_CLAUDE_MODEL ??
      "claude-3-5-haiku-20241022";
  }

  isAvailable(): boolean {
    const key =
      process.env.EXPO_PUBLIC_CLAUDE_API_KEY ??
      process.env.ANTHROPIC_API_KEY;
    return Boolean(key && key.trim().length > 0);
  }

  async complete(options: LLMCompletionOptions): Promise<LLMResponse> {
    const apiKey =
      process.env.EXPO_PUBLIC_CLAUDE_API_KEY ??
      process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Missing Claude / Anthropic API Key");
    }

    const model = this.defaultModel;
    const body: Record<string, unknown> = {
      model,
      max_tokens: options.maxTokens ?? 3500,
      temperature: options.temperature ?? 0.3,
      messages: [{ role: "user", content: options.userPrompt }],
    };

    if (options.systemPrompt) {
      body.system = options.systemPrompt;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: options.abortSignal,
    });

    await assertResponseOk(response, "Claude");
    const json = await response.json();

    const text =
      json.content
        ?.filter((c: { type?: string; text?: string }) => c.type === "text")
        ?.map((c: { text?: string }) => c.text)
        ?.join("\n") ?? "";

    if (!text) {
      throw new Error("Claude returned no text output");
    }

    return {
      text,
      provider: "claude",
      model,
      tokensUsed: (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0),
    };
  }
}

// ─── Provider Registry & Strategy Orchestrator ────────────────────────────────

export class LLMProviderRegistry {
  private providers: Map<AIProviderId, ILLMProvider> = new Map();
  private defaultPreference: AIProviderId[] = ["gemini", "openai", "claude"];

  constructor() {
    this.register(new GeminiProvider());
    this.register(new OpenAIProvider());
    this.register(new ClaudeProvider());
  }

  register(provider: ILLMProvider) {
    this.providers.set(provider.id, provider);
  }

  get(id: AIProviderId): ILLMProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Resolves the best available provider.
   * Priority: Environment variable override -> Gemini (Flash) -> OpenAI -> Claude
   */
  resolveProvider(requested?: AIProviderId): ILLMProvider {
    if (requested && this.providers.has(requested)) {
      const p = this.providers.get(requested)!;
      if (p.isAvailable()) return p;
    }

    const envProvider = process.env.EXPO_PUBLIC_AI_PROVIDER as AIProviderId | undefined;
    if (envProvider && this.providers.has(envProvider)) {
      const p = this.providers.get(envProvider)!;
      if (p.isAvailable()) return p;
    }

    // Default preference loop (Gemini first for speed and cost-effectiveness)
    for (const id of this.defaultPreference) {
      const p = this.providers.get(id);
      if (p && p.isAvailable()) return p;
    }

    // Default to Gemini instance even if key is empty (will trigger clean error/fallback)
    return this.providers.get("gemini")!;
  }

  /**
   * Execute with automatic failover to next provider if preferred provider is rate-limited or fails
   */
  async executeWithFallback(
    options: LLMCompletionOptions,
    preferred?: AIProviderId
  ): Promise<LLMResponse> {
    const proxyUrl = process.env.EXPO_PUBLIC_AI_PROXY_URL;
    if (proxyUrl) {
      try {
        const proxyRes = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemPrompt: options.systemPrompt,
            userPrompt: options.userPrompt,
            temperature: options.temperature,
            provider: preferred ?? "gemini",
          }),
          signal: options.abortSignal,
        });
        if (proxyRes.ok) {
          const body = await proxyRes.json();
          const text = typeof body.text === "string" ? body.text : JSON.stringify(body.data);
          if (text) {
            return {
              text,
              provider: preferred ?? "gemini",
              model: "proxy",
            };
          }
        }
      } catch {
        // Fall back to direct SDK calls
      }
    }

    // Determine order
    const order: AIProviderId[] = [];
    if (preferred) order.push(preferred);
    for (const id of this.defaultPreference) {
      if (!order.includes(id)) order.push(id);
    }

    let lastError: Error | null = null;
    for (const id of order) {
      const provider = this.providers.get(id);
      if (!provider || !provider.isAvailable()) continue;

      try {
        return await provider.complete(options);
      } catch (err: any) {
        lastError = err;
        // If aborted by user / timeout, do not try other providers
        if (err.name === "AbortError") {
          throw err;
        }
        // Continue to fallback provider
      }
    }

    throw lastError ?? new Error("No configured LLM providers are available or reachable");
  }
}

export const llmProviderRegistry = new LLMProviderRegistry();

// ─── Legacy Client Compatibility ──────────────────────────────────────────────

export const aiProviderClient = {
  async complete(input: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    provider?: AIProviderId;
    model?: string;
  }) {
    const res = await llmProviderRegistry.executeWithFallback(
      {
        systemPrompt: input.systemPrompt,
        userPrompt: input.userPrompt,
        temperature: input.temperature,
      },
      input.provider
    );
    return res.text;
  },
};
