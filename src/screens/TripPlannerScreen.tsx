import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { addDays, format } from "date-fns";

import {
  tripPlannerEngine,
  calculateBudgetDistribution,
  defensiveParseTripPlan,
  extractJsonString,
  getCuratedFallbackItinerary,
  llmProviderRegistry,
  conciergeService,
} from "../services/ai";
import {
  weatherAdaptivePlanner,
  calculateSolarPosition,
} from "../services/ai/weatherAdaptivePlanner";
import type {
  WeatherAlertInfo,
  WeatherOptimizationResult,
  SolarPosition,
} from "../services/ai/weatherAdaptivePlanner";
import { buildTripPlannerEnginePrompt } from "../services/ai/prompts";
import type {
  BudgetLevel,
  Currency,
  TravelStyle,
  TripDay,
  TripPlan,
  TripActivity,
  TripPlannerEngineRequest,
} from "../services/ai";
import { useBookingStore } from "../store/bookingStore";
import { Badge, Button, Skeleton } from "../components/ui";
import { WeatherWidget } from "../components/weather/WeatherWidget";

// ─── Domain Constants & Configurations ────────────────────────────────────────

const USD_TO_BDT_RATE = 120;
const GENERATION_TIMEOUT_MS = 15000;
const TRIVIA_INTERVAL_MS = 2500;

export const formatCurrency = (amount: number, currency: Currency): string => {
  const safeAmount = isNaN(amount) ? 0 : Math.round(amount);
  return currency === "BDT" ? `৳${safeAmount.toLocaleString()}` : `$${safeAmount.toLocaleString()}`;
};

interface DestinationItem {
  name: string;
  country: string;
  tag: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const DESTINATION_CATALOG: DestinationItem[] = [
  // Bangladesh Local Destinations
  { name: "Cox's Bazar", country: "Bangladesh", tag: "Beach & Waves", icon: "water-outline" },
  { name: "Sylhet", country: "Bangladesh", tag: "Tea & Waterfalls", icon: "leaf-outline" },
  { name: "Sreemangal", country: "Bangladesh", tag: "Rainforest & Birds", icon: "leaf-outline" },
  { name: "Bandarban", country: "Bangladesh", tag: "Hills & Clouds", icon: "trail-sign-outline" },
  { name: "Rangamati", country: "Bangladesh", tag: "Lake & Culture", icon: "boat-outline" },
  { name: "Sajek Valley", country: "Bangladesh", tag: "Cloud Haven", icon: "cloudy-outline" },
  { name: "Saint Martin", country: "Bangladesh", tag: "Coral Island", icon: "sunny-outline" },
  { name: "Kuakata", country: "Bangladesh", tag: "Sunrise & Sunset", icon: "sunny-outline" },
  { name: "Sundarbans", country: "Bangladesh", tag: "Mangrove & Tiger", icon: "footsteps-outline" },
  { name: "Dhaka", country: "Bangladesh", tag: "Heritage & Food", icon: "business-outline" },
  { name: "Chittagong", country: "Bangladesh", tag: "Port & Hills", icon: "boat-outline" },
  // International Popular Destinations
  { name: "Bali", country: "Indonesia", tag: "Tropical Island", icon: "sunny-outline" },
  { name: "Tokyo", country: "Japan", tag: "Futuristic & Culture", icon: "sparkles-outline" },
  { name: "Bangkok", country: "Thailand", tag: "Nightlife & Temples", icon: "restaurant-outline" },
  { name: "Dubai", country: "UAE", tag: "Skyline & Desert", icon: "diamond-outline" },
  { name: "Singapore", country: "Singapore", tag: "Garden City", icon: "leaf-outline" },
  { name: "Paris", country: "France", tag: "Art & Romance", icon: "heart-outline" },
  { name: "Istanbul", country: "Turkey", tag: "Eurasia Crossroads", icon: "color-palette-outline" },
  { name: "Rome", country: "Italy", tag: "Historic Wonders", icon: "book-outline" },
  { name: "Kuala Lumpur", country: "Malaysia", tag: "Metropolis & Food", icon: "business-outline" },
  { name: "Kathmandu", country: "Nepal", tag: "Himalayan Vistas", icon: "trail-sign-outline" },
];

const ORIGIN_SUGGESTIONS = [
  "Dhaka",
  "Chittagong",
  "Sylhet",
  "Cox's Bazar",
  "Rajshahi",
  "Khulna",
  "Barisal",
  "Rangpur",
];

const DURATION_PRESETS = [
  { label: "3 Days", days: 3, subtitle: "Weekend Getaway" },
  { label: "5 Days", days: 5, subtitle: "Classic Tour" },
  { label: "7 Days", days: 7, subtitle: "1-Week Explorer" },
  { label: "10 Days", days: 10, subtitle: "Deep Discovery" },
  { label: "14 Days", days: 14, subtitle: "Grand Voyage" },
];

interface TravelStyleConfig {
  id: TravelStyle;
  label: string;
  desc: string;
  suggestedGuests: number;
  icon: keyof typeof Ionicons.glyphMap;
}

const TRAVEL_STYLES: TravelStyleConfig[] = [
  {
    id: "backpacker",
    label: "Backpacker",
    desc: "Hostels, street eats & public transit",
    suggestedGuests: 1,
    icon: "bag-outline",
  },
  {
    id: "solo",
    label: "Solo Explorer",
    desc: "Freedom, local immersion & photography",
    suggestedGuests: 1,
    icon: "compass-outline",
  },
  {
    id: "couple",
    label: "Couple Getaway",
    desc: "Romantic dining, scenic views & sunsets",
    suggestedGuests: 2,
    icon: "heart-outline",
  },
  {
    id: "family",
    label: "Family Vacation",
    desc: "Kid-friendly pacing & comfortable stays",
    suggestedGuests: 4,
    icon: "people-outline",
  },
  {
    id: "luxury",
    label: "Luxury Escape",
    desc: "5-star resorts, private transit & fine dining",
    suggestedGuests: 2,
    icon: "diamond-outline",
  },
];

interface BudgetTierConfig {
  id: BudgetLevel;
  label: string;
  dailyRateBdt: number;
  dailyRateUsd: number;
  tagline: string;
}

const BUDGET_TIERS: BudgetTierConfig[] = [
  {
    id: "budget",
    label: "Budget",
    dailyRateBdt: 2500,
    dailyRateUsd: 25,
    tagline: "Essential & savvy",
  },
  {
    id: "moderate",
    label: "Moderate",
    dailyRateBdt: 6000,
    dailyRateUsd: 60,
    tagline: "Comfort & balanced",
  },
  {
    id: "luxury",
    label: "Luxury",
    dailyRateBdt: 15000,
    dailyRateUsd: 150,
    tagline: "Premium & lavish",
  },
  {
    id: "custom",
    label: "Custom",
    dailyRateBdt: 7000,
    dailyRateUsd: 70,
    tagline: "Tailored amount",
  },
];

const INTEREST_OPTIONS = [
  { label: "Beach & Coast", icon: "water-outline" },
  { label: "Hiking & Nature", icon: "leaf-outline" },
  { label: "Authentic Food", icon: "restaurant-outline" },
  { label: "Culture & History", icon: "color-palette-outline" },
  { label: "Photography", icon: "camera-outline" },
  { label: "Local Shopping", icon: "cart-outline" },
  { label: "Wellness & Spa", icon: "flower-outline" },
  { label: "Nightlife & Cafes", icon: "wine-outline" },
  { label: "Water Sports", icon: "boat-outline" },
  { label: "Hidden Gems", icon: "sparkles-outline" },
];

const TRAVEL_TRIVIA = [
  {
    category: "NATURAL WONDER",
    icon: "water-outline",
    fact: "Cox's Bazar in Bangladesh boasts the longest unbroken natural sand sea beach on Earth, extending over 120 km (75 miles) along the Bay of Bengal.",
  },
  {
    category: "TEA HERITAGE",
    icon: "leaf-outline",
    fact: "Sylhet's rolling emerald hills host over 150 tea estates, home to the legendary seven-layer tea served at Nilkantha Tea Cabin in Sreemangal.",
  },
  {
    category: "MOUNTAIN SECRET",
    icon: "trail-sign-outline",
    fact: "Bandarban's Nilgiri and Keokradong peaks allow early risers to stand above a majestic blanket of clouds as the morning sun crests the horizon.",
  },
  {
    category: "CULINARY TRADITION",
    icon: "restaurant-outline",
    fact: "Old Dhaka (Puran Dhaka) is celebrated worldwide for heritage mutton kacchi biryani, slow-baked bakarkhani bread, and centuries-old spice bazaars.",
  },
  {
    category: "CORAL HAVEN",
    icon: "sunny-outline",
    fact: "Saint Martin's Island (Narikel Jinjira) is Bangladesh's sole coral reef island, renowned for tranquil coconut groves, fresh green coconuts, and crystal lagoons.",
  },
  {
    category: "BUDGETING SCIENCE",
    icon: "pie-chart-outline",
    fact: "Our 40/30/20/10 formula allocates 40% for hotel comfort, 30% for seamless transit, 20% for culinary gems, and 10% for bucket-list experiences.",
  },
  {
    category: "TRANSIT ICON",
    icon: "train-outline",
    fact: "Tokyo's Shinjuku station is the world's busiest transportation hub, with more than 3.5 million commuters passing through its 200+ exits daily.",
  },
  {
    category: "PACKING PRO-TIP",
    icon: "bag-check-outline",
    fact: "Compression packing cubes and rolled clothing can reduce luggage volume by up to 40% while preventing creases on travel shirts.",
  },
];

// ─── Defensive LLM Caller Adapter ───────────────────────────────────────────

const tripPlanner = {
  async generateItinerary(
    request: TripPlannerEngineRequest,
    options?: { signal?: AbortSignal }
  ): Promise<string> {
    if (options?.signal?.aborted) {
      throw new DOMException("The request was aborted", "AbortError");
    }

    try {
      const { systemPrompt, userPrompt } = buildTripPlannerEnginePrompt(request);
      const completion = await llmProviderRegistry.executeWithFallback({
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        abortSignal: options?.signal,
        responseMimeType: "application/json",
      });
      return completion.text;
    } catch (err: any) {
      if (err.name === "AbortError" || options?.signal?.aborted) {
        throw err;
      }
      try {
        const result = await tripPlannerEngine.planTrip(request);
        return JSON.stringify(result.plan);
      } catch {
        const fallback = getCuratedFallbackItinerary(request);
        return JSON.stringify(fallback);
      }
    }
  },
};

// ─── Editable Activity Context Interface ─────────────────────────────────────

interface EditingActivityContext {
  dayIndex: number;
  activityIndex: number;
  time: string;
  activity: string;
  location: string;
  estimatedCost: string;
  duration: string;
  notes: string;
}

export function TripPlannerScreen() {
  const insets = useSafeAreaInsets();

  // ─── Questionnaire Wizard State ─────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalWizardSteps = 5;

  // Step 1: Destination & Departure
  const [origin, setOrigin] = useState<string>("Dhaka");
  const [destination, setDestination] = useState<string>("Cox's Bazar");
  const [showDestModal, setShowDestModal] = useState<boolean>(false);
  const [customDestInput, setCustomDestInput] = useState<string>("");

  // Step 2: Trip Duration & Dates
  const [durationDays, setDurationDays] = useState<number>(3);
  const [startDate, setStartDate] = useState<Date>(() => new Date());

  // Step 3: Traveler Composition & Travel Style
  const [travelers, setTravelers] = useState<number>(2);
  const [travelStyle, setTravelStyle] = useState<TravelStyle>("couple");

  // Step 4: Budget Range & Optimization
  const [currency, setCurrency] = useState<Currency>("BDT");
  const [budgetLevel, setBudgetLevel] = useState<BudgetLevel>("moderate");
  const [totalBudget, setTotalBudget] = useState<number>(() => {
    const tier = BUDGET_TIERS.find((b) => b.id === "moderate")!;
    return tier.dailyRateBdt * 3 * 2;
  });

  // Step 5: Activity Preferences & Special Requests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    "Beach & Coast",
    "Authentic Food",
  ]);
  const [customNotes, setCustomNotes] = useState<string>("");

  // ─── Generation & Results State ─────────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [triviaIndex, setTriviaIndex] = useState<number>(0);
  const [generatedPlan, setGeneratedPlan] = useState<TripPlan | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);

  // ─── Activity Editing State ─────────────────────────────────────────────────
  const [editingActivity, setEditingActivity] = useState<EditingActivityContext | null>(null);

  // ─── Saved Plans & Persistence State ─────────────────────────────────────────
  const SAVED_PLANS_KEY = "@shopno_saved_plans";
  const [savedPlans, setSavedPlans] = useState<TripPlan[]>([]);
  const [showSavedModal, setShowSavedModal] = useState<boolean>(false);
  const [isCurrentPlanSaved, setIsCurrentPlanSaved] = useState<boolean>(false);

  // ─── Weather Adaptive Planner & Golden Hour State ───────────────────────────
  const [weatherAlert, setWeatherAlert] = useState<WeatherAlertInfo | null>(null);
  const [activeOptimization, setActiveOptimization] = useState<WeatherOptimizationResult | null>(null);
  const [isWeatherOptimized, setIsWeatherOptimized] = useState<boolean>(false);
  const [isCheckingWeather, setIsCheckingWeather] = useState<boolean>(false);
  const [showWeatherDetailsModal, setShowWeatherDetailsModal] = useState<boolean>(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  // ─── Interactive Packing Checklist State ────────────────────────────────────
  const [packedItems, setPackedItems] = useState<string[]>([]);
  const [customPackingInput, setCustomPackingInput] = useState<string>("");

  // ─── Interactive AI Concierge Q&A State ─────────────────────────────────────
  const [conciergeQuestion, setConciergeQuestion] = useState<string>("");
  const [conciergeAnswer, setConciergeAnswer] = useState<string | null>(null);
  const [conciergeSuggestions, setConciergeSuggestions] = useState<string[]>([]);
  const [isAskingConcierge, setIsAskingConcierge] = useState<boolean>(false);

  // ─── Animation References ───────────────────────────────────────────────────
  const progressAnim = useRef(new Animated.Value(0)).current;
  const triviaFadeAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;
  const shimmerLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Load saved plans from AsyncStorage on mount
  useEffect(() => {
    const loadStoredPlans = async () => {
      try {
        const stored = await AsyncStorage.getItem(SAVED_PLANS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSavedPlans(parsed);
          }
        }
      } catch (err) {
        console.warn("[TripPlannerScreen] Failed to load saved plans:", err);
      }
    };
    loadStoredPlans();
  }, []);

  // Check if current plan is saved whenever generatedPlan or savedPlans change
  useEffect(() => {
    if (!generatedPlan) {
      setIsCurrentPlanSaved(false);
      return;
    }
    const found = savedPlans.some(
      (p) =>
        (p.id && generatedPlan.id && p.id === generatedPlan.id) ||
        (p.title === generatedPlan.title && p.destination === generatedPlan.destination)
    );
    setIsCurrentPlanSaved(found);
  }, [generatedPlan, savedPlans]);

  // ─── Weather Adaptive Planner Hooks ─────────────────────────────────────────
  // Evaluates real-time weather and solar golden hours whenever a plan is loaded or generated
  useEffect(() => {
    if (!generatedPlan || !generatedPlan.days || generatedPlan.days.length === 0) {
      setWeatherAlert(null);
      setActiveOptimization(null);
      setIsWeatherOptimized(false);
      return;
    }

    try {
      setIsCheckingWeather(true);
      const result = weatherAdaptivePlanner.analyzeAndOptimizeItinerary(
        generatedPlan,
        startDate
      );
      setActiveOptimization(result);

      if (result.alert && !dismissedAlertIds.includes(result.alert.id)) {
        setWeatherAlert(result.alert);
      } else {
        setWeatherAlert(null);
      }

      // Check if plan already incorporates the weather swaps or golden hour timings
      const hasSwaps = result.modifications.some((m) => m.type === "weather_swap");
      if (
        !hasSwaps &&
        generatedPlan.days.some((d) =>
          d.activities.some((a) => (a.notes || "").includes("Weather Adaptive"))
        )
      ) {
        setIsWeatherOptimized(true);
      }
    } catch (err) {
      console.warn("[TripPlannerScreen] Weather adaptive analysis failed:", err);
    } finally {
      setIsCheckingWeather(false);
    }
  }, [generatedPlan, startDate, dismissedAlertIds]);

  // ─── Weather Optimization Handlers ──────────────────────────────────────────

  // Requirement 3: "Accept" Button
  const handleAcceptWeatherOptimization = () => {
    if (!activeOptimization) return;

    const optimized = activeOptimization.optimizedPlan;
    setGeneratedPlan(optimized);
    setIsWeatherOptimized(true);

    if (weatherAlert) {
      setDismissedAlertIds((prev) => [...prev, weatherAlert.id]);
      setWeatherAlert(null);
    }

    // Requirement 4: State Synchronization: Update modified itinerary in useBookingStore without losing booking references
    weatherAdaptivePlanner.syncPlanToBookingStore(optimized, { preserveBookingRef: true });

    const bookingStore = useBookingStore.getState();
    if (typeof (bookingStore as any).syncItineraryPlan === "function") {
      (bookingStore as any).syncItineraryPlan(optimized);
    }

    Alert.alert(
      "Schedule Weather-Optimized! ☀️",
      "Your itinerary has been automatically restructured to protect against rain and capture peak golden hour lighting.\n\n" +
        `• ${activeOptimization.alert?.outdoorActivityAffected || "Outdoor activity"} swapped for ${
          activeOptimization.alert?.replacementActivity || "indoor experience"
        }\n` +
        "• Photography spot visits aligned with solar position tables\n" +
        "• Synchronized with checkout booking draft.",
      [{ text: "Great!" }]
    );
  };

  // Requirement 3: "Keep Original" Button
  const handleRejectWeatherOptimization = () => {
    if (weatherAlert) {
      setDismissedAlertIds((prev) => [...prev, weatherAlert.id]);
      setWeatherAlert(null);
    }
    Alert.alert(
      "Original Schedule Kept",
      "You have chosen to retain your original itinerary. Please pack rain gear and an umbrella for Day 2!"
    );
  };


  // Computed Date Range
  const endDate = useMemo(() => addDays(startDate, durationDays), [startDate, durationDays]);
  const formattedDateRange = useMemo(
    () => `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`,
    [startDate, endDate]
  );

  // Dynamic budget calculation based on duration & guests
  const calculateTierBudget = (tierId: BudgetLevel, curr: Currency, days: number, guests: number): number => {
    const tier = BUDGET_TIERS.find((b) => b.id === tierId) || BUDGET_TIERS[1];
    const daily = curr === "BDT" ? tier.dailyRateBdt : tier.dailyRateUsd;
    return Math.round(daily * Math.max(1, days) * Math.max(1, guests));
  };

  // Sync budget when currency, tier, duration, or travelers change (unless custom is set)
  const handleCurrencyChange = (newCurr: Currency) => {
    setCurrency(newCurr);
    if (budgetLevel !== "custom") {
      setTotalBudget(calculateTierBudget(budgetLevel, newCurr, durationDays, travelers));
    } else {
      // Convert existing custom budget
      setTotalBudget((prev) =>
        newCurr === "BDT" ? Math.round(prev * USD_TO_BDT_RATE) : Math.round(prev / USD_TO_BDT_RATE)
      );
    }
  };

  const handleBudgetTierSelect = (tierId: BudgetLevel) => {
    setBudgetLevel(tierId);
    if (tierId !== "custom") {
      setTotalBudget(calculateTierBudget(tierId, currency, durationDays, travelers));
    }
  };

  const handleDurationChange = (newDays: number) => {
    const boundedDays = Math.max(1, Math.min(21, newDays));
    setDurationDays(boundedDays);
    if (budgetLevel !== "custom") {
      setTotalBudget(calculateTierBudget(budgetLevel, currency, boundedDays, travelers));
    }
  };

  const handleTravelersChange = (newCount: number) => {
    const boundedGuests = Math.max(1, Math.min(12, newCount));
    setTravelers(boundedGuests);
    if (budgetLevel !== "custom") {
      setTotalBudget(calculateTierBudget(budgetLevel, currency, durationDays, boundedGuests));
    }
  };

  const handleStyleSelect = (style: TravelStyleConfig) => {
    setTravelStyle(style.id);
    if (travelers === 1 && style.suggestedGuests > 1) {
      handleTravelersChange(style.suggestedGuests);
    }
  };

  // Rotating trivia & shimmer loop during generation
  useEffect(() => {
    let triviaInterval: ReturnType<typeof setInterval> | null = null;

    if (isGenerating) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 0.95,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0.3,
            duration: 750,
            useNativeDriver: true,
          }),
        ])
      );
      shimmerLoopRef.current = loop;
      loop.start();

      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: GENERATION_TIMEOUT_MS - 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();

      triviaInterval = setInterval(() => {
        Animated.sequence([
          Animated.timing(triviaFadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(triviaFadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();

        setTriviaIndex((prev) => (prev + 1) % TRAVEL_TRIVIA.length);
      }, TRIVIA_INTERVAL_MS);
    } else {
      shimmerLoopRef.current?.stop();
      shimmerLoopRef.current = null;
      if (triviaInterval) clearInterval(triviaInterval);
      shimmerAnim.setValue(1);
      triviaFadeAnim.setValue(1);
    }

    return () => {
      shimmerLoopRef.current?.stop();
      shimmerLoopRef.current = null;
      if (triviaInterval) clearInterval(triviaInterval);
    };
  }, [isGenerating]);

  // Live budget allocation preview
  const liveBudgetBreakdown = useMemo(() => {
    return calculateBudgetDistribution(
      totalBudget,
      currency,
      durationDays,
      travelers,
      travelStyle
    );
  }, [totalBudget, currency, durationDays, travelers, travelStyle]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  // ─── Requirement 2: Defensive Generation Pipeline ───────────────────────────

  const handleGenerateItinerary = async () => {
    if (!destination.trim()) {
      Alert.alert("Destination Required", "Please choose or enter a destination to plan your trip.");
      return;
    }

    setIsGenerating(true);
    setTriviaIndex(0);

    const request: TripPlannerEngineRequest = {
      origin: origin || "Dhaka",
      destination: destination.trim(),
      durationDays,
      travelStyle,
      budgetLevel,
      totalBudget,
      currency,
      travelers,
      interests: selectedInterests,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, GENERATION_TIMEOUT_MS);

    try {
      // 1. Call tripPlanner.generateItinerary with abort signal
      const rawOutput = await tripPlanner.generateItinerary(request, {
        signal: abortController.signal,
      });

      // 2. Defensive JSON Extraction & Parsing
      const cleanJson = extractJsonString(rawOutput);
      const parseResult = defensiveParseTripPlan(cleanJson || rawOutput);

      if (parseResult.success && parseResult.data) {
        setGeneratedPlan(parseResult.data);
        setExpandedDay(1);
        setPackedItems([]);
        setConciergeAnswer(null);
        setConciergeSuggestions([]);
      } else {
        console.warn("[TripPlannerScreen] Defensive parsing yielded no schema match. Using curated fallback.");
        const fallback = getCuratedFallbackItinerary(request);
        setGeneratedPlan(fallback);
        setExpandedDay(1);
        setPackedItems([]);
        setConciergeAnswer(null);
        setConciergeSuggestions([]);
      }
    } catch (err: any) {
      if (err.name === "AbortError" || abortController.signal.aborted) {
        console.warn("[TripPlannerScreen] Generation timed out after 15s. Gracefully deploying curated itinerary.");
      } else {
        console.error("[TripPlannerScreen] Generation error:", err);
      }
      const fallback = getCuratedFallbackItinerary(request);
      setGeneratedPlan(fallback);
      setExpandedDay(1);
      setPackedItems([]);
      setConciergeAnswer(null);
      setConciergeSuggestions([]);
    } finally {
      clearTimeout(timeoutId);
      setIsGenerating(false);
    }
  };

  // ─── Requirement 3: Interactive Results & Activity Editing ───────────────────

  const handleOpenEditActivity = (dayIndex: number, actIndex: number) => {
    if (!generatedPlan) return;
    const act = generatedPlan.days[dayIndex]?.activities[actIndex];
    if (!act) return;

    setEditingActivity({
      dayIndex,
      activityIndex: actIndex,
      time: act.time || "Morning",
      activity: act.activity || "",
      location: act.location || "",
      estimatedCost: act.estimatedCost !== undefined ? String(act.estimatedCost) : "0",
      duration: act.duration || "1.5 hours",
      notes: act.notes || "",
    });
  };

  const handleSaveEditedActivity = () => {
    if (!editingActivity || !generatedPlan) return;
    const { dayIndex, activityIndex, time, activity, location, estimatedCost, duration, notes } =
      editingActivity;

    const newDays = [...generatedPlan.days];
    const targetDay = { ...newDays[dayIndex] };
    const newActivities = [...targetDay.activities];

    const parsedCost = Number(estimatedCost.replace(/[^0-9.]/g, "")) || 0;

    newActivities[activityIndex] = {
      ...newActivities[activityIndex],
      time: time.trim() || "Daytime",
      activity: activity.trim() || "Sightseeing Activity",
      location: location.trim() || generatedPlan.destination,
      estimatedCost: parsedCost,
      duration: duration.trim() || "1 hour",
      notes: notes.trim(),
    };

    targetDay.activities = newActivities;
    newDays[dayIndex] = targetDay;

    setGeneratedPlan({
      ...generatedPlan,
      days: newDays,
    });
    setEditingActivity(null);
  };

  const handleAddActivity = (dayIndex: number) => {
    if (!generatedPlan) return;
    const newDays = [...generatedPlan.days];
    const targetDay = { ...newDays[dayIndex] };

    const newAct: TripActivity = {
      time: "Afternoon",
      activity: "Explore Local Landmark",
      location: generatedPlan.destination,
      duration: "1 hour",
      estimatedCost: currency === "BDT" ? 500 : 15,
      notes: "Custom added activity",
    };

    targetDay.activities = [...targetDay.activities, newAct];
    newDays[dayIndex] = targetDay;

    setGeneratedPlan({
      ...generatedPlan,
      days: newDays,
    });

    setEditingActivity({
      dayIndex,
      activityIndex: targetDay.activities.length - 1,
      time: newAct.time,
      activity: newAct.activity,
      location: newAct.location,
      estimatedCost: String(newAct.estimatedCost),
      duration: newAct.duration || "1 hour",
      notes: newAct.notes || "",
    });
  };

  const handleDeleteActivity = (dayIndex: number, actIndex: number) => {
    if (!generatedPlan) return;
    Alert.alert(
      "Remove Activity",
      "Are you sure you want to delete this activity from your itinerary?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const newDays = [...generatedPlan.days];
            const targetDay = { ...newDays[dayIndex] };
            targetDay.activities = targetDay.activities.filter((_, i) => i !== actIndex);
            newDays[dayIndex] = targetDay;
            setGeneratedPlan({
              ...generatedPlan,
              days: newDays,
            });
          },
        },
      ]
    );
  };

  // ─── Requirement 4: One-Tap "Book Entire Itinerary" Action ───────────────────

  const handleBookEntireItinerary = () => {
    if (!generatedPlan) return;

    const bookingStore = useBookingStore.getState();
    const baseCost = generatedPlan.totalEstimatedCost || totalBudget;
    const currencyCode = generatedPlan.currency || currency;
    const startIso = format(startDate, "yyyy-MM-dd");
    const endIso = format(endDate, "yyyy-MM-dd");

    // 1. Initialize booking draft in store (preserving existing productId / reference if active)
    const existingProductId = bookingStore.productId;
    const productId = existingProductId || `PKG-${generatedPlan.destination.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${Date.now()}`;

    bookingStore.initDraft({
      productType: "package",
      productId,
      destinationCity: generatedPlan.destination,
      destinationCountry: origin ? `${origin} to ${generatedPlan.destination}` : generatedPlan.destination,
      startDate: startIso,
      endDate: endIso,
      basePrice: baseCost,
      currency: currencyCode,
      numberOfGuests: travelers,
    });

    // 2. Package hotel stays
    const hotelRooms = generatedPlan.days
      .filter((d) => Boolean(d.accommodation))
      .map((d) => ({
        roomId: `hotel-day-${d.day}`,
        roomType: d.accommodation || "Curated Hotel Stay",
        count: Math.max(1, Math.ceil(travelers / 2)),
        pricePerNight: Math.round(
          (generatedPlan.budget?.hotel?.estimated || baseCost * 0.4) /
            Math.max(1, generatedPlan.durationDays)
        ),
      }));

    if (hotelRooms.length > 0) {
      bookingStore.setSelectedRooms(hotelRooms);
    }

    // 3. Package all tours, activities, and dining into booking notes
    const activityLines = generatedPlan.days
      .flatMap((d) =>
        d.activities.map(
          (a) =>
            `• [Day ${d.day} ${a.time}] ${a.activity} (${a.location})${
              a.estimatedCost ? ` - ${formatCurrency(a.estimatedCost, currencyCode)}` : ""
            }`
        )
      )
      .join("\n");

    const diningLines = generatedPlan.days
      .flatMap((d) =>
        (d.meals || []).map(
          (m) =>
            `• [Day ${d.day} ${m.type.toUpperCase()}] ${m.suggestion}${
              m.restaurant ? ` at ${m.restaurant}` : ""
            }`
        )
      )
      .join("\n");

    const packageSummary =
      `✈️ COMPLETE AI ITINERARY PACKAGE: ${generatedPlan.title}\n` +
      `📍 Destination: ${generatedPlan.destination} (Departure: ${origin})\n` +
      `📅 Duration: ${generatedPlan.durationDays} Days (${formattedDateRange}) | Guests: ${travelers}\n` +
      `💰 Budget: ${formatCurrency(baseCost, currencyCode)}\n\n` +
      `🏨 ACCOMMODATIONS:\n${
        hotelRooms.map((r) => `• ${r.roomType}`).join("\n") || "Centrally located quality hotel"
      }\n\n` +
      `🎟️ CURATED TOURS & ACTIVITIES:\n${activityLines}\n\n` +
      `🍲 RECOMMENDED DINING:\n${diningLines}`;

    bookingStore.setNotes(packageSummary);
    if (typeof (bookingStore as any).syncItineraryPlan === "function") {
      (bookingStore as any).syncItineraryPlan(generatedPlan);
    }
    bookingStore.setStep(1);

    // 4. Confirmation dialog and checkout navigation
    Alert.alert(
      "Entire Itinerary Packaged! 🎒",
      `All ${generatedPlan.durationDays} days of accommodations, ${generatedPlan.days.reduce(
        (acc, d) => acc + d.activities.length,
        0
      )} activities, and meal spots are ready in your checkout draft.`,
      [
        {
          text: "Review Plan",
          style: "cancel",
        },
        {
          text: "Proceed to Checkout",
          onPress: () => {
            try {
              router.push({
                pathname: "/screens/[slug]",
                params: {
                  slug: "booking-system",
                  destination_city: generatedPlan.destination,
                  number_of_guests: travelers,
                  final_price: baseCost,
                  currency: currencyCode,
                  status: "pending",
                  product_type: "package",
                },
              });
            } catch {
              router.push("/screens/booking-system" as any);
            }
          },
        },
      ]
    );
  };

  // Share or Export Itinerary
  const handleShareItinerary = async () => {
    if (!generatedPlan) return;
    try {
      const summaryText =
        `✈️ ${generatedPlan.title}\n\n` +
        `📍 Destination: ${generatedPlan.destination} (Starting: ${origin})\n` +
        `📅 Dates: ${formattedDateRange} (${generatedPlan.durationDays} Days)\n` +
        `👥 Travelers: ${travelers} (${travelStyle.toUpperCase()})\n` +
        `💰 Total Cost: ${formatCurrency(generatedPlan.totalEstimatedCost, generatedPlan.currency)}\n\n` +
        `🏨 Hotel: ${generatedPlan.budget?.hotel?.percentage}% | 🚆 Transport: ${generatedPlan.budget?.transport?.percentage}% | 🍲 Food: ${generatedPlan.budget?.food?.percentage}% | 🎟️ Activities: ${generatedPlan.budget?.activities?.percentage}%\n\n` +
        `Created with AI Trip Planner.`;

      await Share.share({
        message: summaryText,
        title: generatedPlan.title,
      });
    } catch {
      // User cancelled share
    }
  };

  // Open map location defensively
  const handleOpenMapLocation = (lat?: number, lng?: number, locationLabel?: string) => {
    const queryTerm = locationLabel || destination;
    let url = "";

    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      const latLng = `${lat},${lng}`;
      url = Platform.select({
        ios: `maps:0,0?q=${encodeURIComponent(queryTerm)}@${latLng}`,
        android: `geo:0,0?q=${latLng}(${encodeURIComponent(queryTerm)})`,
        default: `https://www.google.com/maps/search/?api=1&query=${latLng}`,
      }) || `https://www.google.com/maps/search/?api=1&query=${latLng}`;
    } else {
      const encoded = encodeURIComponent(queryTerm);
      url = Platform.select({
        ios: `maps:0,0?q=${encoded}`,
        android: `geo:0,0?q=${encoded}`,
        default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
      }) || `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    }

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) Linking.openURL(url);
        else Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryTerm)}`);
      })
      .catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryTerm)}`);
      });
  };

  // ─── Persistence & Saved Plans Handlers ─────────────────────────────────────
  const handleToggleSavePlan = async () => {
    if (!generatedPlan) return;
    try {
      const planId =
        generatedPlan.id ||
        `plan-${generatedPlan.destination.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
      const planToPersist: TripPlan = {
        ...generatedPlan,
        id: planId,
        generatedAt: generatedPlan.generatedAt || new Date().toISOString(),
      };

      let nextList: TripPlan[];
      if (isCurrentPlanSaved) {
        nextList = savedPlans.filter((p) => p.id !== planId && p.title !== generatedPlan.title);
        setIsCurrentPlanSaved(false);
        Alert.alert("Removed", "Itinerary removed from your saved trips.");
      } else {
        nextList = [planToPersist, ...savedPlans.filter((p) => p.id !== planId && p.title !== generatedPlan.title)];
        setIsCurrentPlanSaved(true);
        Alert.alert("Saved! 🔖", "Itinerary saved to your device. You can access it anytime from the top bar.");
      }
      setSavedPlans(nextList);
      await AsyncStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(nextList));
    } catch (err) {
      Alert.alert("Save Error", "Could not save itinerary to device.");
    }
  };

  const handleDeleteSavedPlan = async (planId: string) => {
    try {
      const nextList = savedPlans.filter((p) => p.id !== planId);
      setSavedPlans(nextList);
      await AsyncStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(nextList));
      if (generatedPlan?.id === planId) {
        setIsCurrentPlanSaved(false);
      }
    } catch (err) {
      console.warn("Failed to delete saved plan:", err);
    }
  };

  const handleOpenSavedPlan = (plan: TripPlan) => {
    setGeneratedPlan(plan);
    setExpandedDay(1);
    setIsCurrentPlanSaved(true);
    setShowSavedModal(false);
    setPackedItems([]);
    setConciergeAnswer(null);
  };

  // ─── Interactive Packing Checklist Handlers ─────────────────────────────────
  const effectivePackingList = useMemo(() => {
    if (generatedPlan?.packingChecklist && generatedPlan.packingChecklist.length > 0) {
      return generatedPlan.packingChecklist;
    }
    return [
      "Government NID / Passport & Tickets",
      "Universal Power Bank & Multi-pin Adapter",
      "Comfortable Walking / Trekking Shoes",
      "Lightweight Rain Jacket or Umbrella",
      "Prescription Medications & First Aid",
      "Sunscreen SPF 50+ & Polarized Sunglasses",
      "Local Cash & Debit Cards for Street Vendors",
      "Reusable Thermal Water Bottle",
    ];
  }, [generatedPlan]);

  const togglePackedItem = (item: string) => {
    setPackedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleAddCustomPackingItem = () => {
    if (!customPackingInput.trim() || !generatedPlan) return;
    const newItem = customPackingInput.trim();
    const currentList = generatedPlan.packingChecklist || effectivePackingList;
    if (!currentList.includes(newItem)) {
      setGeneratedPlan({
        ...generatedPlan,
        packingChecklist: [...currentList, newItem],
      });
    }
    setCustomPackingInput("");
  };

  // ─── Interactive AI Concierge Q&A Handlers ──────────────────────────────────
  const handleAskConcierge = async (presetQuestion?: string) => {
    const query = (presetQuestion || conciergeQuestion).trim();
    if (!query || isAskingConcierge || !generatedPlan) return;

    setIsAskingConcierge(true);
    try {
      const response = await conciergeService.ask({
        question: query,
        context: {
          destination: generatedPlan.destination,
          duration: `${generatedPlan.durationDays} days`,
          travelStyle: generatedPlan.travelStyle,
          budget: `${generatedPlan.budget?.totalBudget || generatedPlan.totalEstimatedCost || totalBudget} ${generatedPlan.currency}`,
          travelers: `${travelers} people`,
          origin: origin,
        },
      });

      if (response.data?.answer) {
        setConciergeAnswer(response.data.answer);
        setConciergeSuggestions(response.data.suggestions || []);
      } else if (response.raw) {
        setConciergeAnswer(response.raw);
        setConciergeSuggestions([]);
      } else {
        setConciergeAnswer(
          `For ${generatedPlan.destination}, we recommend starting outdoor activities before 9:00 AM to beat midday heat and crowds, and always confirming local transportation rates before departure.`
        );
      }
      setConciergeQuestion("");
    } catch (err) {
      console.warn("[TripPlannerScreen] Concierge query error:", err);
      setConciergeAnswer(
        `Local tip for ${generatedPlan.destination}: Always keep small cash denominations for rickshaws, tuk-tuks, and entry tickets. Check operating hours 24 hours in advance for heritage sites.`
      );
      setConciergeSuggestions([
        "Where is the best spot for sunset photography?",
        "What are the top 3 authentic local dishes?",
        "Are there common tourist scams in this area?",
      ]);
    } finally {
      setIsAskingConcierge(false);
    }
  };

  // Step validation
  const canGoNext = () => {
    if (currentStep === 1) return destination.trim().length > 0;
    if (currentStep === 2) return durationDays > 0;
    if (currentStep === 3) return travelers > 0;
    if (currentStep === 4) return totalBudget > 0;
    return true;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <LinearGradient
        colors={["#EBF4FF", "#F0F7FF", "#F8FAFC"]}
        style={styles.headerBackgroundGradient}
      />

      {/* ─── Top Header Bar ───────────────────────────────────────────────── */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.iconCircleButton}
          onPress={() => {
            if (generatedPlan) {
              setGeneratedPlan(null);
            } else if (currentStep > 1) {
              setCurrentStep(currentStep - 1);
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/");
            }
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons
            name={generatedPlan || currentStep > 1 ? "arrow-back" : "chevron-back"}
            size={22}
            color="#0F172A"
          />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Trip.Planner</Text>
          <Badge
            status="info"
            variant="subtle"
            size="sm"
            label="AI CONCIERGE"
            icon={<Ionicons name="sparkles" size={11} color="#2563EB" />}
          />
        </View>

        <View style={styles.headerRightActions}>
          {generatedPlan ? (
            <>
              <TouchableOpacity
                style={[
                  styles.iconCircleButton,
                  isCurrentPlanSaved && styles.iconCircleButtonActive,
                ]}
                onPress={handleToggleSavePlan}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={isCurrentPlanSaved ? "bookmark" : "bookmark-outline"}
                  size={20}
                  color={isCurrentPlanSaved ? "#2563EB" : "#334155"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconCircleButton}
                onPress={handleShareItinerary}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="share-social-outline" size={20} color="#334155" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.iconCircleButton}
                onPress={() => setShowSavedModal(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="folder-open-outline" size={20} color="#334155" />
                {savedPlans.length > 0 && (
                  <View style={styles.headerBadgeDot}>
                    <Text style={styles.headerBadgeDotText}>{savedPlans.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconCircleButton}
                onPress={() => {
                  Alert.alert(
                    "AI Trip Concierge",
                    "Powered by Google Gemini with 15s defensive failover, automatic JSON repair, 40/30/20/10 budget logic, and one-tap booking packaging."
                  );
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="information-circle-outline" size={20} color="#334155" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* ─── MAIN CONTENT SCROLLVIEW ──────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
      >
        {/* VIEW A: GENERATION / SKELETON WITH ROTATING TRAVEL TRIVIA */}
        {isGenerating ? (
          <View style={styles.loadingContainer}>
            {/* Progress Bar across 15s */}
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["5%", "100%"],
                    }),
                  },
                ]}
              />
            </View>

            {/* Rotating Travel Trivia Card */}
            <View style={styles.triviaCard}>
              <View style={styles.triviaHeaderRow}>
                <View style={styles.triviaBadge}>
                  <Ionicons name="sparkles" size={13} color="#2563EB" />
                  <Text style={styles.triviaBadgeText}>
                    {TRAVEL_TRIVIA[triviaIndex].category}
                  </Text>
                </View>
                <Text style={styles.triviaCounterText}>
                  TRIVIA {triviaIndex + 1} OF {TRAVEL_TRIVIA.length}
                </Text>
              </View>

              <Animated.View style={{ opacity: triviaFadeAnim }}>
                <View style={styles.triviaBodyRow}>
                  <View style={styles.triviaIconBox}>
                    <Ionicons
                      name={TRAVEL_TRIVIA[triviaIndex].icon as any}
                      size={24}
                      color="#2563EB"
                    />
                  </View>
                  <Text style={styles.triviaFactText}>
                    {TRAVEL_TRIVIA[triviaIndex].fact}
                  </Text>
                </View>
              </Animated.View>

              <View style={styles.generationStatusRow}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.generationStatusText}>
                  Synthesizing {durationDays}-Day itinerary for {destination} • {formatCurrency(totalBudget, currency)}
                </Text>
              </View>
            </View>

            {/* Shimmer Skeleton Cards */}
            <Animated.View style={{ opacity: shimmerAnim }}>
              <Skeleton variant="card" height={150} borderRadius={20} style={{ marginBottom: 12 }} />
              <Skeleton variant="card" height={90} borderRadius={16} style={{ marginBottom: 12 }} />
              <Skeleton variant="card" height={120} borderRadius={16} style={{ marginBottom: 12 }} />
              <Skeleton variant="card" height={110} borderRadius={16} />
            </Animated.View>
          </View>
        ) : generatedPlan ? (
          /* VIEW B: INTERACTIVE ITINERARY RESULT VIEW */
          <View style={styles.resultContainer}>
            {/* ─── Requirement 3: Proactive Traveler Alert Suggestion Banner ─── */}
            {weatherAlert && (
              <View style={styles.weatherAlertBannerWrap}>
                <LinearGradient
                  colors={["#FFFBEB", "#FEF3C7", "#FDE68A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.weatherAlertBannerGradient}
                >
                  <View style={styles.weatherAlertHeaderRow}>
                    <View style={styles.weatherAlertIconBox}>
                      <Ionicons name="rainy" size={24} color="#D97706" />
                    </View>
                    <View style={styles.weatherAlertHeaderTextWrap}>
                      <View style={styles.weatherAlertBadgesLine}>
                        <Badge
                          status="warning"
                          variant="solid"
                          size="sm"
                          label="WEATHER WARNING"
                          icon={<Ionicons name="warning" size={11} color="#FFFFFF" />}
                        />
                        <View style={styles.solarPill}>
                          <Ionicons name="sunny" size={11} color="#92400E" />
                          <Text style={styles.solarPillText}>Solar Position Tables</Text>
                        </View>
                      </View>
                      <Text style={styles.weatherAlertHeaderTitle}>
                        {weatherAlert.title || "Proactive Schedule Optimization"}
                      </Text>
                    </View>
                  </View>

                  {/* Requirement 3 Exact Message */}
                  <Text style={styles.weatherAlertMessageText}>
                    {weatherAlert.message}
                  </Text>

                  {/* Contextual Weather & Golden Hour Highlights */}
                  <View style={styles.weatherAlertDetailsBox}>
                    <View style={styles.weatherDetailRow}>
                      <Ionicons name="water-outline" size={15} color="#B45309" />
                      <Text style={styles.weatherDetailText}>
                        Precipitation: <Text style={styles.boldText}>{weatherAlert.precipitationProbability}%</Text> (Threshold &gt; 70%) at {weatherAlert.forecastTime}
                      </Text>
                    </View>
                    <View style={styles.weatherDetailRow}>
                      <Ionicons name="swap-horizontal-outline" size={15} color="#B45309" />
                      <Text style={styles.weatherDetailText}>
                        Adaptive Swap: <Text style={styles.boldText}>{weatherAlert.outdoorActivityAffected}</Text> &rarr; <Text style={styles.boldText}>{weatherAlert.replacementActivity}</Text>
                      </Text>
                    </View>
                    {weatherAlert.goldenHourOptimizationsCount > 0 && (
                      <View style={styles.weatherDetailRow}>
                        <Ionicons name="camera-outline" size={15} color="#B45309" />
                        <Text style={styles.weatherDetailText}>
                          Golden Hour: {weatherAlert.goldenHourOptimizationsCount} photography spots aligned with astronomical sunrise/sunset
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Requirement 3 Buttons: "Accept" and "Keep Original" */}
                  <View style={styles.weatherAlertActionRow}>
                    <TouchableOpacity
                      style={styles.weatherAlertAcceptBtn}
                      onPress={handleAcceptWeatherOptimization}
                      activeOpacity={0.8}
                      accessibilityLabel="Accept weather schedule optimization"
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.weatherAlertAcceptBtnText}>Accept</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.weatherAlertKeepBtn}
                      onPress={handleRejectWeatherOptimization}
                      activeOpacity={0.8}
                      accessibilityLabel="Keep original schedule"
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#78350F" />
                      <Text style={styles.weatherAlertKeepBtnText}>Keep Original</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.weatherAlertInfoBtn}
                      onPress={() => setShowWeatherDetailsModal(true)}
                      activeOpacity={0.7}
                      accessibilityLabel="View weather and solar calculation details"
                    >
                      <Ionicons name="information-circle-outline" size={20} color="#92400E" />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* Active Weather-Optimized Badge Bar (Shown after Accepting) */}
            {!weatherAlert && isWeatherOptimized && (
              <View style={styles.weatherOptimizedPillBar}>
                <View style={styles.weatherOptimizedPillLeft}>
                  <Ionicons name="checkmark-done-circle" size={18} color="#059669" />
                  <Text style={styles.weatherOptimizedPillText}>
                    Schedule Weather-Optimized &amp; Golden Hour Synced
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowWeatherDetailsModal(true)}
                  style={styles.weatherViewDataLink}
                >
                  <Text style={styles.weatherViewDataLinkText}>Solar &amp; Rain Data</Text>
                  <Ionicons name="chevron-forward" size={14} color="#059669" />
                </TouchableOpacity>
              </View>
            )}

            {/* Top Hero Banner */}
            <LinearGradient
              colors={["#1E3A8A", "#2563EB", "#4F46E5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBanner}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroPill}>
                  <Ionicons name="location-sharp" size={12} color="#FFFFFF" />
                  <Text style={styles.heroPillText}>{generatedPlan.destination}</Text>
                </View>
                <View style={[styles.heroPill, styles.heroPillLight]}>
                  <Ionicons name="calendar-outline" size={12} color="#FFFFFF" />
                  <Text style={styles.heroPillText}>{generatedPlan.durationDays} Days</Text>
                </View>
                <View style={[styles.heroPill, styles.heroPillLight]}>
                  <Ionicons name="people-outline" size={12} color="#FFFFFF" />
                  <Text style={styles.heroPillText}>{travelers} Guests • {generatedPlan.travelStyle.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>{generatedPlan.title}</Text>
              <Text style={styles.heroSummary}>{generatedPlan.summary}</Text>

              {/* Total Cost & Status Badge */}
              <View style={styles.heroCostRow}>
                <View>
                  <Text style={styles.heroCostLabel}>Total Estimated Budget</Text>
                  <Text style={styles.heroCostValue}>
                    {formatCurrency(generatedPlan.totalEstimatedCost, generatedPlan.currency)}
                  </Text>
                </View>

                {generatedPlan.isFallback ? (
                  <Badge
                    status="warning"
                    variant="subtle"
                    size="sm"
                    label="Curated Expert Guide"
                    icon={<Ionicons name="shield-checkmark" size={13} color="#D97706" />}
                  />
                ) : (
                  <Badge
                    status="success"
                    variant="subtle"
                    size="sm"
                    label="AI Optimized"
                    icon={<Ionicons name="sparkles" size={13} color="#10B981" />}
                  />
                )}
              </View>
            </LinearGradient>

            {/* ─── Real-Time Meteorological & Weather Risk Widget ─── */}
            <WeatherWidget
              location={generatedPlan.destination}
              variant="card"
              customTitle={`${generatedPlan.destination} Live Weather & Advisory`}
              style={{ marginHorizontal: 16 }}
            />

            {/* ─── Budget Distribution (40/30/20/10) ────────────────────────── */}
            <View style={styles.budgetCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="pie-chart" size={18} color="#2563EB" />
                  <Text style={styles.sectionTitle}>Budget Distribution</Text>
                </View>
                <Text style={styles.budgetSublabel}>
                  ~{formatCurrency(generatedPlan.totalEstimatedCost / generatedPlan.durationDays, generatedPlan.currency)} / day
                </Text>
              </View>

              <View style={styles.multiProgressBar}>
                <View style={[styles.progSegment, { flex: 40, backgroundColor: "#3B82F6" }]} />
                <View style={[styles.progSegment, { flex: 30, backgroundColor: "#10B981" }]} />
                <View style={[styles.progSegment, { flex: 20, backgroundColor: "#F59E0B" }]} />
                <View style={[styles.progSegment, { flex: 10, backgroundColor: "#8B5CF6" }]} />
              </View>

              <View style={styles.budgetGrid}>
                {/* 1. Hotel (40%) */}
                <View style={styles.budgetGridItem}>
                  <View style={styles.budgetItemTop}>
                    <View style={[styles.dotIndicator, { backgroundColor: "#3B82F6" }]} />
                    <Text style={styles.budgetCategoryTitle}>Hotel (40%)</Text>
                  </View>
                  <Text style={styles.budgetCategoryAmount}>
                    {formatCurrency(
                      generatedPlan.budget?.hotel?.estimated ?? generatedPlan.totalEstimatedCost * 0.4,
                      generatedPlan.currency
                    )}
                  </Text>
                  <Text style={styles.budgetCategoryTips}>
                    {generatedPlan.budget?.hotel?.tips || "Stays & resort fees"}
                  </Text>
                </View>

                {/* 2. Transport (30%) */}
                <View style={styles.budgetGridItem}>
                  <View style={styles.budgetItemTop}>
                    <View style={[styles.dotIndicator, { backgroundColor: "#10B981" }]} />
                    <Text style={styles.budgetCategoryTitle}>Transport (30%)</Text>
                  </View>
                  <Text style={styles.budgetCategoryAmount}>
                    {formatCurrency(
                      generatedPlan.budget?.transport?.estimated ?? generatedPlan.totalEstimatedCost * 0.3,
                      generatedPlan.currency
                    )}
                  </Text>
                  <Text style={styles.budgetCategoryTips}>
                    {generatedPlan.budget?.transport?.tips || "Rides, rails & transit"}
                  </Text>
                </View>

                {/* 3. Food (20%) */}
                <View style={styles.budgetGridItem}>
                  <View style={styles.budgetItemTop}>
                    <View style={[styles.dotIndicator, { backgroundColor: "#F59E0B" }]} />
                    <Text style={styles.budgetCategoryTitle}>Food (20%)</Text>
                  </View>
                  <Text style={styles.budgetCategoryAmount}>
                    {formatCurrency(
                      generatedPlan.budget?.food?.estimated ?? generatedPlan.totalEstimatedCost * 0.2,
                      generatedPlan.currency
                    )}
                  </Text>
                  <Text style={styles.budgetCategoryTips}>
                    {generatedPlan.budget?.food?.tips || "Local culinary dining"}
                  </Text>
                </View>

                {/* 4. Activities (10%) */}
                <View style={styles.budgetGridItem}>
                  <View style={styles.budgetItemTop}>
                    <View style={[styles.dotIndicator, { backgroundColor: "#8B5CF6" }]} />
                    <Text style={styles.budgetCategoryTitle}>Activities (10%)</Text>
                  </View>
                  <Text style={styles.budgetCategoryAmount}>
                    {formatCurrency(
                      generatedPlan.budget?.activities?.estimated ?? generatedPlan.totalEstimatedCost * 0.1,
                      generatedPlan.currency
                    )}
                  </Text>
                  <Text style={styles.budgetCategoryTips}>
                    {generatedPlan.budget?.activities?.tips || "Passes & excursions"}
                  </Text>
                </View>
              </View>
            </View>

            {/* ─── Expandable Day-by-Day Cards with Editable Activities ─────── */}
            <View style={styles.itineraryHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Interactive Daily Schedule</Text>
                <Text style={styles.sectionSubtitle}>Tap pencil to edit activities, or add custom stops</Text>
              </View>
              <Badge
                status="info"
                variant="outline"
                size="sm"
                label={`${generatedPlan.days.length} Days`}
              />
            </View>

            {generatedPlan.days.map((dayItem: TripDay, dayIdx: number) => {
              const isExpanded = expandedDay === dayItem.day;
              return (
                <View key={dayItem.day} style={styles.dayCard}>
                  {/* Day Accordion Header */}
                  <TouchableOpacity
                    style={styles.dayCardHeader}
                    activeOpacity={0.7}
                    onPress={() => setExpandedDay(isExpanded ? null : dayItem.day)}
                  >
                    <View style={styles.dayHeaderLeft}>
                      <Badge
                        status="info"
                        variant="subtle"
                        size="md"
                        label={`Day ${dayItem.day}`}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dayThemeText} numberOfLines={1}>
                          {dayItem.theme}
                        </Text>
                        <Text style={styles.daySubCountText}>
                          {dayItem.activities?.length || 0} activities • {dayItem.meals?.length || 0} meal spots
                        </Text>
                      </View>
                    </View>

                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#64748B"
                    />
                  </TouchableOpacity>

                  {/* Expanded Body */}
                  {isExpanded && (
                    <View style={styles.dayExpandedBody}>
                      <View style={styles.subSectionHeaderRow}>
                        <Text style={styles.subSectionTitle}>📍 Planned Schedule & Timelines</Text>
                        <TouchableOpacity
                          style={styles.addActivityHeaderBtn}
                          onPress={() => handleAddActivity(dayIdx)}
                        >
                          <Ionicons name="add-circle" size={16} color="#2563EB" />
                          <Text style={styles.addActivityHeaderText}>Add Stop</Text>
                        </TouchableOpacity>
                      </View>

                      {dayItem.activities?.map((act, actIdx) => (
                        <View key={actIdx}>
                          {/* Travel Time Transit Connector */}
                          {actIdx > 0 && (
                            <View style={styles.transitConnectorRow}>
                              <View style={styles.transitLine} />
                              <View style={styles.transitBadge}>
                                <Ionicons name="car-outline" size={12} color="#64748B" />
                                <Text style={styles.transitText}>
                                  Estimated transit: ~{15 + (actIdx * 10) % 25} mins
                                </Text>
                              </View>
                            </View>
                          )}

                          <View style={styles.activityRow}>
                            <View style={styles.timelineCol}>
                              <View style={styles.timelineDot} />
                              {actIdx < dayItem.activities.length - 1 && (
                                <View style={styles.timelineLine} />
                              )}
                            </View>

                            <View style={styles.activityContent}>
                              <View style={styles.activityTimeRow}>
                                <View style={styles.timeAndDurationWrap}>
                                  <Text style={styles.activityTime}>{act.time}</Text>
                                  {act.duration && (
                                    <View style={styles.durationPill}>
                                      <Ionicons name="time-outline" size={10} color="#64748B" />
                                      <Text style={styles.durationPillText}>{act.duration}</Text>
                                    </View>
                                  )}
                                </View>

                                {/* Edit and Delete Action Icons */}
                                <View style={styles.activityActionsRow}>
                                  <TouchableOpacity
                                    style={styles.actActionBtn}
                                    onPress={() => handleOpenEditActivity(dayIdx, actIdx)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  >
                                    <Ionicons name="pencil" size={14} color="#2563EB" />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.actActionBtn}
                                    onPress={() => handleDeleteActivity(dayIdx, actIdx)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  >
                                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                  </TouchableOpacity>
                                </View>
                              </View>

                              <Text style={styles.activityTitle}>{act.activity}</Text>

                              <View style={styles.actLocationRow}>
                                <TouchableOpacity
                                  style={styles.actLocationWrap}
                                  onPress={() =>
                                    handleOpenMapLocation(
                                      act.coordinates?.latitude,
                                      act.coordinates?.longitude,
                                      act.location
                                    )
                                  }
                                >
                                  <Ionicons name="location-outline" size={13} color="#2563EB" />
                                  <Text style={styles.activityLocation}>{act.location}</Text>
                                </TouchableOpacity>

                                {act.estimatedCost !== undefined && act.estimatedCost > 0 && (
                                  <View style={styles.costBadge}>
                                    <Text style={styles.costBadgeText}>
                                      {formatCurrency(act.estimatedCost, generatedPlan.currency)}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {act.notes ? (
                                <Text style={styles.activityNotes}>{act.notes}</Text>
                              ) : null}
                            </View>
                          </View>
                        </View>
                      ))}

                      {/* Map Route Navigation Box */}
                      <View style={styles.mapPlaceholderBox}>
                        <View style={styles.mapHeaderRow}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Ionicons name="navigate" size={16} color="#2563EB" />
                            <Text style={styles.mapHeaderText}>Geospatial Route Map</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.openMapBtn}
                            onPress={() => {
                              const firstWithCoords = dayItem.activities.find((a) => a.coordinates);
                              handleOpenMapLocation(
                                firstWithCoords?.coordinates?.latitude,
                                firstWithCoords?.coordinates?.longitude,
                                `${generatedPlan.destination} Day ${dayItem.day}`
                              );
                            }}
                          >
                            <Text style={styles.openMapBtnText}>Open in Maps</Text>
                            <Ionicons name="open-outline" size={13} color="#2563EB" />
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.mapDescription}>
                          Connected route linking {dayItem.activities.length} pinpointed destinations in {generatedPlan.destination}.
                        </Text>
                      </View>

                      {/* Recommended Dining */}
                      {dayItem.meals && dayItem.meals.length > 0 && (
                        <View style={styles.mealsSection}>
                          <Text style={styles.subSectionTitle}>🍲 Recommended Restaurants & Dining</Text>
                          <View style={styles.mealsList}>
                            {dayItem.meals.map((meal, mealIdx) => (
                              <View key={mealIdx} style={styles.mealItem}>
                                <View style={styles.mealTypeBadge}>
                                  <Text style={styles.mealTypeText}>
                                    {meal.type.toUpperCase()}
                                  </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.mealSuggestion}>{meal.suggestion}</Text>
                                  {meal.restaurant && (
                                    <Text style={styles.mealRestaurant}>
                                      🍴 {meal.restaurant}
                                    </Text>
                                  )}
                                </View>
                                {meal.estimatedCost ? (
                                  <Text style={styles.mealCostText}>
                                    ~{formatCurrency(meal.estimatedCost, generatedPlan.currency)}
                                  </Text>
                                ) : null}
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Overnight Accommodation */}
                      {dayItem.accommodation ? (
                        <View style={styles.hotelRecommendation}>
                          <Ionicons name="bed-outline" size={16} color="#2563EB" />
                          <Text style={styles.hotelRecText}>
                            Overnight Stay: <Text style={{ fontWeight: "700" }}>{dayItem.accommodation}</Text>
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Concierge Travel Tips */}
            {generatedPlan.tips && generatedPlan.tips.length > 0 && (
              <View style={styles.tipsCard}>
                <View style={styles.tipsHeaderRow}>
                  <Ionicons name="bulb-outline" size={18} color="#D97706" />
                  <Text style={styles.tipsHeaderTitle}>Concierge Travel Tips & Etiquette</Text>
                </View>
                {generatedPlan.tips.map((tip, idx) => (
                  <View key={idx} style={styles.tipRow}>
                    <Text style={styles.tipBullet}>•</Text>
                    <Text style={styles.tipBodyText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Interactive Packing Checklist Card */}
            <View style={styles.packingCard}>
              <View style={styles.packingHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="bag-check-outline" size={20} color="#059669" />
                  <Text style={styles.packingHeaderTitle}>Smart Packing Checklist</Text>
                </View>
                <Badge
                  status={
                    packedItems.length === effectivePackingList.length &&
                    effectivePackingList.length > 0
                      ? "success"
                      : "neutral"
                  }
                  size="sm"
                  label={`${packedItems.length}/${effectivePackingList.length} Packed`}
                />
              </View>
              <Text style={styles.packingSubtitle}>
                Recommended essentials for your {generatedPlan.travelStyle} journey in{" "}
                {generatedPlan.destination}.
              </Text>

              {/* Progress Bar */}
              <View style={styles.packingProgressTrack}>
                <View
                  style={[
                    styles.packingProgressBar,
                    {
                      width: `${
                        effectivePackingList.length > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (packedItems.length / effectivePackingList.length) * 100
                              )
                            )
                          : 0
                      }%`,
                    },
                  ]}
                />
              </View>

              {/* Items List */}
              <View style={styles.packingItemsList}>
                {effectivePackingList.map((item, idx) => {
                  const isPacked = packedItems.includes(item);
                  return (
                    <TouchableOpacity
                      key={`${item}-${idx}`}
                      style={[
                        styles.packingItemRow,
                        isPacked && styles.packingItemRowChecked,
                      ]}
                      onPress={() => togglePackedItem(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isPacked ? "checkbox" : "square-outline"}
                        size={20}
                        color={isPacked ? "#059669" : "#94A3B8"}
                      />
                      <Text
                        style={[
                          styles.packingItemText,
                          isPacked && styles.packingItemTextChecked,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Add Custom Packing Item */}
              <View style={styles.addPackingItemRow}>
                <TextInput
                  style={styles.addPackingInput}
                  placeholder="Add item (e.g. Camera lenses, passport)..."
                  placeholderTextColor="#94A3B8"
                  value={customPackingInput}
                  onChangeText={setCustomPackingInput}
                  onSubmitEditing={handleAddCustomPackingItem}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={styles.addPackingBtn}
                  onPress={handleAddCustomPackingItem}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Interactive AI Travel Concierge Assistant Card */}
            <View style={styles.conciergeCard}>
              <View style={styles.conciergeHeaderRow}>
                <View style={styles.conciergeIconWrap}>
                  <Ionicons name="chatbubbles-outline" size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.conciergeHeaderTitle}>Ask AI Concierge</Text>
                  <Text style={styles.conciergeHeaderSubtitle}>
                    Instant travel advice, local etiquette & tips for {generatedPlan.destination}
                  </Text>
                </View>
              </View>

              {/* Quick Query Suggestion Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.conciergePillsScroll}
              >
                {[
                  `🌅 Best sunset spot?`,
                  `🍽️ Must-try street food?`,
                  `⚠️ Local safety & scam tips?`,
                  `🚕 Best way to get around?`,
                  `🧳 Dress code & etiquette?`,
                ].map((pill, pIdx) => (
                  <TouchableOpacity
                    key={pIdx}
                    style={styles.conciergePill}
                    onPress={() => handleAskConcierge(pill)}
                    disabled={isAskingConcierge}
                  >
                    <Text style={styles.conciergePillText}>{pill}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* AI Concierge Answer Display */}
              {isAskingConcierge ? (
                <View style={styles.conciergeLoadingWrap}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.conciergeLoadingText}>Consulting local AI guide...</Text>
                </View>
              ) : conciergeAnswer ? (
                <View style={styles.conciergeAnswerBubble}>
                  <View style={styles.conciergeAnswerHeader}>
                    <Ionicons name="sparkles" size={15} color="#2563EB" />
                    <Text style={styles.conciergeAnswerBadge}>Concierge Advice</Text>
                  </View>
                  <Text style={styles.conciergeAnswerText}>{conciergeAnswer}</Text>

                  {conciergeSuggestions.length > 0 && (
                    <View style={styles.conciergeFollowupWrap}>
                      <Text style={styles.conciergeFollowupTitle}>Related Recommendations:</Text>
                      {conciergeSuggestions.map((sug, sIdx) => (
                        <TouchableOpacity
                          key={sIdx}
                          style={styles.conciergeSugRow}
                          onPress={() => handleAskConcierge(sug)}
                        >
                          <Ionicons name="chevron-forward" size={13} color="#2563EB" />
                          <Text style={styles.conciergeSugText}>{sug}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ) : null}

              {/* Ask Question Input Bar */}
              <View style={styles.conciergeInputRow}>
                <TextInput
                  style={styles.conciergeTextInput}
                  placeholder={`Ask anything about ${generatedPlan.destination}...`}
                  placeholderTextColor="#94A3B8"
                  value={conciergeQuestion}
                  onChangeText={setConciergeQuestion}
                  onSubmitEditing={() => handleAskConcierge()}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  style={[
                    styles.conciergeSendBtn,
                    (!conciergeQuestion.trim() || isAskingConcierge) && styles.conciergeSendBtnDisabled,
                  ]}
                  onPress={() => handleAskConcierge()}
                  disabled={!conciergeQuestion.trim() || isAskingConcierge}
                >
                  <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Re-Plan Trigger */}
            <TouchableOpacity
              style={styles.replanBtn}
              onPress={() => setGeneratedPlan(null)}
            >
              <Ionicons name="options-outline" size={16} color="#64748B" />
              <Text style={styles.replanBtnText}>Modify Questionnaire & Re-plan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* VIEW C: MULTI-STEP QUESTIONNAIRE WIZARD */
          <View style={styles.wizardContainer}>
            {/* Wizard Stepper Header */}
            <View style={styles.stepperNavBar}>
              <View style={styles.stepperHeaderTop}>
                <Text style={styles.stepperStepLabel}>
                  STEP {currentStep} OF {totalWizardSteps}
                </Text>
                <Text style={styles.stepperStepName}>
                  {currentStep === 1 && "Destination & Departure"}
                  {currentStep === 2 && "Duration & Date Range"}
                  {currentStep === 3 && "Traveler Composition"}
                  {currentStep === 4 && "Budget Range & Optimization"}
                  {currentStep === 5 && "Activity Preferences & Vibes"}
                </Text>
              </View>

              <View style={styles.stepperProgressRow}>
                {[1, 2, 3, 4, 5].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.stepperSegment,
                      st <= currentStep && styles.stepperSegmentActive,
                    ]}
                    onPress={() => setCurrentStep(st)}
                  />
                ))}
              </View>
            </View>

            {/* STEP 1: DESTINATION & DEPARTURE */}
            {currentStep === 1 && (
              <View style={styles.wizardCard}>
                <View style={styles.stepTitleRow}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <View>
                    <Text style={styles.stepTitle}>Where are you traveling?</Text>
                    <Text style={styles.stepSubtitle}>Choose destination and departure city</Text>
                  </View>
                </View>

                {/* Destination Selector */}
                <TouchableOpacity
                  style={styles.fieldBox}
                  activeOpacity={0.8}
                  onPress={() => setShowDestModal(true)}
                >
                  <View style={styles.fieldLeft}>
                    <Ionicons name="location-sharp" size={20} color="#2563EB" />
                    <View>
                      <Text style={styles.fieldSublabel}>Destination City / Island</Text>
                      <Text style={styles.fieldValText}>{destination}</Text>
                    </View>
                  </View>
                  <Ionicons name="search" size={18} color="#94A3B8" />
                </TouchableOpacity>

                {/* Popular Destination Quick Chips */}
                <Text style={styles.chipsLabel}>Trending Destinations:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {DESTINATION_CATALOG.slice(0, 10).map((dest) => {
                    const isSelected = destination.toLowerCase() === dest.name.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={dest.name}
                        style={[styles.destChip, isSelected && styles.destChipSelected]}
                        onPress={() => setDestination(dest.name)}
                      >
                        <Ionicons
                          name={dest.icon}
                          size={14}
                          color={isSelected ? "#FFFFFF" : "#2563EB"}
                        />
                        <Text style={[styles.destChipText, isSelected && styles.destChipTextSelected]}>
                          {dest.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Starting From Origin */}
                <View style={[styles.fieldBox, { marginTop: 14 }]}>
                  <View style={styles.fieldLeft}>
                    <Ionicons name="navigate-outline" size={20} color="#64748B" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldSublabel}>Starting Departure City</Text>
                      <TextInput
                        style={styles.inlineTextInput}
                        value={origin}
                        onChangeText={setOrigin}
                        placeholder="e.g. Dhaka, Chittagong, Sylhet..."
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>
                </View>

                {/* Quick Origin Suggestions */}
                <View style={styles.originChipsRow}>
                  {ORIGIN_SUGGESTIONS.slice(0, 4).map((org) => (
                    <TouchableOpacity
                      key={org}
                      style={[styles.originMiniChip, origin === org && styles.originMiniChipActive]}
                      onPress={() => setOrigin(org)}
                    >
                      <Text
                        style={[
                          styles.originMiniChipText,
                          origin === org && styles.originMiniChipTextActive,
                        ]}
                      >
                        {org}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* STEP 2: DURATION & DATES */}
            {currentStep === 2 && (
              <View style={styles.wizardCard}>
                <View style={styles.stepTitleRow}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View>
                    <Text style={styles.stepTitle}>How long is your trip?</Text>
                    <Text style={styles.stepSubtitle}>Schedule and duration pacing</Text>
                  </View>
                </View>

                {/* Estimated Dates Box */}
                <View style={styles.dateRangeBox}>
                  <Ionicons name="calendar" size={18} color="#2563EB" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dateRangeLabel}>Estimated Trip Dates</Text>
                    <Text style={styles.dateRangeValue}>{formattedDateRange}</Text>
                  </View>
                  <Badge status="info" size="sm" label={`${durationDays} Days`} />
                </View>

                {/* Duration Presets */}
                <View style={styles.durationPresetsGrid}>
                  {DURATION_PRESETS.map((dp) => {
                    const isSelected = durationDays === dp.days;
                    return (
                      <TouchableOpacity
                        key={dp.days}
                        style={[styles.durationCard, isSelected && styles.durationCardSelected]}
                        onPress={() => handleDurationChange(dp.days)}
                      >
                        <Text style={[styles.durationDaysText, isSelected && styles.textWhite]}>
                          {dp.label}
                        </Text>
                        <Text style={[styles.durationSubText, isSelected && styles.textWhite70]}>
                          {dp.subtitle}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Stepper Controls */}
                <View style={styles.stepperRow}>
                  <View>
                    <Text style={styles.stepperLabel}>Custom Days Count</Text>
                    <Text style={styles.stepperSublabel}>Between 1 to 21 days</Text>
                  </View>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => handleDurationChange(durationDays - 1)}
                    >
                      <Ionicons name="remove" size={18} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.stepperValText}>{durationDays} Days</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => handleDurationChange(durationDays + 1)}
                    >
                      <Ionicons name="add" size={18} color="#1E293B" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* STEP 3: TRAVELER COMPOSITION & STYLE */}
            {currentStep === 3 && (
              <View style={styles.wizardCard}>
                <View style={styles.stepTitleRow}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <View>
                    <Text style={styles.stepTitle}>Who is traveling & what style?</Text>
                    <Text style={styles.stepSubtitle}>Tailor pacing, hotels, and group dynamics</Text>
                  </View>
                </View>

                {/* Number of Travelers Counter */}
                <View style={[styles.stepperRow, { marginTop: 0, marginBottom: 14, borderTopWidth: 0 }]}>
                  <View>
                    <Text style={styles.stepperLabel}>Number of Guests</Text>
                    <Text style={styles.stepperSublabel}>Adults and companions</Text>
                  </View>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => handleTravelersChange(travelers - 1)}
                    >
                      <Ionicons name="remove" size={18} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.stepperValText}>{travelers} People</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => handleTravelersChange(travelers + 1)}
                    >
                      <Ionicons name="add" size={18} color="#1E293B" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Travel Style Options */}
                <View style={styles.stylesList}>
                  {TRAVEL_STYLES.map((style) => {
                    const isSelected = travelStyle === style.id;
                    return (
                      <TouchableOpacity
                        key={style.id}
                        style={[styles.styleOptionCard, isSelected && styles.styleOptionSelected]}
                        onPress={() => handleStyleSelect(style)}
                      >
                        <View style={[styles.styleIconBox, isSelected && styles.styleIconBoxSelected]}>
                          <Ionicons
                            name={style.icon}
                            size={20}
                            color={isSelected ? "#FFFFFF" : "#2563EB"}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.styleTitle, isSelected && styles.styleTitleSelected]}>
                            {style.label}
                          </Text>
                          <Text style={styles.styleDesc}>{style.desc}</Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={22} color="#2563EB" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* STEP 4: BUDGET RANGE & LIVE OPTIMIZATION */}
            {currentStep === 4 && (
              <View style={styles.wizardCard}>
                <View style={styles.stepTitleRow}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                  <View>
                    <Text style={styles.stepTitle}>Budget Range & Optimization</Text>
                    <Text style={styles.stepSubtitle}>Live 40/30/20/10 distribution preview</Text>
                  </View>
                </View>

                {/* Currency Toggle */}
                <View style={styles.currencyToggleRow}>
                  <Text style={styles.fieldSublabel}>Preferred Currency:</Text>
                  <View style={styles.currencyToggleBox}>
                    <TouchableOpacity
                      style={[styles.currencyPill, currency === "BDT" && styles.currencyPillActive]}
                      onPress={() => handleCurrencyChange("BDT")}
                    >
                      <Text
                        style={[
                          styles.currencyPillText,
                          currency === "BDT" && styles.currencyPillTextActive,
                        ]}
                      >
                        BDT (৳)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.currencyPill, currency === "USD" && styles.currencyPillActive]}
                      onPress={() => handleCurrencyChange("USD")}
                    >
                      <Text
                        style={[
                          styles.currencyPillText,
                          currency === "USD" && styles.currencyPillTextActive,
                        ]}
                      >
                        USD ($)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Budget Tiers */}
                <View style={styles.budgetTiersGrid}>
                  {BUDGET_TIERS.map((tier) => {
                    const isSelected = budgetLevel === tier.id;
                    const calculatedAmount = calculateTierBudget(tier.id, currency, durationDays, travelers);
                    return (
                      <TouchableOpacity
                        key={tier.id}
                        style={[styles.budgetTierCard, isSelected && styles.budgetTierSelected]}
                        onPress={() => handleBudgetTierSelect(tier.id)}
                      >
                        <Text style={[styles.budgetTierName, isSelected && styles.textBlue]}>
                          {tier.label}
                        </Text>
                        <Text style={styles.budgetTierSub}>
                          {formatCurrency(calculatedAmount, currency)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Budget Input */}
                <View style={styles.totalBudgetInputBox}>
                  <Text style={styles.currencySymbolText}>{currency === "BDT" ? "৳" : "$"}</Text>
                  <TextInput
                    style={styles.totalBudgetInput}
                    keyboardType="numeric"
                    value={String(totalBudget)}
                    onChangeText={(val) => {
                      const num = parseInt(val.replace(/[^0-9]/g, ""), 10) || 0;
                      setTotalBudget(num);
                      setBudgetLevel("custom");
                    }}
                    placeholder="Total trip budget"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Live 40/30/20/10 Breakdown Preview */}
                <View style={styles.liveAllocContainer}>
                  <View style={styles.liveAllocHeader}>
                    <Ionicons name="calculator-outline" size={15} color="#2563EB" />
                    <Text style={styles.liveAllocHeaderText}>
                      Smart 40/30/20/10 Allocation Preview
                    </Text>
                  </View>

                  <View style={styles.multiProgressBar}>
                    <View style={[styles.progSegment, { flex: 40, backgroundColor: "#3B82F6" }]} />
                    <View style={[styles.progSegment, { flex: 30, backgroundColor: "#10B981" }]} />
                    <View style={[styles.progSegment, { flex: 20, backgroundColor: "#F59E0B" }]} />
                    <View style={[styles.progSegment, { flex: 10, backgroundColor: "#8B5CF6" }]} />
                  </View>

                  <View style={styles.liveAllocRow}>
                    <Text style={styles.liveAllocLabel}>🏨 Hotel (40%):</Text>
                    <Text style={styles.liveAllocValue}>
                      {formatCurrency(liveBudgetBreakdown.hotel.estimated, currency)}
                    </Text>
                  </View>
                  <View style={styles.liveAllocRow}>
                    <Text style={styles.liveAllocLabel}>🚆 Transport (30%):</Text>
                    <Text style={styles.liveAllocValue}>
                      {formatCurrency(liveBudgetBreakdown.transport.estimated, currency)}
                    </Text>
                  </View>
                  <View style={styles.liveAllocRow}>
                    <Text style={styles.liveAllocLabel}>🍲 Food (20%):</Text>
                    <Text style={styles.liveAllocValue}>
                      {formatCurrency(liveBudgetBreakdown.food.estimated, currency)}
                    </Text>
                  </View>
                  <View style={styles.liveAllocRow}>
                    <Text style={styles.liveAllocLabel}>🎟️ Activities (10%):</Text>
                    <Text style={styles.liveAllocValue}>
                      {formatCurrency(liveBudgetBreakdown.activities.estimated, currency)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* STEP 5: ACTIVITY PREFERENCES & RECAP */}
            {currentStep === 5 && (
              <View style={styles.wizardCard}>
                <View style={styles.stepTitleRow}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>5</Text>
                  </View>
                  <View>
                    <Text style={styles.stepTitle}>Activity Preferences & Vibes</Text>
                    <Text style={styles.stepSubtitle}>Select what you love doing most</Text>
                  </View>
                </View>

                {/* Interest Chips */}
                <View style={styles.interestsGrid}>
                  {INTEREST_OPTIONS.map((item) => {
                    const isSelected = selectedInterests.includes(item.label);
                    return (
                      <TouchableOpacity
                        key={item.label}
                        style={[styles.interestChip, isSelected && styles.interestChipSelected]}
                        onPress={() => toggleInterest(item.label)}
                      >
                        <Ionicons
                          name={item.icon as any}
                          size={16}
                          color={isSelected ? "#FFFFFF" : "#1E293B"}
                        />
                        <Text
                          style={[
                            styles.interestChipText,
                            isSelected && styles.interestChipTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Notes */}
                <Text style={[styles.chipsLabel, { marginTop: 16 }]}>Special Requests / Notes (Optional):</Text>
                <TextInput
                  style={styles.customNotesInput}
                  multiline
                  numberOfLines={3}
                  value={customNotes}
                  onChangeText={setCustomNotes}
                  placeholder="e.g. Vegetarian food preferences, morning photography focus, avoid steep climbs..."
                  placeholderTextColor="#94A3B8"
                />

                {/* Blueprint Summary Box */}
                <View style={styles.wizardReviewBox}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={16} color="#2563EB" />
                    <Text style={styles.reviewBoxTitle}>Itinerary Blueprint</Text>
                  </View>
                  <Text style={styles.reviewBoxText}>
                    📍 {origin} ➔ {destination} • 📅 {durationDays} Days ({formattedDateRange}) • 👥 {travelers} Guests • 💰 {formatCurrency(totalBudget, currency)}
                  </Text>
                </View>
              </View>
            )}

            {/* Wizard Navigation Footer */}
            <View style={styles.wizardNavButtonsRow}>
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  size="lg"
                  label="Back"
                  leftIcon={<Ionicons name="arrow-back" size={18} color="#2563EB" />}
                  onPress={() => setCurrentStep(currentStep - 1)}
                  style={{ flex: 1 }}
                />
              )}

              {currentStep < totalWizardSteps ? (
                <TouchableOpacity
                  style={[styles.nextStepBtn, { flex: 2 }]}
                  disabled={!canGoNext()}
                  onPress={() => setCurrentStep(currentStep + 1)}
                >
                  <LinearGradient
                    colors={["#2563EB", "#3B82F6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.nextStepBtnGradient}
                  >
                    <Text style={styles.nextStepBtnText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryActionButton, { flex: 2 }]}
                  activeOpacity={0.85}
                  onPress={handleGenerateItinerary}
                >
                  <LinearGradient
                    colors={["#2563EB", "#4F46E5", "#7C3AED"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButtonGradient}
                  >
                    <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Generate Itinerary</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ─── STICKY BOTTOM BAR: ONE-TAP "BOOK ENTIRE ITINERARY" ───────────── */}
      {generatedPlan && !isGenerating && (
        <View style={[styles.bottomStickyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button
            variant="outline"
            size="md"
            label="Share"
            leftIcon={<Ionicons name="share-outline" size={18} color="#2563EB" />}
            onPress={handleShareItinerary}
          />

          <TouchableOpacity
            style={styles.primaryBookItineraryBtn}
            activeOpacity={0.85}
            onPress={handleBookEntireItinerary}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBookItineraryGradient}
            >
              <Ionicons name="bag-check" size={20} color="#FFFFFF" />
              <View>
                <Text style={styles.primaryBookItineraryText}>Book Entire Itinerary</Text>
                <Text style={styles.primaryBookItinerarySub}>
                  {formatCurrency(generatedPlan.totalEstimatedCost, generatedPlan.currency)} • Instant Checkout
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── MODAL: EDIT ACTIVITY CARD ────────────────────────────────────── */}
      <Modal
        visible={Boolean(editingActivity)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingActivity(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.editModalSheet}>
              <View style={styles.sheetHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="create-outline" size={22} color="#2563EB" />
                  <Text style={styles.sheetTitle}>Edit Activity Details</Text>
                </View>
                <TouchableOpacity onPress={() => setEditingActivity(null)}>
                  <Ionicons name="close-circle" size={26} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {editingActivity && (
                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  <Text style={styles.inputLabel}>Activity Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editingActivity.activity}
                    onChangeText={(val) =>
                      setEditingActivity({ ...editingActivity, activity: val })
                    }
                    placeholder="Activity Title"
                  />

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Time / Schedule</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editingActivity.time}
                        onChangeText={(val) =>
                          setEditingActivity({ ...editingActivity, time: val })
                        }
                        placeholder="e.g. 09:30 AM"
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Duration / Transit</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editingActivity.duration}
                        onChangeText={(val) =>
                          setEditingActivity({ ...editingActivity, duration: val })
                        }
                        placeholder="e.g. 2 hours"
                      />
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Location Landmark</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editingActivity.location}
                    onChangeText={(val) =>
                      setEditingActivity({ ...editingActivity, location: val })
                    }
                    placeholder="Location or Address"
                  />

                  <Text style={styles.inputLabel}>
                    Estimated Cost ({currency === "BDT" ? "৳ BDT" : "$ USD"})
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={editingActivity.estimatedCost}
                    onChangeText={(val) =>
                      setEditingActivity({ ...editingActivity, estimatedCost: val })
                    }
                    placeholder="Cost amount"
                  />

                  <Text style={styles.inputLabel}>Notes & Tips</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 60 }]}
                    multiline
                    value={editingActivity.notes}
                    onChangeText={(val) =>
                      setEditingActivity({ ...editingActivity, notes: val })
                    }
                    placeholder="Special instructions or tips..."
                  />
                </ScrollView>
              )}

              <View style={styles.modalActionButtonsRow}>
                <Button
                  variant="outline"
                  size="md"
                  label="Cancel"
                  onPress={() => setEditingActivity(null)}
                  style={{ flex: 1 }}
                />
                <Button
                  variant="primary"
                  size="md"
                  label="Save Changes"
                  leftIcon={<Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                  onPress={handleSaveEditedActivity}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── MODAL: DESTINATION SELECTOR ──────────────────────────────────── */}
      <Modal
        visible={showDestModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Destination</Text>
              <TouchableOpacity onPress={() => setShowDestModal(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.sheetSearchBox}>
              <Ionicons name="search" size={20} color="#64748B" />
              <TextInput
                style={styles.sheetSearchInput}
                placeholder="Type any city, island, or region..."
                placeholderTextColor="#94A3B8"
                value={customDestInput}
                onChangeText={setCustomDestInput}
                autoFocus
              />
              {customDestInput.trim().length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setDestination(customDestInput.trim());
                    setShowDestModal(false);
                    setCustomDestInput("");
                  }}
                >
                  <Text style={styles.selectTextBtn}>Select</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Custom Destination Fast Pick */}
            {customDestInput.trim().length > 0 &&
              !DESTINATION_CATALOG.some(
                (d) => d.name.toLowerCase() === customDestInput.trim().toLowerCase()
              ) && (
                <TouchableOpacity
                  style={styles.customPickRow}
                  onPress={() => {
                    setDestination(customDestInput.trim());
                    setShowDestModal(false);
                    setCustomDestInput("");
                  }}
                >
                  <Ionicons name="add-circle" size={20} color="#2563EB" />
                  <Text style={styles.customPickText}>
                    Use custom destination: "{customDestInput.trim()}"
                  </Text>
                </TouchableOpacity>
              )}

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {DESTINATION_CATALOG.filter(
                (d) =>
                  d.name.toLowerCase().includes(customDestInput.toLowerCase()) ||
                  d.country.toLowerCase().includes(customDestInput.toLowerCase()) ||
                  d.tag.toLowerCase().includes(customDestInput.toLowerCase())
              ).map((d) => (
                <TouchableOpacity
                  key={d.name}
                  style={styles.destListRow}
                  onPress={() => {
                    setDestination(d.name);
                    setShowDestModal(false);
                    setCustomDestInput("");
                  }}
                >
                  <View style={styles.destListIcon}>
                    <Ionicons name={d.icon} size={20} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.destListName}>{d.name}</Text>
                    <Text style={styles.destListCountry}>{d.country} • {d.tag}</Text>
                  </View>
                  {destination.toLowerCase() === d.name.toLowerCase() && (
                    <Ionicons name="checkmark-circle" size={22} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: SAVED ITINERARIES SHEET ──────────────────────────────── */}
      <Modal
        visible={showSavedModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSavedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="bookmark" size={22} color="#2563EB" />
                <Text style={styles.sheetTitle}>Saved Itineraries ({savedPlans.length})</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSavedModal(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {savedPlans.length === 0 ? (
              <View style={styles.emptySavedWrap}>
                <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptySavedTitle}>No Saved Itineraries Yet</Text>
                <Text style={styles.emptySavedSubtitle}>
                  Generate any customized trip plan and tap the bookmark icon at the top to save it for offline review and one-tap checkout.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {savedPlans.map((plan, pIdx) => (
                  <View key={plan.id || pIdx} style={styles.savedPlanCard}>
                    <View style={styles.savedPlanCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.savedPlanTitle}>
                          {plan.title || `${plan.destination} Tour`}
                        </Text>
                        <Text style={styles.savedPlanMeta}>
                          {plan.durationDays} Days • {plan.travelStyle?.toUpperCase()} •{" "}
                          {formatCurrency(plan.totalEstimatedCost, plan.currency)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.savedPlanDeleteBtn}
                        onPress={() => plan.id && handleDeleteSavedPlan(plan.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.savedPlanSummary} numberOfLines={2}>
                      {plan.summary}
                    </Text>

                    <TouchableOpacity
                      style={styles.savedPlanOpenBtn}
                      onPress={() => handleOpenSavedPlan(plan)}
                    >
                      <Text style={styles.savedPlanOpenBtnText}>Open Itinerary</Text>
                      <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: WEATHER & SOLAR POSITION DETAILS ─────────────────────── */}
      <Modal
        visible={showWeatherDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWeatherDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "88%" }]}>
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="partly-sunny" size={22} color="#D97706" />
                <Text style={styles.sheetTitle}>Weather &amp; Solar Optimization</Text>
              </View>
              <TouchableOpacity onPress={() => setShowWeatherDetailsModal(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {/* Solar Position Table Card */}
              <View style={styles.modalSectionCard}>
                <View style={styles.modalSectionHeaderRow}>
                  <Ionicons name="sunny" size={18} color="#D97706" />
                  <Text style={styles.modalSectionTitle}>Solar Position Tables</Text>
                </View>
                <Text style={styles.modalSectionSub}>
                  Astronomical solar declination &amp; hour angles calculated for {generatedPlan?.destination || "Destination"}
                </Text>

                {activeOptimization?.solarPositions &&
                  Object.entries(activeOptimization.solarPositions).map(([dayKey, pos]) => (
                    <View key={dayKey} style={styles.solarDayCard}>
                      <View style={styles.solarDayTop}>
                        <Text style={styles.solarDayTitle}>Day {dayKey} ({pos.date})</Text>
                        <Badge
                          status="info"
                          size="sm"
                          label={`Lat: ${pos.latitude.toFixed(2)}°, Lon: ${pos.longitude.toFixed(2)}°`}
                        />
                      </View>
                      <View style={styles.solarTimesGrid}>
                        <View style={styles.solarTimeBox}>
                          <Text style={styles.solarTimeLabel}>Sunrise</Text>
                          <Text style={styles.solarTimeVal}>{pos.sunriseTime}</Text>
                        </View>
                        <View style={styles.solarTimeBox}>
                          <Text style={styles.solarTimeLabel}>Sunset</Text>
                          <Text style={styles.solarTimeVal}>{pos.sunsetTime}</Text>
                        </View>
                        <View style={styles.solarTimeBox}>
                          <Text style={styles.solarTimeLabel}>Morning Golden Hour</Text>
                          <Text style={styles.solarTimeVal}>{pos.morningGoldenHour.start} - {pos.morningGoldenHour.end}</Text>
                        </View>
                        <View style={styles.solarTimeBox}>
                          <Text style={styles.solarTimeLabel}>Evening Golden Hour</Text>
                          <Text style={styles.solarTimeVal}>{pos.eveningGoldenHour.start} - {pos.eveningGoldenHour.end}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
              </View>

              {/* Hourly Precipitation Forecast Card */}
              <View style={styles.modalSectionCard}>
                <View style={styles.modalSectionHeaderRow}>
                  <Ionicons name="rainy" size={18} color="#2563EB" />
                  <Text style={styles.modalSectionTitle}>Precipitation Forecast &amp; Rain Warnings</Text>
                </View>
                <Text style={styles.modalSectionSub}>
                  Outdoor attractions with precipitation probability &gt; 70% automatically swapped for indoor activities.
                </Text>

                {activeOptimization?.weatherForecasts.map((wf) => (
                  <View key={wf.day} style={styles.weatherDayCard}>
                    <View style={styles.weatherDayHeader}>
                      <Text style={styles.weatherDayName}>Day {wf.day} ({wf.date})</Text>
                      {wf.isInclement ? (
                        <Badge
                          status="error"
                          size="sm"
                          label="Inclement Weather"
                          icon={<Ionicons name="warning" size={10} color="#EF4444" />}
                        />
                      ) : (
                        <Badge status="success" size="sm" label="Fair &amp; Clear" />
                      )}
                    </View>
                    <Text style={styles.weatherConditionText}>{wf.condition}</Text>

                    <View style={styles.hourlyList}>
                      {wf.hourly.map((h, hIdx) => (
                        <View
                          key={hIdx}
                          style={[
                            styles.hourlyRow,
                            h.precipitationProbability > 70 && styles.hourlyRowAlert,
                          ]}
                        >
                          <Text style={styles.hourlyTime}>{h.time}</Text>
                          <Text style={styles.hourlyCondition}>{h.condition}</Text>
                          <View style={styles.hourlyPopWrap}>
                            <Text
                              style={[
                                styles.hourlyPop,
                                h.precipitationProbability > 70 && styles.hourlyPopHigh,
                              ]}
                            >
                              {h.precipitationProbability}%
                            </Text>
                            {h.precipitationProbability > 70 && (
                              <Ionicons name="alert-circle" size={13} color="#DC2626" />
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {/* Applied Modifications List */}
              {activeOptimization?.modifications && activeOptimization.modifications.length > 0 && (
                <View style={styles.modalSectionCard}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="git-compare" size={18} color="#059669" />
                    <Text style={styles.modalSectionTitle}>Itinerary Restructuring Log</Text>
                  </View>
                  {activeOptimization.modifications.map((m, mIdx) => (
                    <View key={mIdx} style={styles.modCard}>
                      <View style={styles.modTopRow}>
                        <Badge
                          status={m.type === "weather_swap" ? "error" : "warning"}
                          size="sm"
                          label={m.type === "weather_swap" ? "RAIN PROTECTION SWAP" : "GOLDEN HOUR OPTIMIZATION"}
                        />
                        <Text style={styles.modDay}>Day {m.day}</Text>
                      </View>
                      <Text style={styles.modOriginal}>Original: {m.originalActivity.activity} ({m.originalActivity.time})</Text>
                      <Text style={styles.modNew}>Restructured: {m.newActivity.activity} ({m.newActivity.time})</Text>
                      <Text style={styles.modReason}>{m.reason}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* State Synchronization Note */}
              <View style={styles.syncNoticeCard}>
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
                <Text style={styles.syncNoticeText}>
                  State Synchronization: Updates sync with useBookingStore while preserving active booking references and draft IDs.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowWeatherDetailsModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerBackgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 240,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  /* Top Header */
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },

  /* Wizard Stepper Header */
  stepperNavBar: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  stepperHeaderTop: {
    marginBottom: 10,
  },
  stepperStepLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2563EB",
    letterSpacing: 0.8,
  },
  stepperStepName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  stepperProgressRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  stepperSegment: {
    flex: 1,
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
  },
  stepperSegmentActive: {
    backgroundColor: "#2563EB",
  },

  /* Wizard Form Card */
  wizardContainer: {
    gap: 16,
  },
  wizardCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  stepSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },

  /* Field Box */
  fieldBox: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
  },
  fieldLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  fieldSublabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  fieldValText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  inlineTextInput: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    padding: 0,
    marginTop: 2,
  },

  /* Chips */
  chipsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 14,
    marginBottom: 8,
  },
  chipsScroll: {
    flexDirection: "row",
  },
  destChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  destChipSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  destChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  destChipTextSelected: {
    color: "#FFFFFF",
  },
  originChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  originMiniChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  originMiniChipActive: {
    backgroundColor: "#2563EB",
  },
  originMiniChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  originMiniChipTextActive: {
    color: "#FFFFFF",
  },

  /* Date Range Box */
  dateRangeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  dateRangeLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  dateRangeValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E40AF",
    marginTop: 1,
  },

  /* Duration Presets */
  durationPresetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  durationCard: {
    flex: 1,
    minWidth: "28%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  durationCardSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  durationDaysText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  durationSubText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  textWhite: {
    color: "#FFFFFF",
  },
  textWhite70: {
    color: "rgba(255, 255, 255, 0.8)",
  },

  /* Steppers */
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  stepperLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  stepperSublabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    minWidth: 60,
    textAlign: "center",
  },

  /* Travel Styles */
  stylesList: {
    gap: 10,
  },
  styleOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  styleOptionSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  styleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  styleIconBoxSelected: {
    backgroundColor: "#2563EB",
  },
  styleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  styleTitleSelected: {
    color: "#1E40AF",
  },
  styleDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },

  /* Currency & Budget */
  currencyToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  currencyToggleBox: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
  },
  currencyPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currencyPillActive: {
    backgroundColor: "#2563EB",
  },
  currencyPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  currencyPillTextActive: {
    color: "#FFFFFF",
  },
  budgetTiersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  budgetTierCard: {
    flex: 1,
    minWidth: "22%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  budgetTierSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  budgetTierName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  textBlue: {
    color: "#2563EB",
  },
  budgetTierSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  totalBudgetInputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: "#FFFFFF",
  },
  currencySymbolText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
    marginRight: 6,
  },
  totalBudgetInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },

  /* Live Allocation Preview Box */
  liveAllocContainer: {
    marginTop: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  liveAllocHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  liveAllocHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    textTransform: "uppercase",
  },
  liveAllocRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  liveAllocLabel: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  liveAllocValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  /* Interests Grid */
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  interestChipSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  interestChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  interestChipTextSelected: {
    color: "#FFFFFF",
  },
  customNotesInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#F8FAFC",
    fontSize: 13,
    color: "#0F172A",
    textAlignVertical: "top",
    marginTop: 4,
  },
  wizardReviewBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  reviewBoxTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E40AF",
    letterSpacing: 0.4,
  },
  reviewBoxText: {
    fontSize: 13,
    color: "#1E293B",
    marginTop: 4,
    lineHeight: 18,
  },

  /* Wizard Navigation Buttons */
  wizardNavButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  nextStepBtn: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  nextStepBtnGradient: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextStepBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  primaryActionButton: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonGradient: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  /* Loading State & Trivia */
  loadingContainer: {
    paddingTop: 12,
    gap: 16,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#2563EB",
    borderRadius: 3,
  },
  triviaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  triviaHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  triviaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  triviaBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563EB",
    letterSpacing: 0.5,
  },
  triviaCounterText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  triviaBodyRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  triviaIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  triviaFactText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    lineHeight: 22,
    flex: 1,
  },
  generationStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  generationStatusText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    flex: 1,
  },

  /* Results View */
  resultContainer: {
    gap: 16,
  },
  heroBanner: {
    borderRadius: 24,
    padding: 20,
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroPillLight: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  heroPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  heroSummary: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 8,
    lineHeight: 20,
  },
  heroCostRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
  },
  heroCostLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  heroCostValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  /* Budget Card */
  budgetCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  budgetSublabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  multiProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    flexDirection: "row",
    marginVertical: 10,
  },
  progSegment: {
    height: 8,
  },
  budgetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  budgetGridItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  budgetItemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  budgetCategoryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  budgetCategoryAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginVertical: 4,
  },
  budgetCategoryTips: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
  },

  /* Day-by-Day Cards */
  itineraryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  dayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  dayCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  dayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  dayThemeText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  daySubCountText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  dayExpandedBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FCFDFE",
  },
  subSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  addActivityHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },
  addActivityHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  /* Transit connector */
  transitConnectorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    marginVertical: 4,
    gap: 10,
  },
  transitLine: {
    width: 2,
    height: 16,
    backgroundColor: "#CBD5E1",
  },
  transitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  transitText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },

  /* Activity Row */
  activityRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  timelineCol: {
    width: 20,
    alignItems: "center",
    marginRight: 8,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E2E8F0",
    marginTop: 4,
  },
  activityContent: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  activityTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  timeAndDurationWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activityTime: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationPillText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  activityActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actActionBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: "#F8FAFC",
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginVertical: 2,
  },
  actLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  actLocationWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  activityLocation: {
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
    flex: 1,
  },
  costBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  costBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  activityNotes: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
    fontStyle: "italic",
    lineHeight: 16,
  },

  /* Map Placeholder Box */
  mapPlaceholderBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  mapHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mapHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E40AF",
  },
  openMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  openMapBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  mapDescription: {
    fontSize: 12,
    color: "#475569",
    marginTop: 6,
  },

  /* Meals Section */
  mealsSection: {
    marginTop: 14,
  },
  mealsList: {
    gap: 8,
    marginTop: 8,
  },
  mealItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  mealTypeBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mealTypeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
  },
  mealSuggestion: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  mealRestaurant: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  mealCostText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981",
  },

  /* Hotel Recommendation */
  hotelRecommendation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  hotelRecText: {
    fontSize: 12,
    color: "#1E40AF",
    flex: 1,
  },

  /* Tips Card */
  tipsCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  tipsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tipsHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400E",
  },
  tipRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  tipBullet: {
    fontSize: 14,
    color: "#B45309",
    marginRight: 6,
  },
  tipBodyText: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 18,
    flex: 1,
  },

  /* Re-plan Button */
  replanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  replanBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },

  /* Bottom Sticky Bar & One-Tap Checkout */
  bottomStickyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryBookItineraryBtn: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBookItineraryGradient: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  primaryBookItineraryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  primaryBookItinerarySub: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 10,
    fontWeight: "600",
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  editModalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    gap: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  modalActionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  sheetSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 14,
    backgroundColor: "#F8FAFC",
  },
  sheetSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#0F172A",
  },
  selectTextBtn: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  customPickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  customPickText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
    flex: 1,
  },
  destListRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  destListIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  destListName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  destListCountry: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },

  /* Header Actions & Badges */
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircleButtonActive: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#93C5FD",
  },
  headerBadgeDot: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#2563EB",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  headerBadgeDotText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  /* Smart Packing Checklist */
  packingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 14,
  },
  packingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  packingHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  packingSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 10,
  },
  packingProgressTrack: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  packingProgressBar: {
    height: "100%",
    backgroundColor: "#059669",
    borderRadius: 3,
  },
  packingItemsList: {
    gap: 8,
  },
  packingItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
  },
  packingItemRowChecked: {
    backgroundColor: "#ECFDF5",
  },
  packingItemText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
    flex: 1,
  },
  packingItemTextChecked: {
    color: "#059669",
    textDecorationLine: "line-through",
  },
  addPackingItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  addPackingInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  addPackingBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Interactive Concierge Card */
  conciergeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginTop: 14,
  },
  conciergeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  conciergeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  conciergeHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  conciergeHeaderSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  conciergePillsScroll: {
    gap: 8,
    paddingBottom: 10,
  },
  conciergePill: {
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  conciergePillText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
  },
  conciergeLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    marginBottom: 10,
  },
  conciergeLoadingText: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "600",
  },
  conciergeAnswerBubble: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  conciergeAnswerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  conciergeAnswerBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  conciergeAnswerText: {
    fontSize: 13,
    color: "#1E293B",
    lineHeight: 19,
  },
  conciergeFollowupWrap: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#BFDBFE",
    gap: 6,
  },
  conciergeFollowupTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF",
    textTransform: "uppercase",
  },
  conciergeSugRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  conciergeSugText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },
  conciergeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  conciergeTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  conciergeSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  conciergeSendBtnDisabled: {
    backgroundColor: "#94A3B8",
  },

  /* Saved Plans Modal */
  emptySavedWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptySavedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginTop: 4,
  },
  emptySavedSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  savedPlanCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  savedPlanCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  savedPlanTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  savedPlanMeta: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
    marginTop: 2,
  },
  savedPlanDeleteBtn: {
    padding: 6,
  },
  savedPlanSummary: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
    marginBottom: 10,
    lineHeight: 16,
  },
  savedPlanOpenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 8,
  },
  savedPlanOpenBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* ─── Weather Adaptive Planner & Golden Hour Styles ─── */
  weatherAlertBannerWrap: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  weatherAlertBannerGradient: {
    padding: 16,
  },
  weatherAlertHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  weatherAlertIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    alignItems: "center",
    justifyContent: "center",
  },
  weatherAlertHeaderTextWrap: {
    flex: 1,
  },
  weatherAlertBadgesLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  solarPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FDE68A",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  solarPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400E",
    letterSpacing: 0.3,
  },
  weatherAlertHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#78350F",
  },
  weatherAlertMessageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
    lineHeight: 20,
    marginBottom: 12,
  },
  weatherAlertDetailsBox: {
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  weatherDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  weatherDetailText: {
    flex: 1,
    fontSize: 12,
    color: "#78350F",
    lineHeight: 16,
  },
  boldText: {
    fontWeight: "700",
    color: "#451A03",
  },
  weatherAlertActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  weatherAlertAcceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#059669",
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  weatherAlertAcceptBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  weatherAlertKeepBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D97706",
    paddingVertical: 10,
    borderRadius: 10,
  },
  weatherAlertKeepBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#78350F",
  },
  weatherAlertInfoBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F59E0B",
  },

  /* Weather-Optimized Pill Bar (Shown when active) */
  weatherOptimizedPillBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  weatherOptimizedPillLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  weatherOptimizedPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
  },
  weatherViewDataLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  weatherViewDataLinkText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },

  /* Weather & Solar Modal Styles */
  modalSectionCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSectionSub: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
    lineHeight: 16,
  },
  solarDayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  solarDayTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  solarDayTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  solarTimesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  solarTimeBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFBEB",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  solarTimeLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 2,
  },
  solarTimeVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#78350F",
  },
  weatherDayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  weatherDayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  weatherDayName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  weatherConditionText: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 8,
    fontWeight: "500",
  },
  hourlyList: {
    gap: 4,
  },
  hourlyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  hourlyRowAlert: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  hourlyTime: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    width: 65,
  },
  hourlyCondition: {
    flex: 1,
    fontSize: 11,
    color: "#475569",
    marginHorizontal: 8,
  },
  hourlyPopWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  hourlyPop: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  hourlyPopHigh: {
    color: "#DC2626",
    fontWeight: "800",
  },
  modCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modDay: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  modOriginal: {
    fontSize: 11,
    color: "#DC2626",
    textDecorationLine: "line-through",
    marginBottom: 2,
  },
  modNew: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
    marginBottom: 4,
  },
  modReason: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
  },
  syncNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  syncNoticeText: {
    flex: 1,
    fontSize: 11,
    color: "#065F46",
    fontWeight: "600",
    lineHeight: 15,
  },
  modalCloseBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
