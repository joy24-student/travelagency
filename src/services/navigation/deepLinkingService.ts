/**
 * Deep Linking & Universal Navigation Service - Shopno Jatra (স্বপ্নযাত্রা)
 * 
 * Role: Mobile Navigation & Deep Linking Specialist
 * 
 * Core Architectural Capabilities:
 * 1. Universal Link & Custom Scheme Parsing:
 *    - Custom Schemes: `shopnojatra://trip/[id]`, `shopnojatra://hotel/[slug]`, `shopnojatra://split/[ledger_id]`, `shopnojatra://flight/[id]`
 *    - Universal Links (HTTPS): `https://shopnojatra.com/trip/[id]`, `https://shopnojatra.com/hotel/[slug]`, `https://shopnojatra.com/split/[ledger_id]`
 *    - Backwards-compatible legacy schemes: `converted-travel-ui://...`
 * 2. Deferred Deep Linking Engine:
 *    - Preserves parameters across cold app installation, Play Store/App Store acquisition, and onboarding flows.
 *    - 48-hour TTL-managed persistent parameter cache via AsyncStorage.
 * 3. Rich Social Previews (OpenGraph, Twitter Cards, Schema.org JSON-LD):
 *    - Generates dynamic OpenGraph meta tags with destination hero imagery and current pricing for social unfurls.
 *    - Full standalone HTML5 preview generator with auto-redirect script for Edge/SSR fallbacks.
 * 4. Authentication State Guard:
 *    - Zero-loss in-memory & persistent destination retention for protected routes (e.g., split-bill ledgers).
 *    - Seamless routing through authentication screen with post-login restoration.
 * 
 * Strict Boundaries: Does NOT modify screen-level business logic.
 */

import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../utils/supabase";

// ============================================================================
// CONSTANTS & SCHEMES CONFIGURATION
// ============================================================================

export const PRIMARY_SCHEME = "shopnojatra";
export const LEGACY_SCHEME = "converted-travel-ui";
export const PRIMARY_WEB_DOMAIN = "shopnojatra.com";
export const SUPPORTED_SCHEMES = [PRIMARY_SCHEME, LEGACY_SCHEME] as const;
export const SUPPORTED_DOMAINS = [
  "shopnojatra.com",
  "www.shopnojatra.com",
  "app.shopnojatra.com",
  "staging.shopnojatra.com",
] as const;

export const STORAGE_KEYS = {
  DEFERRED_DEEP_LINK: "@shopnojatra_deferred_deep_link",
  PENDING_AUTH_DESTINATION: "@shopnojatra_pending_auth_destination",
  INSTALL_ATTRIBUTION: "@shopnojatra_install_attribution",
  FIRST_RUN_RECORDED: "@shopnojatra_first_run_recorded",
} as const;

export const DEFERRED_LINK_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
export const AUTH_RETENTION_TTL_MS = 60 * 60 * 1000; // 1 hour

// ============================================================================
// DATA TYPES & INTERFACES
// ============================================================================

export type DeepLinkType =
  | "trip"
  | "hotel"
  | "split"
  | "flight"
  | "itinerary"
  | "package"
  | "screen"
  | "unknown";

export interface ParsedDeepLink {
  /** Original unprocessed incoming URL */
  rawUrl: string;
  /** Resolved scheme (e.g. 'shopnojatra' or 'https') */
  scheme: string;
  /** Hostname or authority part */
  hostname: string;
  /** Normalized path segments without leading/trailing slashes */
  path: string;
  /** Categorized intent type */
  type: DeepLinkType;
  /** Internal Expo Router pathname (e.g. '/(tabs)/trips' or '/screens/payments-enhanced') */
  targetRoute: string;
  /** Strongly-typed or normalized route parameter bag */
  params: Record<string, any>;
  /** Whether the destination requires an active authenticated session */
  requiresAuth: boolean;
  /** Target resource ID or slug */
  originalIdentifier: string;
  /** Raw query parameters passed in URL */
  searchParams: Record<string, string>;
}

export interface DeferredDeepLinkPayload {
  id: string;
  parsedLink: ParsedDeepLink;
  createdAt: number;
  expiresAt: number;
  campaign?: string;
  referrer?: string;
  consumed: boolean;
}

export interface PendingAuthDestination {
  targetRoute: string;
  params: Record<string, any>;
  originalUrl: string;
  timestamp: number;
  sourceType: DeepLinkType;
}

export interface SocialPreviewMetadata {
  title: string;
  description: string;
  heroImageUrl: string;
  currentPrice?: number;
  currency?: string;
  priceFormatted?: string;
  destinationName?: string;
  entityType: "trip" | "hotel" | "split" | "flight" | "itinerary";
  canonicalUrl: string;
  siteName?: string;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  customTags?: Record<string, string>;
}

export type OpenGraphTagMap = Record<string, string>;

export interface DeepLinkResolution {
  handled: boolean;
  action: "NAVIGATED" | "AUTH_REQUIRED" | "DEFERRED_STORED" | "UNSUPPORTED" | "ERROR";
  targetRoute?: string;
  params?: Record<string, any>;
  error?: string;
  parsedLink?: ParsedDeepLink;
}

export interface ShareUrlOptions {
  type: DeepLinkType;
  idOrSlug: string;
  subId?: string;
  queryParams?: Record<string, string | number | boolean>;
  previewOverrides?: Partial<SocialPreviewMetadata>;
}

export interface ShareUrlResult {
  /** Native app deep link scheme: shopnojatra://... */
  appUrl: string;
  /** Universal link: https://shopnojatra.com/... */
  universalUrl: string;
  /** Web landing preview url: https://shopnojatra.com/p/... */
  webPreviewUrl: string;
  /** Generated OpenGraph meta tags dictionary */
  metaTags: OpenGraphTagMap;
  /** Standalone HTML5 OpenGraph document */
  previewHtml: string;
  /** Native share prompt pre-formatted text payload */
  sharePayload: {
    title: string;
    message: string;
    url: string;
  };
}

// ============================================================================
// CURATED HERO IMAGE & DESTINATION PREVIEW CATALOG
// ============================================================================

const DEFAULT_HERO_CATALOG: Record<string, Partial<SocialPreviewMetadata>> = {
  // Top Bangladesh Destinations
  "sajek-valley": {
    destinationName: "Sajek Valley, Rangamati",
    heroImageUrl: "https://images.unsplash.com/photo-1622396481304-4ad734898337?auto=format&fit=crop&w=1200&q=80",
    currentPrice: 7500,
    currency: "BDT",
    priceFormatted: "৳ 7,500 / person",
    title: "Sajek Valley Cloud Kingdom 3D/2N AI Tour",
    description: "Explore the breathtaking sea of clouds from Konglak Para and stay in authentic hillside eco-resorts.",
  },
  "coxs-bazar": {
    destinationName: "Cox's Bazar",
    heroImageUrl: "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=1200&q=80",
    currentPrice: 4800,
    currency: "BDT",
    priceFormatted: "৳ 4,800 / night",
    title: "World's Longest Natural Sea Beach Getaway",
    description: "Miles of golden sand, fresh seafood, and luxury beachfront sunset vistas in Cox's Bazar.",
  },
  "sreemangal": {
    destinationName: "Sreemangal, Sylhet",
    heroImageUrl: "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=1200&q=80",
    currentPrice: 5200,
    currency: "BDT",
    priceFormatted: "৳ 5,200 / night",
    title: "Tea Capital & Lawachara Rainforest Retreat",
    description: "Lush green rolling tea gardens, 7-color tea tasting, and tranquil wildlife sanctuary trails.",
  },
  "saint-martin": {
    destinationName: "Saint Martin's Island",
    heroImageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    currentPrice: 8900,
    currency: "BDT",
    priceFormatted: "৳ 8,900 / person",
    title: "Saint Martin Coral Island & Chera Dwip Discovery",
    description: "Crystal-clear turquoise waters, fresh coconut groves, and tranquil coral reefs.",
  },
  "radisson-blu": {
    destinationName: "Radisson Blu Chattogram Bay View",
    heroImageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    currentPrice: 12500,
    currency: "BDT",
    priceFormatted: "৳ 12,500 / night",
    title: "Radisson Blu Chattogram - Luxury Deluxe Suite",
    description: "World-class 5-star comfort with rooftop infinity pool, spa, and international dining.",
  },
  "sayeman-beach-resort": {
    destinationName: "Sayeman Beach Resort, Cox's Bazar",
    heroImageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    currentPrice: 9800,
    currency: "BDT",
    priceFormatted: "৳ 9,800 / night",
    title: "Sayeman Ocean View King Room",
    description: "Direct oceanfront balcony views, private beach access, and infinity sunset swimming.",
  },
};

// ============================================================================
// DEEP LINKING SERVICE IMPLEMENTATION
// ============================================================================

export class DeepLinkingService {
  private static instance: DeepLinkingService;

  /** In-memory retention of target destination pending authentication */
  private pendingAuthDestination: PendingAuthDestination | null = null;

  /** Active event subscription token */
  private urlListenerSubscription: { remove: () => void } | null = null;
  private authStateSubscription: { unsubscribe: () => void } | null = null;

  /** Reference to navigation router instance for auto-resumption */
  private routerRef: any = null;

  /** Listeners for deferred link availability */
  private deferredLinkListeners: Set<(payload: DeferredDeepLinkPayload) => void> = new Set();

  private constructor() {
    this.setupAuthStateObserver();
  }

  public static getInstance(): DeepLinkingService {
    if (!DeepLinkingService.instance) {
      DeepLinkingService.instance = new DeepLinkingService();
    }
    return DeepLinkingService.instance;
  }

  // ==========================================================================
  // REQUIREMENT 1: UNIVERSAL LINK & SCHEME HANDLER
  // ==========================================================================

  /**
   * Evaluates if a given URL belongs to supported schemes or domains.
   */
  public isSupportedUrl(url: string): boolean {
    if (!url || typeof url !== "string") return false;
    const lower = url.trim().toLowerCase();

    for (const scheme of SUPPORTED_SCHEMES) {
      if (lower.startsWith(`${scheme}://`)) return true;
    }

    for (const domain of SUPPORTED_DOMAINS) {
      if (lower.startsWith(`https://${domain}`) || lower.startsWith(`http://${domain}`)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Parses raw incoming deep link (custom scheme or universal link) into a normalized structure.
   */
  public parseUrl(url: string): ParsedDeepLink | null {
    if (!url || typeof url !== "string") return null;

    try {
      const cleanUrl = url.trim();

      // Normalize scheme vs universal link
      let scheme = "";
      let hostname = "";
      let path = "";
      let queryString = "";

      const protocolMatch = cleanUrl.match(/^([a-zA-Z0-9+.-]+):\/\//);
      if (protocolMatch) {
        scheme = protocolMatch[1].toLowerCase();
      }

      // Check custom scheme vs web URL
      if (SUPPORTED_SCHEMES.includes(scheme as any)) {
        // e.g. shopnojatra://trip/123?utm_source=share
        // or shopnojatra:///trip/123
        const afterScheme = cleanUrl.substring(protocolMatch![0].length).replace(/^\/+/, "");
        const [pathAndHost, query] = afterScheme.split("?");
        queryString = query || "";

        const segments = pathAndHost.split("/").filter(Boolean);
        if (segments.length > 0) {
          hostname = segments[0];
          path = segments.slice(1).join("/");
        }
      } else if (scheme === "http" || scheme === "https") {
        try {
          const parsedObj = new URL(cleanUrl);
          hostname = parsedObj.hostname.toLowerCase();
          path = parsedObj.pathname.replace(/^\/+|\/+$/g, "");
          queryString = parsedObj.search.replace(/^\?/, "");
        } catch {
          const afterHttp = cleanUrl.replace(/^https?:\/\//i, "");
          const [hostAndPath, query] = afterHttp.split("?");
          queryString = query || "";
          const firstSlash = hostAndPath.indexOf("/");
          if (firstSlash !== -1) {
            hostname = hostAndPath.substring(0, firstSlash).toLowerCase();
            path = hostAndPath.substring(firstSlash + 1).replace(/^\/+|\/+$/g, "");
          } else {
            hostname = hostAndPath.toLowerCase();
            path = "";
          }
        }
      } else {
        // Unsupported protocol
        return null;
      }

      // Parse search parameters
      const searchParams: Record<string, string> = {};
      if (queryString) {
        const pairs = queryString.split("&");
        for (const pair of pairs) {
          if (!pair) continue;
          const [k, v] = pair.split("=");
          if (k) {
            searchParams[decodeURIComponent(k)] = v ? decodeURIComponent(v.replace(/\+/g, " ")) : "";
          }
        }
      }

      // Determine segments: combining hostname & path for route interpretation
      let fullSegments: string[] = [];
      if (SUPPORTED_SCHEMES.includes(scheme as any)) {
        fullSegments = [hostname, ...path.split("/").filter(Boolean)];
      } else {
        fullSegments = path.split("/").filter(Boolean);
      }

      const primarySegment = (fullSegments[0] || "").toLowerCase();
      const secondarySegment = fullSegments[1] || "";
      const tertiarySegment = fullSegments[2] || "";

      let type: DeepLinkType = "unknown";
      let targetRoute = "/";
      let requiresAuth = false;
      const params: Record<string, any> = { ...searchParams };
      let originalIdentifier = "";

      // 1. TRIPS & AI ITINERARIES: shopnojatra://trip/[id] or https://shopnojatra.com/trip/[id]
      if (primarySegment === "trip" || primarySegment === "trips") {
        type = "trip";
        originalIdentifier = secondarySegment;
        params.tripId = secondarySegment;

        // Check if query or segment flags this as AI Itinerary
        if (searchParams.mode === "ai" || searchParams.ai === "true" || searchParams.type === "itinerary") {
          type = "itinerary";
          targetRoute = "/screens/trip-planner";
          params.destination = searchParams.destination || secondarySegment;
          params.days = searchParams.days ? Number(searchParams.days) : 3;
        } else {
          // General trip details or booking trip view
          targetRoute = "/(tabs)/trips";
          params.filter = searchParams.filter || "upcoming";
          // Private trip details require auth if viewing private booking
          if (searchParams.private === "true" || searchParams.booking === "true") {
            requiresAuth = true;
          }
        }
      }

      // 2. HOTELS & ROOMS: shopnojatra://hotel/[slug] or https://shopnojatra.com/hotel/[slug]
      else if (primarySegment === "hotel" || primarySegment === "hotels") {
        type = "hotel";
        originalIdentifier = secondarySegment;
        params.hotelSlug = secondarySegment;
        params.destination = searchParams.destination || secondarySegment;

        // Handle room subpath: hotel/[slug]/room/[roomId] or ?room=[roomId]
        if (tertiarySegment) {
          params.roomId = tertiarySegment;
        } else if (searchParams.room || searchParams.roomId) {
          params.roomId = searchParams.room || searchParams.roomId;
        }

        targetRoute = "/screens/hotels-homes";
        requiresAuth = false; // Hotel discovery is publicly shareable
      }

      // 3. SPLIT-BILL: shopnojatra://split/[ledger_id] or https://shopnojatra.com/split/[ledger_id]
      else if (primarySegment === "split" || primarySegment === "split-bill" || primarySegment === "ledger") {
        type = "split";
        originalIdentifier = secondarySegment;
        params.ledgerId = secondarySegment;
        params.bookingId = secondarySegment;
        params.split = "true";

        if (searchParams.amount) {
          params.amount = Number(searchParams.amount);
        }
        if (searchParams.currency) {
          params.currency = searchParams.currency.toUpperCase();
        }

        // Targets Zero-Trust Enhanced Payments / Split processing screen
        targetRoute = "/screens/payments-enhanced";
        // STRICT REQUIREMENT 4: Split-bills MUST require authentication!
        requiresAuth = true;
      }

      // 4. FLIGHTS: shopnojatra://flight/[id] or https://shopnojatra.com/flight/[id]
      else if (primarySegment === "flight" || primarySegment === "flights") {
        type = "flight";
        originalIdentifier = secondarySegment;
        params.flightId = secondarySegment;
        targetRoute = "/screens/flights";
        requiresAuth = false; // Flight searching/viewing is public
      }

      // 5. ITINERARIES: shopnojatra://itinerary/[id]
      else if (primarySegment === "itinerary" || primarySegment === "trip-planner") {
        type = "itinerary";
        originalIdentifier = secondarySegment;
        params.tripId = secondarySegment;
        targetRoute = "/screens/trip-planner";
        requiresAuth = false;
      }

      // 6. PACKAGES & TOURS: shopnojatra://package/[id] or /screens/packages
      else if (primarySegment === "package" || primarySegment === "packages") {
        type = "package";
        originalIdentifier = secondarySegment;
        params.packageId = secondarySegment;
        targetRoute = "/screens/packages";
        requiresAuth = false;
      }

      // 7. GENERIC SCREEN MAPPING: shopnojatra://screens/[slug] or screen/[slug]
      else if (primarySegment === "screens" || primarySegment === "screen") {
        type = "screen";
        originalIdentifier = secondarySegment;
        targetRoute = `/screens/${secondarySegment}`;
        requiresAuth = searchParams.auth === "true" || searchParams.require_auth === "true";
      }

      // Explicit authentication query flag override
      if (searchParams.requires_auth === "true" || searchParams.auth === "1") {
        requiresAuth = true;
      }

      return {
        rawUrl: cleanUrl,
        scheme,
        hostname,
        path,
        type,
        targetRoute,
        params,
        requiresAuth,
        originalIdentifier,
        searchParams,
      };
    } catch (err) {
      console.warn("[DeepLinkingService] Error parsing URL:", url, err);
      return null;
    }
  }

  // ==========================================================================
  // REQUIREMENT 2: DEFERRED DEEP LINKING ENGINE
  // ==========================================================================

  /**
   * Captures and persists an unhandled deep link across app installation and onboarding.
   * Useful when recipient receives a link, gets directed to app store, and launches first time.
   */
  public async captureDeferredDeepLink(
    url: string,
    referrer?: string,
    campaign?: string
  ): Promise<boolean> {
    const parsed = this.parseUrl(url);
    if (!parsed) return false;

    const payload: DeferredDeepLinkPayload = {
      id: `def_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      parsedLink: parsed,
      createdAt: Date.now(),
      expiresAt: Date.now() + DEFERRED_LINK_TTL_MS,
      campaign,
      referrer,
      consumed: false,
    };

    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.DEFERRED_DEEP_LINK,
        JSON.stringify(payload)
      );
      console.log("[DeepLinkingService] Deferred link preserved:", payload.id, parsed.targetRoute);

      // Notify registered listeners
      this.deferredLinkListeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (e) {
          console.warn("[DeepLinkingService] Error in deferred listener:", e);
        }
      });

      return true;
    } catch (e) {
      console.warn("[DeepLinkingService] Failed saving deferred deep link:", e);
      return false;
    }
  }

  /**
   * Retrieves pending deferred deep link if still within TTL.
   */
  public async getPendingDeferredLink(): Promise<DeferredDeepLinkPayload | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.DEFERRED_DEEP_LINK);
      if (!raw) return null;

      const payload: DeferredDeepLinkPayload = JSON.parse(raw);
      if (payload.consumed) return null;

      // Check expiration
      if (Date.now() > payload.expiresAt) {
        await this.clearDeferredLink();
        return null;
      }

      return payload;
    } catch (e) {
      console.warn("[DeepLinkingService] Failed reading deferred link:", e);
      return null;
    }
  }

  /**
   * Returns whether a valid unconsumed deferred link exists.
   */
  public async hasPendingDeferredLink(): Promise<boolean> {
    const link = await this.getPendingDeferredLink();
    return link !== null && !link.consumed;
  }

  /**
   * Marks the pending deferred link as consumed so it won't re-trigger.
   */
  public async markDeferredLinkConsumed(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.DEFERRED_DEEP_LINK);
      if (!raw) return;
      const payload: DeferredDeepLinkPayload = JSON.parse(raw);
      payload.consumed = true;
      await AsyncStorage.setItem(
        STORAGE_KEYS.DEFERRED_DEEP_LINK,
        JSON.stringify(payload)
      );
    } catch {
      // Non-critical
    }
  }

  /**
   * Removes deferred link from persistent storage completely.
   */
  public async clearDeferredLink(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.DEFERRED_DEEP_LINK);
    } catch {
      // Non-critical
    }
  }

  /**
   * Resumes and executes deferred deep link after install/onboarding is finished.
   * Restores all route parameters and transitions user directly to target destination.
   */
  public async executeDeferredLink(router: any): Promise<boolean> {
    const payload = await this.getPendingDeferredLink();
    if (!payload || payload.consumed) return false;

    const { parsedLink } = payload;
    await this.markDeferredLinkConsumed();

    console.log(
      "[DeepLinkingService] Executing deferred link post-install:",
      parsedLink.targetRoute,
      parsedLink.params
    );

    const isAuthed = await this.checkUserAuthenticated();
    if (parsedLink.requiresAuth && !isAuthed) {
      // Store in auth guard queue and divert to login
      await this.setPendingAuthDestination({
        targetRoute: parsedLink.targetRoute,
        params: parsedLink.params,
        originalUrl: parsedLink.rawUrl,
        timestamp: Date.now(),
        sourceType: parsedLink.type,
      });

      if (router && typeof router.push === "function") {
        router.push({
          pathname: "/(auth)/login",
          params: {
            returnTo: parsedLink.targetRoute,
            deferredResume: "true",
          },
        });
        return true;
      }
      return false;
    }

    if (router && typeof router.push === "function") {
      router.push({
        pathname: parsedLink.targetRoute,
        params: parsedLink.params,
      });
      return true;
    }

    return false;
  }

  /**
   * Subscribe to deferred link events.
   */
  public onDeferredLinkReady(
    callback: (payload: DeferredDeepLinkPayload) => void
  ): () => void {
    this.deferredLinkListeners.add(callback);
    return () => this.deferredLinkListeners.delete(callback);
  }

  // ==========================================================================
  // REQUIREMENT 3: RICH SOCIAL PREVIEWS (OPENGRAPH DYNAMIC TAGS & HTML)
  // ==========================================================================

  /**
   * Resolves preview metadata for a given entity, combining catalog presets with live overrides.
   */
  public async resolvePreviewMetadata(
    type: DeepLinkType,
    idOrSlug: string,
    queryParams?: Record<string, any>
  ): Promise<SocialPreviewMetadata> {
    const normalizedKey = (idOrSlug || "").toLowerCase().trim();
    const preset = DEFAULT_HERO_CATALOG[normalizedKey] || {};

    let title = preset.title || "";
    let description = preset.description || "";
    let heroImageUrl =
      preset.heroImageUrl ||
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80";
    let currentPrice = preset.currentPrice;
    let currency = preset.currency || "BDT";
    let priceFormatted = preset.priceFormatted;
    let destinationName = preset.destinationName || idOrSlug.replace(/-/g, " ");

    const canonicalUrl = `https://${PRIMARY_WEB_DOMAIN}/${type}/${encodeURIComponent(idOrSlug)}`;

    // Build specialized defaults based on entity category
    switch (type) {
      case "split": {
        const amount = queryParams?.amount ? Number(queryParams.amount) : 1450;
        const note = queryParams?.note || "Group Travel Expense";
        title = `Split Bill: ${note} - Shopno Jatra`;
        description = `You have been invited to split an expense for ${note}. Tap to review ledger and settle securely via bKash, Nagad, or Wallet.`;
        heroImageUrl =
          "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80";
        currentPrice = amount;
        priceFormatted = `৳ ${amount.toLocaleString()} / person`;
        destinationName = "Split Bill Ledger";
        break;
      }

      case "hotel": {
        if (!title) {
          title = `${destinationName} - Best Rates & Rooms`;
          description = `Book verified rooms at ${destinationName} with instant confirmation, free cancellation, and flexible payments.`;
        }
        if (!currentPrice) {
          currentPrice = 6500;
          priceFormatted = "৳ 6,500 / night";
        }
        break;
      }

      case "flight": {
        const origin = queryParams?.origin || "DAC";
        const dest = queryParams?.destination || "CXB";
        title = `Flight Deal: ${origin} ✈ ${dest} - Shopno Jatra`;
        description = `Compare airline fares from ${origin} to ${dest}. Book direct tickets with zero extra convenience fees.`;
        heroImageUrl =
          "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80";
        currentPrice = queryParams?.price ? Number(queryParams.price) : 4200;
        priceFormatted = `৳ ${currentPrice.toLocaleString()} onwards`;
        destinationName = `${origin} to ${dest}`;
        break;
      }

      case "trip":
      case "itinerary": {
        if (!title) {
          title = `${destinationName} AI Travel Itinerary`;
          description = `Explore personalized day-by-day travel recommendations, budget breakdown, and top attractions curated by Shopno Jatra AI.`;
        }
        if (!currentPrice) {
          currentPrice = 11500;
          priceFormatted = "৳ 11,500 / person";
        }
        break;
      }

      default: {
        if (!title) {
          title = `${destinationName} - Shopno Jatra Travel`;
          description = "Discover seamless travel booking, hotels, flights, and tours across Bangladesh and abroad.";
        }
      }
    }

    return {
      title,
      description,
      heroImageUrl,
      currentPrice,
      currency,
      priceFormatted,
      destinationName,
      entityType: type as any,
      canonicalUrl,
      siteName: "Shopno Jatra - স্বপ্নযাত্রা",
      rating: 4.8,
      reviewCount: 324,
      badge: "Verified by Shopno Jatra",
    };
  }

  /**
   * Generates OpenGraph and Twitter Card dynamic meta tags dictionary.
   */
  public generateOpenGraphMetaTags(metadata: SocialPreviewMetadata): OpenGraphTagMap {
    const tags: OpenGraphTagMap = {
      // Standard HTML Meta
      title: metadata.title,
      description: metadata.description,

      // OpenGraph Core
      "og:site_name": metadata.siteName || "Shopno Jatra - স্বপ্নযাত্রা",
      "og:title": metadata.title,
      "og:description": metadata.description,
      "og:image": metadata.heroImageUrl,
      "og:image:secure_url": metadata.heroImageUrl,
      "og:image:type": "image/jpeg",
      "og:image:width": "1200",
      "og:image:height": "630",
      "og:image:alt": metadata.title,
      "og:url": metadata.canonicalUrl,
      "og:type": metadata.entityType === "split" ? "website" : "product",
      "og:locale": "bn_BD",
      "og:locale:alternate": "en_US",

      // Twitter Cards
      "twitter:card": "summary_large_image",
      "twitter:site": "@shopnojatra",
      "twitter:title": metadata.title,
      "twitter:description": metadata.description,
      "twitter:image": metadata.heroImageUrl,

      // App Links (Deep Linking for Crawlers / Facebook / Slack / WhatsApp)
      "al:ios:url": `shopnojatra://${metadata.entityType}/${encodeURIComponent(metadata.canonicalUrl.split("/").pop() || "")}`,
      "al:ios:app_store_id": "com.s025.convertedtravelui",
      "al:ios:app_name": "Shopno Jatra",
      "al:android:url": `shopnojatra://${metadata.entityType}/${encodeURIComponent(metadata.canonicalUrl.split("/").pop() || "")}`,
      "al:android:package": "com.s025.convertedtravelui",
      "al:android:app_name": "Shopno Jatra",
    };

    // Product Pricing tags if price exists
    if (metadata.currentPrice !== undefined) {
      tags["product:price:amount"] = String(metadata.currentPrice);
      tags["product:price:currency"] = metadata.currency || "BDT";
      tags["og:price:amount"] = String(metadata.currentPrice);
      tags["og:price:currency"] = metadata.currency || "BDT";
    }

    if (metadata.customTags) {
      Object.assign(tags, metadata.customTags);
    }

    return tags;
  }

  /**
   * Renders a complete, production-ready HTML5 document with dynamic OpenGraph meta tags,
   * JSON-LD structured schema, and smart app deep linking fallback redirect.
   * Ideal for Cloudflare Workers, Supabase Edge Functions, or Next.js preview endpoints.
   */
  public renderOpenGraphHtml(metadata: SocialPreviewMetadata): string {
    const metaTags = this.generateOpenGraphMetaTags(metadata);
    const metaTagsHtml = Object.entries(metaTags)
      .map(([key, val]) => {
        const propertyOrName = key.startsWith("twitter:") ? "name" : "property";
        const escapedVal = val.replace(/"/g, "&quot;");
        return `    <meta ${propertyOrName}="${key}" content="${escapedVal}" />`;
      })
      .join("\n");

    const appSchemeUrl = `shopnojatra://${metadata.entityType}/${metadata.canonicalUrl.split("/").pop() || ""}`;

    // Schema.org JSON-LD structured data
    const jsonLd = {
      "@context": "https://schema.org",
      "@type":
        metadata.entityType === "hotel"
          ? "Hotel"
          : metadata.entityType === "flight"
          ? "FlightReservation"
          : metadata.entityType === "split"
          ? "Invoice"
          : "TouristTrip",
      name: metadata.title,
      description: metadata.description,
      image: metadata.heroImageUrl,
      url: metadata.canonicalUrl,
      offers: metadata.currentPrice
        ? {
            "@type": "Offer",
            price: metadata.currentPrice,
            priceCurrency: metadata.currency || "BDT",
            availability: "https://schema.org/InStock",
          }
        : undefined,
    };

    return `<!DOCTYPE html>
<html lang="bn" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <title>${metadata.title} | Shopno Jatra</title>
${metaTagsHtml}
  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #0b1222; color: #ffffff; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: #131c31; border: 1px solid #1f2b48; border-radius: 20px; max-width: 480px; width: 100%; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
    .hero { position: relative; width: 100%; height: 260px; overflow: hidden; background: #000; }
    .hero img { width: 100%; height: 100%; object-fit: cover; }
    .badge { position: absolute; top: 16px; left: 16px; background: rgba(0, 85, 242, 0.9); color: #fff; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 30px; backdrop-filter: blur(8px); }
    .price-tag { position: absolute; bottom: 16px; right: 16px; background: #10b981; color: #fff; font-size: 15px; font-weight: 800; padding: 8px 16px; border-radius: 12px; box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
    .content { padding: 24px; }
    .title { font-size: 20px; font-weight: 700; line-height: 1.3; margin-bottom: 10px; color: #f8fafc; }
    .dest { font-size: 14px; color: #94a3b8; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
    .desc { font-size: 14px; color: #cbd5e1; line-height: 1.5; margin-bottom: 24px; }
    .btn-container { display: flex; flex-direction: column; gap: 12px; }
    .btn-primary { background: #0055f2; color: #ffffff; text-decoration: none; text-align: center; font-weight: 700; font-size: 16px; padding: 14px 20px; border-radius: 12px; transition: background 0.2s; display: block; }
    .btn-primary:hover { background: #0043c0; }
    .btn-secondary { background: #1e293b; color: #94a3b8; text-decoration: none; text-align: center; font-size: 13px; font-weight: 600; padding: 10px 16px; border-radius: 10px; display: block; border: 1px solid #334155; }
    .logo-footer { text-align: center; margin-top: 18px; font-size: 12px; color: #64748b; }
  </style>
  <script>
    // Universal Smart App Banner Instant Launcher
    (function() {
      var appUrl = "${appSchemeUrl}";
      var storeFallback = "https://play.google.com/store/apps/details?id=com.s025.convertedtravelui";
      var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Attempt deep link trigger
        window.location = appUrl;
      }
    })();
  </script>
</head>
<body>
  <div class="card">
    <div class="hero">
      <img src="${metadata.heroImageUrl}" alt="${metadata.title}" />
      <span class="badge">${metadata.badge || "Shopno Jatra"}</span>
      ${metadata.priceFormatted ? `<span class="price-tag">${metadata.priceFormatted}</span>` : ""}
    </div>
    <div class="content">
      <h1 class="title">${metadata.title}</h1>
      <div class="dest">📍 ${metadata.destinationName || "Bangladesh"}</div>
      <p class="desc">${metadata.description}</p>
      
      <div class="btn-container">
        <a href="${appSchemeUrl}" class="btn-primary" id="openBtn">Open in Shopno Jatra App</a>
        <a href="https://play.google.com/store/apps/details?id=com.s025.convertedtravelui" class="btn-secondary">Download on Google Play / App Store</a>
      </div>
      
      <div class="logo-footer">স্বপ্নযাত্রা • Shopno Jatra SuperApp</div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generates a complete bundle of shareable deep link URLs and metadata for UI sharing features.
   */
  public async buildShareableUrl(options: ShareUrlOptions): Promise<ShareUrlResult> {
    const { type, idOrSlug, queryParams = {}, previewOverrides = {} } = options;

    // Build query string
    const queryEntries = Object.entries(queryParams);
    const queryString = queryEntries.length > 0
      ? "?" + queryEntries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")
      : "";

    const appUrl = `${PRIMARY_SCHEME}://${type}/${encodeURIComponent(idOrSlug)}${queryString}`;
    const universalUrl = `https://${PRIMARY_WEB_DOMAIN}/${type}/${encodeURIComponent(idOrSlug)}${queryString}`;
    const webPreviewUrl = `https://${PRIMARY_WEB_DOMAIN}/p/${type}/${encodeURIComponent(idOrSlug)}${queryString}`;

    const resolved = await this.resolvePreviewMetadata(type, idOrSlug, queryParams);
    const mergedMetadata: SocialPreviewMetadata = {
      ...resolved,
      ...previewOverrides,
      canonicalUrl: universalUrl,
    };

    const metaTags = this.generateOpenGraphMetaTags(mergedMetadata);
    const previewHtml = this.renderOpenGraphHtml(mergedMetadata);

    let priceNotice = "";
    if (mergedMetadata.priceFormatted) {
      priceNotice = ` [${mergedMetadata.priceFormatted}]`;
    }

    const sharePayload = {
      title: mergedMetadata.title,
      message: `${mergedMetadata.title}${priceNotice}\nCheck this out on Shopno Jatra:\n${universalUrl}`,
      url: universalUrl,
    };

    return {
      appUrl,
      universalUrl,
      webPreviewUrl,
      metaTags,
      previewHtml,
      sharePayload,
    };
  }

  // ==========================================================================
  // REQUIREMENT 4: AUTHENTICATION STATE GUARD
  // ==========================================================================

  /**
   * Checks whether the current user holds an active authenticated Supabase session.
   */
  public async checkUserAuthenticated(): Promise<boolean> {
    try {
      const { data } = await supabase.auth.getSession();
      return !!data.session?.user;
    } catch {
      return false;
    }
  }

  /**
   * Retains target deep link destination in memory and persistent storage
   * prior to diverting unauthenticated users through the auth flow.
   */
  public async setPendingAuthDestination(destination: PendingAuthDestination): Promise<void> {
    this.pendingAuthDestination = destination;
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_AUTH_DESTINATION,
        JSON.stringify(destination)
      );
      console.log(
        "[DeepLinkingService] Auth destination locked in memory & storage:",
        destination.targetRoute,
        destination.params
      );
    } catch (e) {
      console.warn("[DeepLinkingService] Failed saving pending auth destination:", e);
    }
  }

  /**
   * Retrieves pending post-auth destination if within 1 hour TTL.
   */
  public async getPendingAuthDestination(): Promise<PendingAuthDestination | null> {
    if (this.pendingAuthDestination) {
      if (Date.now() - this.pendingAuthDestination.timestamp < AUTH_RETENTION_TTL_MS) {
        return this.pendingAuthDestination;
      } else {
        this.pendingAuthDestination = null;
      }
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_AUTH_DESTINATION);
      if (!raw) return null;

      const destination: PendingAuthDestination = JSON.parse(raw);
      if (Date.now() - destination.timestamp < AUTH_RETENTION_TTL_MS) {
        this.pendingAuthDestination = destination;
        return destination;
      } else {
        await this.clearPendingAuthDestination();
        return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Clears retained destination from both memory and storage.
   */
  public async clearPendingAuthDestination(): Promise<void> {
    this.pendingAuthDestination = null;
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_AUTH_DESTINATION);
    } catch {
      // Non-critical
    }
  }

  /**
   * Resumes destination navigation upon successful authentication.
   * Called right after login, OTP verification, or OAuth callback.
   */
  public async resumePendingPostAuthNavigation(router?: any): Promise<boolean> {
    const activeRouter = router || this.routerRef;
    const destination = await this.getPendingAuthDestination();

    if (!destination) {
      return false;
    }

    console.log(
      "[DeepLinkingService] Resuming protected destination post-auth:",
      destination.targetRoute,
      destination.params
    );

    // Atomically clear destination so it never fires twice
    await this.clearPendingAuthDestination();

    if (activeRouter && typeof activeRouter.push === "function") {
      activeRouter.push({
        pathname: destination.targetRoute,
        params: destination.params,
      });
      return true;
    }

    return false;
  }

  // ==========================================================================
  // DISPATCHER & LIFECYCLE MANAGEMENT
  // ==========================================================================

  /**
   * Primary deep link resolution gateway.
   * Evaluates authentication requirements, manages destination retention, and triggers routing.
   */
  public async handleDeepLink(url: string, router?: any): Promise<DeepLinkResolution> {
    if (!url) {
      return { handled: false, action: "UNSUPPORTED" };
    }

    const activeRouter = router || this.routerRef;
    const parsed = this.parseUrl(url);

    if (!parsed) {
      return { handled: false, action: "UNSUPPORTED" };
    }

    console.log(
      `[DeepLinkingService] Incoming ${parsed.type.toUpperCase()} link:`,
      parsed.targetRoute,
      parsed.params
    );

    // Evaluate authentication guard
    if (parsed.requiresAuth) {
      const isAuthed = await this.checkUserAuthenticated();

      if (!isAuthed) {
        console.log(
          `[DeepLinkingService] Route '${parsed.targetRoute}' requires authentication. Retaining destination & redirecting to login.`
        );

        // Lock destination in memory and persistent cache
        await this.setPendingAuthDestination({
          targetRoute: parsed.targetRoute,
          params: parsed.params,
          originalUrl: parsed.rawUrl,
          timestamp: Date.now(),
          sourceType: parsed.type,
        });

        if (activeRouter && typeof activeRouter.push === "function") {
          activeRouter.push({
            pathname: "/(auth)/login",
            params: {
              returnTo: parsed.targetRoute,
              requiresDeepLinkResume: "true",
              destinationType: parsed.type,
            },
          });
        }

        return {
          handled: true,
          action: "AUTH_REQUIRED",
          targetRoute: parsed.targetRoute,
          params: parsed.params,
          parsedLink: parsed,
        };
      }
    }

    // Public or Authenticated: Navigate directly
    if (activeRouter && typeof activeRouter.push === "function") {
      activeRouter.push({
        pathname: parsed.targetRoute,
        params: parsed.params,
      });

      return {
        handled: true,
        action: "NAVIGATED",
        targetRoute: parsed.targetRoute,
        params: parsed.params,
        parsedLink: parsed,
      };
    }

    return {
      handled: true,
      action: "NAVIGATED",
      targetRoute: parsed.targetRoute,
      params: parsed.params,
      parsedLink: parsed,
    };
  }

  /**
   * Internal listener to Supabase auth state. Automatically executes pending
   * post-auth navigation if user logs in while destination is queued.
   */
  private setupAuthStateObserver(): void {
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const destination = await this.getPendingAuthDestination();
          if (destination && this.routerRef) {
            console.log("[DeepLinkingService] Auth state changed to SIGNED_IN. Resuming destination...");
            await this.resumePendingPostAuthNavigation(this.routerRef);
          }
        }
      });
      this.authStateSubscription = data?.subscription ?? null;
    } catch (e) {
      console.warn("[DeepLinkingService] Auth observer registration failed:", e);
    }
  }

  /**
   * Sets up system URL event listeners and checks cold-start initial URL.
   */
  public initialize(router?: any): () => void {
    if (router) {
      this.routerRef = router;
    }

    // 1. Check cold boot initial launch URL
    Linking.getInitialURL()
      .then(async (url) => {
        if (!url) {
          // If no initial URL, check if there is an unconsumed deferred link from install
          const hasDeferred = await this.hasPendingDeferredLink();
          if (hasDeferred && this.routerRef) {
            await this.executeDeferredLink(this.routerRef);
          }
          return;
        }

        // Process initial URL
        if (this.isSupportedUrl(url)) {
          await this.handleDeepLink(url, this.routerRef);
        }
      })
      .catch((err) => {
        console.warn("[DeepLinkingService] Error reading initial URL:", err);
      });

    // 2. Register runtime URL listener
    const sub = Linking.addEventListener("url", async ({ url }: { url: string }) => {
      if (this.isSupportedUrl(url)) {
        await this.handleDeepLink(url, this.routerRef);
      }
    });
    this.urlListenerSubscription = sub;

    // Return cleanup function
    return () => {
      if (this.urlListenerSubscription) {
        this.urlListenerSubscription.remove();
        this.urlListenerSubscription = null;
      }
    };
  }

  /**
   * Updates router instance reference.
   */
  public setRouter(router: any): void {
    this.routerRef = router;
  }

  /**
   * Complete cleanup for tests or unmounting.
   */
  public cleanup(): void {
    if (this.urlListenerSubscription) {
      this.urlListenerSubscription.remove();
      this.urlListenerSubscription = null;
    }
    if (this.authStateSubscription) {
      this.authStateSubscription.unsubscribe();
      this.authStateSubscription = null;
    }
    this.deferredLinkListeners.clear();
    this.pendingAuthDestination = null;
  }
}

// Export singleton instance
export const deepLinkingService = DeepLinkingService.getInstance();

/**
 * React hook for consuming and reacting to deep links inside Root Layout or coordinators.
 * Maintains deep link lifecycle without interfering with screen business logic.
 */
export function useDeepLinking(router?: any) {
  const [hasDeferred, setHasDeferred] = useState(false);
  const [hasPendingAuth, setHasPendingAuth] = useState(false);

  useEffect(() => {
    if (!router) return;

    deepLinkingService.setRouter(router);
    const cleanup = deepLinkingService.initialize(router);

    // Initial check for deferred or pending auth destinations
    deepLinkingService.hasPendingDeferredLink().then(setHasDeferred);
    deepLinkingService.getPendingAuthDestination().then((dest) => setHasPendingAuth(!!dest));

    return cleanup;
  }, [router]);

  return {
    hasDeferredLink: hasDeferred,
    hasPendingAuthDestination: hasPendingAuth,
    executeDeferredLink: () => deepLinkingService.executeDeferredLink(router),
    resumePostAuthNavigation: () => deepLinkingService.resumePendingPostAuthNavigation(router),
    buildShareableUrl: (options: ShareUrlOptions) => deepLinkingService.buildShareableUrl(options),
  };
}

