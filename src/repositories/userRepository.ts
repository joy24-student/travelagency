/**
 * User Repository
 * User profile management, KYC document uploads with storage, preferences, and loyalty rewards.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { decode } from "base64-arraybuffer";
import {
  KYCDocument,
  KYCDocumentType,
  UserVerificationStatus,
} from "../types/admin";
import { supabase } from "../utils/supabase";
import { BaseRepository } from "./baseRepository";
import {
  IUserRepository,
  LoyaltyAccount,
  LoyaltyRedemptionResult,
  LoyaltyTransaction,
  RepositoryError,
  UploadKYCDocumentDTO,
  UserPreferences,
  UserProfile,
} from "./types";

export class UserRepository
  extends BaseRepository<any>
  implements IUserRepository
{
  constructor(customClient?: SupabaseClient) {
    super("user_profiles", "*", customClient);
  }

  // ==========================================================================
  // PROFILE MANAGEMENT
  // ==========================================================================

  async getProfile(userId?: string): Promise<UserProfile | null> {
    try {
      let targetUserId = userId;

      if (!targetUserId) {
        const {
          data: { user },
          error: authError,
        } = await this.client.auth.getUser();

        if (authError || !user) {
          return null;
        }
        targetUserId = user.id;
      }

      const { data, error } = await this.client
        .from("user_profiles")
        .select("*")
        .eq("id", targetUserId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw this.normalizeError(error, `getProfile(${targetUserId})`);
      }

      if (!data) {
        // Fallback to Auth metadata if profile row not yet created
        const {
          data: { user },
        } = await this.client.auth.getUser();

        if (user && user.id === targetUserId) {
          return {
            id: user.id,
            email: user.email || "",
            full_name:
              (user.user_metadata as any)?.full_name ||
              user.email?.split("@")[0] ||
              "Traveler",
            first_name: (user.user_metadata as any)?.first_name,
            last_name: (user.user_metadata as any)?.last_name,
            avatar_url:
              (user.user_metadata as any)?.avatar_url ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
            phone: user.phone || "",
            created_at: user.created_at,
          };
        }
        return null;
      }

      return {
        id: data.id,
        email: data.email || "",
        full_name: data.full_name || `${data.first_name || ""} ${data.last_name || ""}`.trim(),
        first_name: data.first_name,
        last_name: data.last_name,
        avatar_url: data.avatar_url,
        phone: data.phone,
        gender: data.gender,
        date_of_birth: data.date_of_birth,
        nationality: data.nationality,
        address: data.address,
        city: data.city,
        country: data.country,
        postal_code: data.postal_code,
        role: data.role || "user",
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (err) {
      throw this.normalizeError(err, "getProfile");
    }
  }

  async updateProfile(
    userId: string,
    data: Partial<UserProfile>,
  ): Promise<UserProfile> {
    try {
      const { data: updated, error } = await this.client
        .from("user_profiles")
        .upsert(
          {
            id: userId,
            ...data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        )
        .select()
        .single();

      if (error) {
        throw this.normalizeError(error, `updateProfile(${userId})`);
      }

      return updated as UserProfile;
    } catch (err) {
      throw this.normalizeError(err, `updateProfile(${userId})`);
    }
  }

  async createProfile(
    userId: string,
    data: Partial<UserProfile>,
  ): Promise<UserProfile> {
    return this.updateProfile(userId, data);
  }

  // ==========================================================================
  // KYC DOCUMENT UPLOADS & VERIFICATION
  // ==========================================================================

  async uploadKYCDocument(
    userId: string,
    document: UploadKYCDocumentDTO,
  ): Promise<KYCDocument> {
    try {
      const fileExt = document.fileName.split(".").pop() || "jpg";
      const sanitizedDocType = document.documentType.toLowerCase();
      const storagePath = `${userId}/${sanitizedDocType}_${Date.now()}.${fileExt}`;
      const bucketName = "kyc-documents";

      let fileUrl = "";

      // 1. Upload to Supabase Storage if base64 provided
      if (document.fileBase64) {
        try {
          const fileBuffer = decode(document.fileBase64);
          const { error: uploadError } = await this.client.storage
            .from(bucketName)
            .upload(storagePath, fileBuffer, {
              contentType: document.mimeType,
              upsert: true,
            });

          if (!uploadError) {
            const { data: urlData } = this.client.storage
              .from(bucketName)
              .getPublicUrl(storagePath);
            fileUrl = urlData?.publicUrl || "";
          }
        } catch {
          // Fallback to storing file URI if storage bucket is offline/restricted
          fileUrl = document.fileUri;
        }
      } else {
        fileUrl = document.fileUri;
      }

      // 2. Insert metadata record in kyc_documents table
      const newDocRecord = {
        user_id: userId,
        document_type: document.documentType,
        document_number: document.documentNumber || null,
        file_url: fileUrl,
        file_path: storagePath,
        expiry_date: document.expiryDate || null,
        is_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: insertedDoc, error: insertError } = await this.client
        .from("kyc_documents")
        .insert(newDocRecord)
        .select()
        .single();

      if (insertError) {
        throw this.normalizeError(insertError, "uploadKYCDocument");
      }

      // 3. Mark user's KYC status as PENDING review
      try {
        await this.client
          .from("user_verification_status")
          .upsert(
            {
              user_id: userId,
              kyc_status: UserVerificationStatus.PENDING,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
      } catch {
        // Non-critical status upsert
      }

      return {
        id: insertedDoc.id,
        user_id: insertedDoc.user_id,
        document_type: insertedDoc.document_type,
        document_number: insertedDoc.document_number,
        file_url: insertedDoc.file_url,
        file_path: insertedDoc.file_path,
        expiry_date: insertedDoc.expiry_date,
        is_verified: insertedDoc.is_verified || false,
        verification_notes: insertedDoc.verification_notes,
        verified_by: insertedDoc.verified_by,
        verified_at: insertedDoc.verified_at,
        created_at: insertedDoc.created_at,
        updated_at: insertedDoc.updated_at,
      };
    } catch (err) {
      throw this.normalizeError(err, "uploadKYCDocument");
    }
  }

  async getKYCDocuments(userId: string): Promise<KYCDocument[]> {
    try {
      const { data, error } = await this.client
        .from("kyc_documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw this.normalizeError(error, `getKYCDocuments(${userId})`);
      }

      return (data || []).map((d: any) => ({
        id: d.id,
        user_id: d.user_id,
        document_type: d.document_type as KYCDocumentType,
        document_number: d.document_number,
        file_url: d.file_url,
        file_path: d.file_path,
        expiry_date: d.expiry_date,
        is_verified: Boolean(d.is_verified),
        verification_notes: d.verification_notes,
        verified_by: d.verified_by,
        verified_at: d.verified_at,
        face_match_score: d.face_match_score,
        created_at: d.created_at,
        updated_at: d.updated_at,
      }));
    } catch (err) {
      throw this.normalizeError(err, `getKYCDocuments(${userId})`);
    }
  }

  async getKYCStatus(userId: string): Promise<UserVerificationStatus> {
    try {
      const { data, error } = await this.client
        .from("user_verification_status")
        .select("kyc_status")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw this.normalizeError(error, `getKYCStatus(${userId})`);
      }

      return (data?.kyc_status as UserVerificationStatus) || UserVerificationStatus.PENDING;
    } catch (err) {
      throw this.normalizeError(err, `getKYCStatus(${userId})`);
    }
  }

  // ==========================================================================
  // PREFERENCES
  // ==========================================================================

  async getPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await this.client
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw this.normalizeError(error, `getPreferences(${userId})`);
      }

      if (!data) {
        return {
          user_id: userId,
          preferred_currency: "BDT",
          preferred_language: "en",
          theme: "system",
          email_notifications: true,
          push_notifications: true,
          sms_notifications: false,
        };
      }

      return {
        user_id: data.user_id,
        preferred_currency: data.preferred_currency || "BDT",
        preferred_language: data.preferred_language || "en",
        theme: data.theme || "system",
        email_notifications: data.email_notifications ?? true,
        push_notifications: data.push_notifications ?? true,
        sms_notifications: data.sms_notifications ?? false,
        dietary_requirements: data.dietary_requirements,
        seat_preference: data.seat_preference,
        cabin_preference: data.cabin_preference,
        updated_at: data.updated_at,
      };
    } catch (err) {
      throw this.normalizeError(err, `getPreferences(${userId})`);
    }
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    try {
      const { data, error } = await this.client
        .from("user_preferences")
        .upsert(
          {
            user_id: userId,
            ...preferences,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
        .select()
        .single();

      if (error) {
        throw this.normalizeError(error, `updatePreferences(${userId})`);
      }

      return data as UserPreferences;
    } catch (err) {
      throw this.normalizeError(err, `updatePreferences(${userId})`);
    }
  }

  // ==========================================================================
  // LOYALTY POINTS & REWARDS
  // ==========================================================================

  async getLoyaltyAccount(userId: string): Promise<LoyaltyAccount | null> {
    try {
      let { data, error } = await this.client
        .from("loyalty_accounts")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw this.normalizeError(error, `getLoyaltyAccount(${userId})`);
      }

      if (!data) {
        // Initialize default loyalty account for user
        const { data: created, error: createError } = await this.client
          .from("loyalty_accounts")
          .insert({
            user_id: userId,
            tier: "bronze",
            points_balance: 0,
            lifetime_points: 0,
          })
          .select()
          .single();

        if (!createError && created) {
          data = created;
        } else {
          return {
            id: `loyalty-${userId}`,
            user_id: userId,
            tier: "bronze",
            points_balance: 0,
            lifetime_points: 0,
            created_at: new Date().toISOString(),
          };
        }
      }

      return {
        id: data.id,
        user_id: data.user_id,
        tier: data.tier || "bronze",
        points_balance: Number(data.points_balance || 0),
        lifetime_points: Number(data.lifetime_points || 0),
        tier_expires_at: data.tier_expires_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (err) {
      throw this.normalizeError(err, `getLoyaltyAccount(${userId})`);
    }
  }

  async getLoyaltyHistory(
    loyaltyAccountId: string,
    limit = 50,
  ): Promise<LoyaltyTransaction[]> {
    try {
      const { data, error } = await this.client
        .from("loyalty_points_transactions")
        .select("*")
        .eq("loyalty_account_id", loyaltyAccountId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw this.normalizeError(error, `getLoyaltyHistory(${loyaltyAccountId})`);
      }

      return (data || []).map((t: any) => ({
        id: t.id,
        loyalty_account_id: t.loyalty_account_id,
        points_amount: Number(t.points_amount || 0),
        transaction_type: t.transaction_type || "earn",
        reference_id: t.reference_id,
        description: t.description,
        created_at: t.created_at,
      }));
    } catch (err) {
      throw this.normalizeError(err, `getLoyaltyHistory(${loyaltyAccountId})`);
    }
  }

  async redeemLoyaltyPoints(
    userId: string,
    points: number,
    rewardId?: string,
    description?: string,
  ): Promise<LoyaltyRedemptionResult> {
    try {
      const account = await this.getLoyaltyAccount(userId);
      if (!account) {
        throw new RepositoryError({
          message: "Loyalty account not found",
          code: "NOT_FOUND",
          statusCode: 404,
        });
      }

      if (account.points_balance < points) {
        throw new RepositoryError({
          message: `Insufficient loyalty points balance (${account.points_balance} available, ${points} requested)`,
          code: "VALIDATION_ERROR",
          statusCode: 400,
        });
      }

      const newBalance = account.points_balance - points;

      // Update account balance
      const { error: updateError } = await this.client
        .from("loyalty_accounts")
        .update({
          points_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);

      if (updateError) {
        throw this.normalizeError(updateError, "redeemLoyaltyPoints.updateBalance");
      }

      // Record transaction
      const { data: tx, error: txError } = await this.client
        .from("loyalty_points_transactions")
        .insert({
          loyalty_account_id: account.id,
          points_amount: -points,
          transaction_type: "redeem",
          reference_id: rewardId || null,
          description: description || `Redeemed ${points} loyalty points`,
        })
        .select()
        .single();

      if (txError) {
        // Non-blocking log
      }

      return {
        success: true,
        remainingPoints: newBalance,
        transactionId: tx?.id,
        message: `Successfully redeemed ${points} points`,
      };
    } catch (err) {
      throw this.normalizeError(err, "redeemLoyaltyPoints");
    }
  }

  async earnLoyaltyPoints(
    userId: string,
    points: number,
    bookingId?: string,
    description?: string,
  ): Promise<LoyaltyAccount> {
    try {
      const account = await this.getLoyaltyAccount(userId);
      if (!account) {
        throw new RepositoryError({
          message: "Loyalty account not found",
          code: "NOT_FOUND",
          statusCode: 404,
        });
      }

      const newBalance = account.points_balance + points;
      const newLifetime = account.lifetime_points + points;

      // Tier progression logic: Bronze (0) -> Silver (1,000) -> Gold (5,000) -> Platinum (15,000) -> Diamond (30,000)
      let tier = account.tier;
      if (newLifetime >= 30000) tier = "diamond";
      else if (newLifetime >= 15000) tier = "platinum";
      else if (newLifetime >= 5000) tier = "gold";
      else if (newLifetime >= 1000) tier = "silver";

      const { data: updated, error: updateError } = await this.client
        .from("loyalty_accounts")
        .update({
          points_balance: newBalance,
          lifetime_points: newLifetime,
          tier,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id)
        .select()
        .single();

      if (updateError) {
        throw this.normalizeError(updateError, "earnLoyaltyPoints.updateBalance");
      }

      try {
        await this.client
          .from("loyalty_points_transactions")
          .insert({
            loyalty_account_id: account.id,
            points_amount: points,
            transaction_type: "earn",
            reference_id: bookingId || null,
            description: description || `Earned ${points} points for booking`,
          });
      } catch {
        // Non-critical transaction log
      }

      return {
        id: updated.id,
        user_id: updated.user_id,
        tier: updated.tier,
        points_balance: updated.points_balance,
        lifetime_points: updated.lifetime_points,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      };
    } catch (err) {
      throw this.normalizeError(err, "earnLoyaltyPoints");
    }
  }
}
