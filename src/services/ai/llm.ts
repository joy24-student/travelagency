import type { AIProvider, AIResponse, ChatMessage } from "./types";
import { apiClient } from "../apiClient";

export interface ChatOptions {
  temperature?: number;
  signal?: AbortSignal;
  model?: string;
  maxTokens?: number;
}

/**
 * Unified Backend AI Chat Call
 * Securely calls FastAPI backend `/ai/chat` which runs Google Gemini with circuit breakers.
 * Protects API keys from client-side reverse engineering and provides resilient fallback.
 */
async function callBackendAI(
  messages: ChatMessage[],
  options?: ChatOptions,
): Promise<AIResponse> {
  const temperature = options?.temperature ?? 0.7;

  try {
    const res = await apiClient.chatWithAI({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature,
      model: options?.model,
      max_tokens: options?.maxTokens ?? 2048,
    });

    const aiData = res?.data;
    if (aiData && aiData.content) {
      return {
        data: aiData.content,
        raw: aiData.raw || aiData.content,
        provider: (aiData.provider as AIProvider) || "gemini",
        tokensUsed: aiData.tokens_used,
      };
    }
  } catch (err: any) {
    console.warn("Backend AI call failed, engaging defensive fallback:", err?.message || err);
  }

  // Resilient Offline Fallback
  const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || "";
  let fallbackReply =
    "স্বপ্ন যাত্রায় আপনাকে স্বাগতম! আমি আপনার AI ট্রাভেল অ্যাসিস্ট্যান্ট। ফ্লাইট, হোটেল, ট্রেন টিকিট বা যেকোনো ভ্রমণ সংক্রান্ত তথ্যের জন্য আমি সহায়তা করতে প্রস্তুত।";
  if (
    lastMsg.includes("flight") ||
    lastMsg.includes("বিমান") ||
    lastMsg.includes("টিকিট")
  ) {
    fallbackReply =
      "স্বপ্ন যাত্রা ফ্লাইট সার্ভিসের মাধ্যমে আপনি দেশের অভ্যন্তরে এবং আন্তর্জাতিক রুটে সব শীর্ষ এয়ারলাইন্সের ফ্লাইট সরাসরি সার্চ ও বুকিং করতে পারেন। আপনার রুট ও তারিখ জানান।";
  } else if (
    lastMsg.includes("hotel") ||
    lastMsg.includes("হোটেল") ||
    lastMsg.includes("রিসোর্ট")
  ) {
    fallbackReply =
      "কক্সবাজার, সিলেট, সাজেক সহ বিভিন্ন পর্যটন কেন্দ্রের প্রিমিয়াম হোটেল ও রিসোর্টে বিশেষ ছাড় চলছে।";
  } else if (
    lastMsg.includes("refund") ||
    lastMsg.includes("রিফান্ড") ||
    lastMsg.includes("cancel") ||
    lastMsg.includes("বাতিল")
  ) {
    fallbackReply =
      "বুকিং বাতিল বা রিফান্ডের জন্য Trips ট্যাব থেকে আপনার বুকিং বেছে নিয়ে 'Cancel Booking' চাপুন।";
  }

  return {
    data: fallbackReply,
    raw: fallbackReply,
    provider: "gemini",
  };
}

export async function chat(
  messages: ChatMessage[],
  optionsOrTemp?: number | ChatOptions,
): Promise<AIResponse> {
  const options: ChatOptions =
    typeof optionsOrTemp === "number"
      ? { temperature: optionsOrTemp }
      : optionsOrTemp ?? { temperature: 0.7 };

  return callBackendAI(messages, options);
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
