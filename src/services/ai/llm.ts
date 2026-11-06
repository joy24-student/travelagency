import type { AIProvider, AIResponse, ChatMessage } from "./types";

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "";
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "";
const AI_PROVIDER = (process.env.EXPO_PUBLIC_AI_PROVIDER ??
  "openai") as AIProvider;

const OPENAI_MODEL = "gpt-4o-mini";
const GEMINI_MODEL = "gemini-1.5-flash";

export interface ChatOptions {
  temperature?: number;
  signal?: AbortSignal;
}

async function callOpenAI(
  messages: ChatMessage[],
  options?: ChatOptions,
): Promise<AIResponse> {
  const temperature = options?.temperature ?? 0.7;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: OPENAI_MODEL, messages, temperature }),
    signal: options?.signal,
  });

  if (!res.ok)
    throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);

  const json = await res.json();
  const raw: string = json.choices?.[0]?.message?.content ?? "";
  return {
    data: raw,
    raw,
    provider: "openai",
    tokensUsed: json.usage?.total_tokens,
  };
}

async function callGemini(
  messages: ChatMessage[],
  options?: ChatOptions,
): Promise<AIResponse> {
  const temperature = options?.temperature ?? 0.7;
  // Convert ChatMessage[] → Gemini contents format
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find((m) => m.role === "system")?.content;

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature, maxOutputTokens: 2048 },
  };
  if (systemInstruction)
    body.systemInstruction = { parts: [{ text: systemInstruction }] };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: options?.signal,
  });

  if (!res.ok)
    throw new Error(`Gemini error: ${res.status} ${await res.text()}`);

  const json = await res.json();
  const raw: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { data: raw, raw, provider: "gemini" };
}

export async function chat(
  messages: ChatMessage[],
  optionsOrTemp?: number | ChatOptions,
): Promise<AIResponse> {
  const options: ChatOptions =
    typeof optionsOrTemp === "number"
      ? { temperature: optionsOrTemp }
      : optionsOrTemp ?? { temperature: 0.7 };

  return AI_PROVIDER === "gemini"
    ? callGemini(messages, options)
    : callOpenAI(messages, options);
}

/**
 * Defensively parse JSON from an LLM response:
 * 1. Strips all markdown code fences (```json ... ``` or ``` ... ```)
 * 2. Extracts balanced JSON object {...} or array [...] even if surrounded by conversational text.
 */
export function parseJSON<T>(raw: string): T {
  if (!raw || typeof raw !== "string") {
    throw new Error("Cannot parse empty or non-string LLM response");
  }

  // 1. Strip markdown fences
  let cleaned = raw
    .replace(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/g, "$1")
    .trim();

  // 2. If conversational text prefixes/suffixes the JSON, find bracket boundaries
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = cleaned.lastIndexOf("}");
    if (lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
  } else if (firstBracket !== -1) {
    const lastBracket = cleaned.lastIndexOf("]");
    if (lastBracket !== -1 && lastBracket > firstBracket) {
      cleaned = cleaned.substring(firstBracket, lastBracket + 1);
    }
  }

  return JSON.parse(cleaned) as T;
}
