// @ts-nocheck
import type { AICompletionInput, AIProvider } from "./types";

type AICompletionInput = {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  provider?: AIProvider;
  model?: string;
};

type ProxyResponse = {
  text?: string;
  data?: unknown;
};

const AI_PROXY_URL = process.env.EXPO_PUBLIC_AI_PROXY_URL;
const DEFAULT_PROVIDER =
  (process.env.EXPO_PUBLIC_AI_PROVIDER as AIProvider | undefined) ?? "openai";

const getProvider = (provider?: AIProvider): AIProvider =>
  provider ?? DEFAULT_PROVIDER;

const getModel = (provider: AIProvider, model?: string) => {
  if (model) return model;
  if (provider === "gemini") {
    return process.env.EXPO_PUBLIC_GEMINI_MODEL ?? "gemini-1.5-flash";
  }
  return process.env.EXPO_PUBLIC_OPENAI_MODEL ?? "gpt-4.1-mini";
};

const assertOk = async (response: Response, provider: string) => {
  if (response.ok) return;

  let detail = response.statusText;
  try {
    const body = await response.json();
    detail = body?.error?.message ?? body?.message ?? detail;
  } catch {
    // Keep the HTTP status text when the error body is not JSON.
  }

  throw new Error(
    `${provider} AI request failed (${response.status}): ${detail}`,
  );
};

const callProxy = async (
  input: AICompletionInput,
  provider: AIProvider,
  model: string,
) => {
  if (!AI_PROXY_URL) return null;

  const response = await fetch(AI_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...input,
      provider,
      model,
    }),
  });

  await assertOk(response, "AI proxy");
  const body = (await response.json()) as ProxyResponse;

  if (typeof body.text === "string") return body.text;
  if (body.data !== undefined) return JSON.stringify(body.data);

  throw new Error("AI proxy returned no text or data field");
};

const callOpenAI = async (input: AICompletionInput, model: string) => {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_OPENAI_API_KEY or EXPO_PUBLIC_AI_PROXY_URL",
    );
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: input.systemPrompt,
      input: input.userPrompt,
      temperature: input.temperature ?? 0.3,
    }),
  });

  await assertOk(response, "OpenAI");
  const body = await response.json();

  if (typeof body.output_text === "string") {
    return body.output_text;
  }

  const text = body.output
    ?.flatMap((item: any) => item.content ?? [])
    ?.map((content: any) => content.text)
    ?.filter((value: unknown): value is string => typeof value === "string")
    ?.join("\n");

  if (text) return text;
  throw new Error("OpenAI response did not include text output");
};

const callGemini = async (input: AICompletionInput, model: string) => {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_GEMINI_API_KEY or EXPO_PUBLIC_AI_PROXY_URL",
    );
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: input.systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: input.userPrompt }],
          },
        ],
        generationConfig: {
          temperature: input.temperature ?? 0.3,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  await assertOk(response, "Gemini");
  const body = await response.json();
  const text = body.candidates?.[0]?.content?.parts
    ?.map((part: any) => part.text)
    ?.filter((value: unknown): value is string => typeof value === "string")
    ?.join("\n");

  if (text) return text;
  throw new Error("Gemini response did not include text output");
};

export const aiProviderClient = {
  async complete(input: AICompletionInput) {
    const provider = getProvider(input.provider);
    const model = getModel(provider, input.model);
    const proxyText = await callProxy(input, provider, model);

    if (proxyText) return proxyText;
    if (provider === "gemini") return callGemini(input, model);

    return callOpenAI(input, model);
  },
};
