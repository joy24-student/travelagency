import { defensiveParseTripPlan } from "./defensiveParser";
import { getCuratedFallbackItinerary } from "./fallbacks";
import { buildTripPlannerEnginePrompt } from "./prompts";
import { llmProviderRegistry } from "./providers";
import type {
  AIProviderId,
  AIResponse,
  TripPlan,
  TripPlanRequest,
  TripPlannerEngineRequest,
} from "./types";

const GENERATION_TIMEOUT_MS = 15_000; // 15 seconds strict timeout

export class TripPlannerEngine {
  /**
   * Orchestrates trip plan generation with:
   * 1. 15-second AbortController timeout
   * 2. Automatic retry on JSON parse/validation error
   * 3. Graceful degradation to curated pre-built itineraries on rate-limit / failure
   */
  async planTrip(
    request: TripPlannerEngineRequest,
    preferredProvider?: AIProviderId
  ): Promise<{ plan: TripPlan; isFallback: boolean; providerUsed: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, GENERATION_TIMEOUT_MS);

    try {
      const { systemPrompt, userPrompt } = buildTripPlannerEnginePrompt(request);

      let rawResponseText = "";
      let providerName = preferredProvider || "gemini";
      let parseResult: ReturnType<typeof defensiveParseTripPlan> = {
        success: false,
        data: null,
      };

      // ─── Attempt 1: Primary LLM generation ──────────────────────────────────
      try {
        const response = await llmProviderRegistry.executeWithFallback(
          {
            systemPrompt,
            userPrompt,
            temperature: 0.2,
            abortSignal: controller.signal,
            responseMimeType: "application/json",
          },
          preferredProvider
        );

        rawResponseText = response.text;
        providerName = response.provider;
        parseResult = defensiveParseTripPlan(rawResponseText);
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.warn("[TripPlanner] Generation timed out after 15s. Falling back to curated itinerary.");
          return {
            plan: getCuratedFallbackItinerary(request),
            isFallback: true,
            providerUsed: "curated_fallback",
          };
        }
        console.warn("[TripPlanner] Attempt 1 failed:", err.message);
      }

      // ─── Attempt 2: Automatic retry on JSON parse / validation error ────────
      if (!parseResult.success || !parseResult.data) {
        if (!controller.signal.aborted) {
          try {
            console.warn("[TripPlanner] Attempt 1 yielded invalid JSON. Retrying with corrective prompt...");
            const correctiveUserPrompt = `${userPrompt}\n\nIMPORTANT: Previous response had formatting issues. Output PURE JSON ONLY, strictly following the schema keys.`;

            const retryResponse = await llmProviderRegistry.executeWithFallback(
              {
                systemPrompt,
                userPrompt: correctiveUserPrompt,
                temperature: 0.1,
                abortSignal: controller.signal,
                responseMimeType: "application/json",
              },
              preferredProvider === "gemini" ? "openai" : "gemini"
            );

            rawResponseText = retryResponse.text;
            providerName = retryResponse.provider;
            parseResult = defensiveParseTripPlan(rawResponseText);
          } catch (retryErr: any) {
            console.warn("[TripPlanner] Attempt 2 retry failed:", retryErr.message);
          }
        }
      }

      // ─── Result Check or Graceful Degradation ──────────────────────────────
      if (parseResult.success && parseResult.data) {
        const plan = parseResult.data;
        plan.isFallback = false;
        plan.providerUsed = providerName as AIProviderId;
        plan.generatedAt = new Date().toISOString();

        // Ensure budget object exists with 40/30/20/10 split
        if (!plan.budget) {
          const fallback = getCuratedFallbackItinerary(request);
          plan.budget = fallback.budget;
        }

        return {
          plan,
          isFallback: false,
          providerUsed: providerName,
        };
      }

      // Fallback to curated pre-built itinerary
      console.warn("[TripPlanner] Graceful Degradation activated. Serving curated pre-built itinerary.");
      const fallbackPlan = getCuratedFallbackItinerary(request);
      return {
        plan: fallbackPlan,
        isFallback: true,
        providerUsed: "curated_fallback",
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const tripPlannerEngine = new TripPlannerEngine();

// ─── Legacy tripPlannerService Compatibility ─────────────────────────────────

export const tripPlannerService = {
  /**
   * Backward-compatible plan method adapting legacy requests
   */
  async plan(request: TripPlanRequest): Promise<AIResponse<TripPlan>> {
    const durationDays =
      request.durationDays ||
      (request.startDate && request.endDate
        ? Math.ceil(
            (new Date(request.endDate).getTime() -
              new Date(request.startDate).getTime()) /
              86_400_000
          ) || 3
        : 3);

    const currency = (request.currency === "BDT" ? "BDT" : "USD");
    const totalBudget = request.budget || (currency === "BDT" ? 35000 : 1200);

    const engineRequest: TripPlannerEngineRequest = {
      origin: request.origin || "Dhaka",
      destination: request.destination || "Cox's Bazar",
      durationDays,
      travelStyle: request.travelStyle || "couple",
      budgetLevel: "moderate",
      totalBudget,
      currency,
      travelers: request.travelers || 2,
      interests: request.interests || ["Sightseeing", "Food"],
      startDate: request.startDate,
      endDate: request.endDate,
    };

    const { plan, isFallback, providerUsed } = await tripPlannerEngine.planTrip(engineRequest);

    return {
      data: plan,
      raw: JSON.stringify(plan),
      provider: (providerUsed === "curated_fallback" ? "gemini" : providerUsed) as any,
    };
  },

  async suggest(destination: string, days: number): Promise<string[]> {
    try {
      const { plan } = await tripPlannerEngine.planTrip({
        origin: "Current Location",
        destination,
        durationDays: days,
        travelStyle: "solo",
        budgetLevel: "moderate",
        totalBudget: 1000,
        currency: "USD",
        travelers: 1,
        interests: ["Must-see", "Local culture"],
      });

      const acts: string[] = [];
      plan.days.forEach((d) => {
        d.activities.forEach((a) => {
          if (a.activity) acts.push(a.activity);
        });
      });
      return acts.slice(0, 8);
    } catch {
      return [
        `Explore the historic heart of ${destination}`,
        `Visit famous architectural landmarks in ${destination}`,
        `Sample signature local dishes at popular dining spots`,
        `Enjoy panoramic sunset views at scenic observation spots`,
        `Walk through authentic artisan markets and souvenir shops`,
      ];
    }
  },
};
