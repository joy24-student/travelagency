// @ts-nocheck
/**
 * agencyService.ts
 * Full agency service layer — public-facing + admin operations.
 * Covers: listing, detail, packages, reviews, enquiries, live sessions,
 * analytics, follow / unfollow, save / unsave, contact form.
 */

import { supabase } from "../utils/supabase";
import type {
  AgencyAdminDetails,
  AgencyPerformanceMetrics,
  AgencyVerificationStatus,
} from "../types/admin";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface Agency {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  cover_url?: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  trade_license?: string;
  established_year?: number;
  specialties: string[]; // e.g. ['beach', 'adventure', 'honeymoon']
  verified: boolean;
  is_certified: boolean;
  is_suspended: boolean;
  avg_rating: number;
  total_reviews: number;
  total_packages: number;
  total_bookings: number;
  followers_count: number;
  response_time_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface AgencyPackage {
  id: string;
  agency_id: string;
  name: string;
  slug: string;
  destination: string;
  duration_days: number;
  price: number;
  original_price?: number;
  currency: string;
  cover_image?: string;
  summary: string;
  includes: string[];
  excludes: string[];
  is_featured: boolean;
  is_active: boolean;
  availability_seats: number;
  avg_rating: number;
  total_reviews: number;
  created_at: string;
}

export interface AgencyReview {
  id: string;
  agency_id: string;
  user_id: string;
  booking_id?: string;
  rating: number; // 1–5
  title?: string;
  body: string;
  photos: string[];
  helpful_count: number;
  verified_purchase: boolean;
  created_at: string;
  author?: { display_name: string; avatar_url?: string };
}

export interface AgencyEnquiry {
  id: string;
  agency_id: string;
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  package_id?: string;
  status: "new" | "read" | "replied" | "closed";
  created_at: string;
}

export interface AgencyLiveSession {
  id: string;
  agency_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  stream_key?: string;
  status: "scheduled" | "live" | "ended";
  viewer_count: number;
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface AgencyFilters {
  city?: string;
  country?: string;
  specialty?: string;
  verified?: boolean;
  minRating?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── agencyService ────────────────────────────────────────────────────────────

export const agencyService = {
  // ── Listing ────────────────────────────────────────────────────────────────

  /** Get all public agencies with optional filters */
  async getAgencies(filters: AgencyFilters = {}): Promise<Agency[]> {
    let query = supabase.from("agencies").select("*").eq("is_suspended", false);

    if (filters.city) query = query.ilike("city", `%${filters.city}%`);
    if (filters.country) query = query.eq("country", filters.country);
    if (filters.specialty)
      query = query.contains("specialties", [filters.specialty]);
    if (filters.verified !== undefined)
      query = query.eq("verified", filters.verified);
    if (filters.minRating) query = query.gte("avg_rating", filters.minRating);
    if (filters.search)
      query = query.or(
        `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
      );

    const { data, error } = await query
      .order("avg_rating", { ascending: false })
      .range(
        filters.offset ?? 0,
        (filters.offset ?? 0) + (filters.limit ?? 20) - 1,
      );

    if (error) throw error;
    return data ?? [];
  },

  /** Get a single agency by ID */
  async getAgency(agencyId: string): Promise<Agency | null> {
    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .eq("id", agencyId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data ?? null;
  },

  /** Get a single agency by slug */
  async getAgencyBySlug(slug: string): Promise<Agency | null> {
    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data ?? null;
  },

  /** Featured / top-rated agencies for home screen */
  async getFeaturedAgencies(limit = 6): Promise<Agency[]> {
    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .eq("verified", true)
      .eq("is_suspended", false)
      .order("avg_rating", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  },

  /** Search agencies by name / city / specialty */
  async searchAgencies(query: string, limit = 10): Promise<Agency[]> {
    const { data, error } = await supabase
      .from("agencies")
      .select("id, name, slug, logo_url, city, country, avg_rating, verified")
      .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
      .eq("is_suspended", false)
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  },

  // ── Packages ───────────────────────────────────────────────────────────────

  /** Get all packages for an agency */
  async getAgencyPackages(
    agencyId: string,
    featuredOnly = false,
  ): Promise<AgencyPackage[]> {
    let query = supabase
      .from("agency_packages")
      .select("*")
      .eq("agency_id", agencyId)
      .eq("is_active", true);

    if (featuredOnly) query = query.eq("is_featured", true);

    const { data, error } = await query.order("is_featured", {
      ascending: false,
    });
    if (error) throw error;
    return data ?? [];
  },

  /** Get a single package by ID */
  async getPackage(packageId: string): Promise<AgencyPackage | null> {
    const { data, error } = await supabase
      .from("agency_packages")
      .select("*, agency:agencies(id,name,logo_url,verified,avg_rating)")
      .eq("id", packageId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data ?? null;
  },

  // ── Reviews ────────────────────────────────────────────────────────────────

  /** Get reviews for an agency, newest first */
  async getAgencyReviews(
    agencyId: string,
    limit = 20,
    offset = 0,
  ): Promise<AgencyReview[]> {
    const { data, error } = await supabase
      .from("agency_reviews")
      .select(
        `
        *,
        author:community_profiles!agency_reviews_user_id_fkey(display_name, avatar_url)
      `,
      )
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data ?? [];
  },

  /** Submit a review for an agency */
  async submitReview(
    agencyId: string,
    userId: string,
    review: {
      rating: number;
      title?: string;
      body: string;
      photos?: string[];
      bookingId?: string;
    },
  ): Promise<AgencyReview> {
    const { data, error } = await supabase
      .from("agency_reviews")
      .insert([
        {
          agency_id: agencyId,
          user_id: userId,
          booking_id: review.bookingId ?? null,
          rating: review.rating,
          title: review.title ?? null,
          body: review.body,
          photos: review.photos ?? [],
          helpful_count: 0,
          verified_purchase: !!review.bookingId,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Recalculate agency avg_rating
    await this._recalculateRating(agencyId);

    return data;
  },

  /** Mark a review as helpful */
  async markReviewHelpful(reviewId: string): Promise<void> {
    const { data: review, error: fetchErr } = await supabase
      .from("agency_reviews")
      .select("helpful_count")
      .eq("id", reviewId)
      .single();

    if (fetchErr) throw fetchErr;

    const { error } = await supabase
      .from("agency_reviews")
      .update({ helpful_count: (review?.helpful_count ?? 0) + 1 })
      .eq("id", reviewId);

    if (error) throw error;
  },

  // ── Enquiries (Contact) ────────────────────────────────────────────────────

  /** Send a contact / enquiry message to an agency */
  async sendEnquiry(
    agencyId: string,
    enquiry: {
      name: string;
      email: string;
      phone?: string;
      message: string;
      packageId?: string;
      userId?: string;
    },
  ): Promise<AgencyEnquiry> {
    const { data, error } = await supabase
      .from("agency_enquiries")
      .insert([
        {
          agency_id: agencyId,
          user_id: enquiry.userId ?? null,
          name: enquiry.name,
          email: enquiry.email,
          phone: enquiry.phone ?? null,
          message: enquiry.message,
          package_id: enquiry.packageId ?? null,
          status: "new",
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ── Live Sessions ──────────────────────────────────────────────────────────

  /** Get upcoming and live sessions for an agency */
  async getLiveSessions(agencyId: string): Promise<AgencyLiveSession[]> {
    const { data, error } = await supabase
      .from("agency_live_sessions")
      .select("*")
      .eq("agency_id", agencyId)
      .in("status", ["scheduled", "live"])
      .order("scheduled_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  /** Get the current live session for an agency (if any) */
  async getCurrentLiveSession(
    agencyId: string,
  ): Promise<AgencyLiveSession | null> {
    const { data, error } = await supabase
      .from("agency_live_sessions")
      .select("*")
      .eq("agency_id", agencyId)
      .eq("status", "live")
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data ?? null;
  },

  // ── Follow / Unfollow ──────────────────────────────────────────────────────

  /** Follow an agency */
  async followAgency(agencyId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("agency_follows")
      .upsert([{ agency_id: agencyId, user_id: userId }], {
        onConflict: "agency_id,user_id",
      });

    if (error) throw error;
    await this._updateFollowersCount(agencyId);
  },

  /** Unfollow an agency */
  async unfollowAgency(agencyId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("agency_follows")
      .delete()
      .eq("agency_id", agencyId)
      .eq("user_id", userId);

    if (error) throw error;
    await this._updateFollowersCount(agencyId);
  },

  /** Check if a user follows an agency */
  async isFollowing(agencyId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from("agency_follows")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("user_id", userId)
      .single();

    return !!data;
  },

  /** Get agencies followed by a user */
  async getFollowedAgencies(userId: string): Promise<Agency[]> {
    const { data, error } = await supabase
      .from("agency_follows")
      .select("agency:agencies(*)")
      .eq("user_id", userId);

    if (error) throw error;
    return (data ?? []).map((row: any) => row.agency).filter(Boolean);
  },

  // ── Save / Unsave ──────────────────────────────────────────────────────────

  /** Save an agency to user's list */
  async saveAgency(agencyId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("saved_agencies")
      .upsert([{ agency_id: agencyId, user_id: userId }], {
        onConflict: "agency_id,user_id",
      });

    if (error) throw error;
  },

  /** Remove a saved agency */
  async unsaveAgency(agencyId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("saved_agencies")
      .delete()
      .eq("agency_id", agencyId)
      .eq("user_id", userId);

    if (error) throw error;
  },

  /** Check if a user has saved an agency */
  async isSaved(agencyId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from("saved_agencies")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("user_id", userId)
      .single();

    return !!data;
  },

  /** Get all saved agencies for a user */
  async getSavedAgencies(userId: string): Promise<Agency[]> {
    const { data, error } = await supabase
      .from("saved_agencies")
      .select("agency:agencies(*)")
      .eq("user_id", userId);

    if (error) throw error;
    return (data ?? []).map((row: any) => row.agency).filter(Boolean);
  },

  // ── Analytics (performance) ────────────────────────────────────────────────

  /** Get latest performance metrics for an agency */
  async getPerformanceMetrics(
    agencyId: string,
  ): Promise<AgencyPerformanceMetrics | null> {
    const { data, error } = await supabase
      .from("agency_performance_metrics")
      .select("*")
      .eq("agency_id", agencyId)
      .order("metric_date", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data ?? null;
  },

  /** Get historical performance data for charts */
  async getPerformanceHistory(
    agencyId: string,
    days = 30,
  ): Promise<AgencyPerformanceMetrics[]> {
    const since = new Date(Date.now() - days * 86_400_000)
      .toISOString()
      .split("T")[0];

    const { data, error } = await supabase
      .from("agency_performance_metrics")
      .select("*")
      .eq("agency_id", agencyId)
      .gte("metric_date", since)
      .order("metric_date", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  // ── Admin operations (copied from agencyManagementService) ─────────────────

  /** Get full admin detail record for an agency */
  async getAdminDetails(agencyId: string): Promise<AgencyAdminDetails | null> {
    const { data, error } = await supabase
      .from("agency_admin_details")
      .select("*")
      .eq("agency_id", agencyId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data ?? null;
  },

  /** Verify an agency (admin only) */
  async verifyAgency(agencyId: string, adminId: string): Promise<boolean> {
    const { error } = await supabase
      .from("agency_admin_details")
      .update({
        verification_status: "verified" as AgencyVerificationStatus,
        verified_by: adminId,
        verified_at: new Date().toISOString(),
      })
      .eq("agency_id", agencyId);

    if (error) throw error;

    // Also flip the public flag
    await supabase
      .from("agencies")
      .update({ verified: true })
      .eq("id", agencyId);

    return true;
  },

  /** Suspend an agency (admin only) */
  async suspendAgency(
    agencyId: string,
    reason: string,
    adminId: string,
  ): Promise<boolean> {
    const { error: adminErr } = await supabase
      .from("agency_admin_details")
      .update({
        is_suspended: true,
        suspension_reason: reason,
        suspension_date: new Date().toISOString(),
      })
      .eq("agency_id", agencyId);

    if (adminErr) throw adminErr;

    const { error: pubErr } = await supabase
      .from("agencies")
      .update({ is_suspended: true })
      .eq("id", agencyId);

    if (pubErr) throw pubErr;
    return true;
  },

  /** Reactivate a suspended agency (admin only) */
  async reactivateAgency(agencyId: string, adminId: string): Promise<boolean> {
    const { error: adminErr } = await supabase
      .from("agency_admin_details")
      .update({
        is_suspended: false,
        suspension_reason: null,
        reactivation_date: new Date().toISOString(),
        verification_status: "reactivated" as AgencyVerificationStatus,
      })
      .eq("agency_id", agencyId);

    if (adminErr) throw adminErr;

    const { error: pubErr } = await supabase
      .from("agencies")
      .update({ is_suspended: false })
      .eq("id", agencyId);

    if (pubErr) throw pubErr;
    return true;
  },

  // ── Private helpers ────────────────────────────────────────────────────────

  async _recalculateRating(agencyId: string): Promise<void> {
    const { data } = await supabase
      .from("agency_reviews")
      .select("rating")
      .eq("agency_id", agencyId);

    if (!data || data.length === 0) return;

    const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;

    await supabase
      .from("agencies")
      .update({
        avg_rating: Math.round(avg * 10) / 10,
        total_reviews: data.length,
      })
      .eq("id", agencyId);
  },

  async _updateFollowersCount(agencyId: string): Promise<void> {
    const { count } = await supabase
      .from("agency_follows")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId);

    await supabase
      .from("agencies")
      .update({ followers_count: count ?? 0 })
      .eq("id", agencyId);
  },
};
