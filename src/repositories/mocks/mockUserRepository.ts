/**
 * Mock User Repository
 * In-memory user management mock with KYC document upload simulation and loyalty points ledger.
 */

import {
  KYCDocument,
  KYCDocumentType,
  UserVerificationStatus,
} from "../../types/admin";
import {
  IUserRepository,
  LoyaltyAccount,
  LoyaltyRedemptionResult,
  LoyaltyTransaction,
  RepositoryError,
  UploadKYCDocumentDTO,
  UserPreferences,
  UserProfile,
} from "../types";

export class MockUserRepository implements IUserRepository {
  public simulatedLatencyMs = 10;
  public shouldFail = false;

  private profiles: Map<string, UserProfile> = new Map();
  private kycDocs: Map<string, KYCDocument[]> = new Map();
  private preferences: Map<string, UserPreferences> = new Map();
  private loyaltyAccounts: Map<string, LoyaltyAccount> = new Map();
  private loyaltyTransactions: Map<string, LoyaltyTransaction[]> = new Map();

  constructor() {
    // Seed test profile
    const defaultId = "user-test-123";
    this.profiles.set(defaultId, {
      id: defaultId,
      email: "test.traveler@example.com",
      full_name: "Rafiqul Islam",
      first_name: "Rafiqul",
      last_name: "Islam",
      phone: "+8801711223344",
      role: "user",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
      created_at: new Date().toISOString(),
    });

    this.loyaltyAccounts.set(defaultId, {
      id: `loyalty-${defaultId}`,
      user_id: defaultId,
      tier: "gold",
      points_balance: 6500,
      lifetime_points: 8200,
      created_at: new Date().toISOString(),
    });
  }

  private async delay(): Promise<void> {
    if (this.simulatedLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.simulatedLatencyMs));
    }
    if (this.shouldFail) {
      throw new RepositoryError({
        message: "Mock user repository operation failed",
        code: "DATABASE_ERROR",
        statusCode: 500,
      });
    }
  }

  async getProfile(userId = "user-test-123"): Promise<UserProfile | null> {
    await this.delay();
    return this.profiles.get(userId) || null;
  }

  async updateProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    await this.delay();
    const existing = this.profiles.get(userId) || {
      id: userId,
      email: "user@example.com",
      created_at: new Date().toISOString(),
    };
    const updated: UserProfile = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.profiles.set(userId, updated);
    return updated;
  }

  async createProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    return this.updateProfile(userId, data);
  }

  async uploadKYCDocument(userId: string, document: UploadKYCDocumentDTO): Promise<KYCDocument> {
    await this.delay();
    const docId = `kyc-${Date.now()}`;
    const newDoc: KYCDocument = {
      id: docId,
      user_id: userId,
      document_type: document.documentType,
      document_number: document.documentNumber,
      file_url: document.fileUri || "https://storage.example.com/mock-doc.jpg",
      file_path: `kyc-documents/${userId}/${document.fileName}`,
      expiry_date: document.expiryDate,
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const userDocs = this.kycDocs.get(userId) || [];
    userDocs.unshift(newDoc);
    this.kycDocs.set(userId, userDocs);

    return newDoc;
  }

  async getKYCDocuments(userId: string): Promise<KYCDocument[]> {
    await this.delay();
    return this.kycDocs.get(userId) || [];
  }

  async getKYCStatus(userId: string): Promise<UserVerificationStatus> {
    await this.delay();
    const docs = this.kycDocs.get(userId) || [];
    if (docs.length === 0) return UserVerificationStatus.PENDING;
    const hasVerified = docs.some((d) => d.is_verified);
    return hasVerified ? UserVerificationStatus.VERIFIED : UserVerificationStatus.PENDING;
  }

  async getPreferences(userId: string): Promise<UserPreferences | null> {
    await this.delay();
    return (
      this.preferences.get(userId) || {
        user_id: userId,
        preferred_currency: "BDT",
        preferred_language: "en",
        theme: "system",
        email_notifications: true,
        push_notifications: true,
        sms_notifications: false,
      }
    );
  }

  async updatePreferences(
    userId: string,
    prefs: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    await this.delay();
    const existing = await this.getPreferences(userId);
    const updated: UserPreferences = {
      ...existing!,
      ...prefs,
      updated_at: new Date().toISOString(),
    };
    this.preferences.set(userId, updated);
    return updated;
  }

  async getLoyaltyAccount(userId: string): Promise<LoyaltyAccount | null> {
    await this.delay();
    let account = this.loyaltyAccounts.get(userId);
    if (!account) {
      account = {
        id: `loyalty-${userId}`,
        user_id: userId,
        tier: "bronze",
        points_balance: 0,
        lifetime_points: 0,
        created_at: new Date().toISOString(),
      };
      this.loyaltyAccounts.set(userId, account);
    }
    return account;
  }

  async getLoyaltyHistory(loyaltyAccountId: string): Promise<LoyaltyTransaction[]> {
    await this.delay();
    return this.loyaltyTransactions.get(loyaltyAccountId) || [];
  }

  async redeemLoyaltyPoints(
    userId: string,
    points: number,
    rewardId?: string,
    description?: string,
  ): Promise<LoyaltyRedemptionResult> {
    await this.delay();
    const account = await this.getLoyaltyAccount(userId);
    if (!account || account.points_balance < points) {
      throw new RepositoryError({
        message: "Insufficient loyalty points",
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    account.points_balance -= points;
    const tx: LoyaltyTransaction = {
      id: `tx-${Date.now()}`,
      loyalty_account_id: account.id,
      points_amount: -points,
      transaction_type: "redeem",
      reference_id: rewardId,
      description: description || `Redeemed ${points} points`,
      created_at: new Date().toISOString(),
    };

    const history = this.loyaltyTransactions.get(account.id) || [];
    history.unshift(tx);
    this.loyaltyTransactions.set(account.id, history);

    return {
      success: true,
      remainingPoints: account.points_balance,
      transactionId: tx.id,
    };
  }

  async earnLoyaltyPoints(
    userId: string,
    points: number,
    bookingId?: string,
    description?: string,
  ): Promise<LoyaltyAccount> {
    await this.delay();
    const account = await this.getLoyaltyAccount(userId);
    if (!account) {
      throw new RepositoryError({
        message: "Loyalty account not found",
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    account.points_balance += points;
    account.lifetime_points += points;

    const tx: LoyaltyTransaction = {
      id: `tx-${Date.now()}`,
      loyalty_account_id: account.id,
      points_amount: points,
      transaction_type: "earn",
      reference_id: bookingId,
      description: description || `Earned ${points} points`,
      created_at: new Date().toISOString(),
    };

    const history = this.loyaltyTransactions.get(account.id) || [];
    history.unshift(tx);
    this.loyaltyTransactions.set(account.id, history);

    return account;
  }
}
