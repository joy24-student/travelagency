import { supabase } from "./supabaseClient";

/**
 * ENHANCED AGEN (Agency Portal) SERVICE LAYER
 * Comprehensive Supabase integration with Admin Panel oversight
 * Production-ready with audit logging and real-time updates
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AgencyProfile {
  id: string;
  owner_user_id: string;
  name: string;
  type: string;
  email?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  description?: string | null;
  verification_status: "pending" | "verified" | "rejected" | "suspended";
  status: "active" | "inactive" | "suspended";
  rating: number;
  created_at?: string;
  updated_at?: string;
  admin_notes?: string;
}

export interface AgencyMetrics {
  totalRevenue: number;
  totalBookings: number;
  activeCustomers: number;
  conversionRate: number;
  revenueGrowth: number;
  bookingGrowth: number;
  customerGrowth: number;
  avgOrderValue: number;
  rating?: number;
  completionRate?: number;
}

export interface AgencyBooking {
  id: string;
  booking_reference: string;
  product_type: string;
  status: string;
  destination_city: string;
  destination_country?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  number_of_guests: number;
  final_price: number;
  currency: string;
  user_id: string;
  agency_id?: string;
  created_at: string;
  updated_at?: string;
  traveler_details?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  notes?: string;
}

export interface AgencyTeamMember {
  id: string;
  agency_id: string;
  user_id: string;
  name: string;
  email: string;
  role: "owner" | "manager" | "staff" | "viewer";
  status: "active" | "inactive" | "pending";
  created_at: string;
  permissions?: string[];
}

export interface AgencyActivityLog {
  id: string;
  agency_id: string;
  actor_user_id: string;
  action: string;
  details: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AgencyDocument {
  id: string;
  agency_id: string;
  document_type: string;
  document_file_url: string;
  verification_status: "pending" | "verified" | "rejected";
  uploaded_at: string;
  verified_at?: string;
  rejection_reason?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const emptyMetrics: AgencyMetrics = {
  totalRevenue: 0,
  totalBookings: 0,
  activeCustomers: 0,
  conversionRate: 0,
  revenueGrowth: 0,
  bookingGrowth: 0,
  customerGrowth: 0,
  avgOrderValue: 0,
  rating: 0,
  completionRate: 0,
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected Supabase error";
}

/**
 * Log activity to audit trail with admin panel visibility
 */
async function logAgencyActivity(
  agencyId: string,
  action: string,
  details: string,
  severity: "info" | "warning" | "critical" = "info",
): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    await supabase.from("agency_activity_logs").insert({
      agency_id: agencyId,
      actor_user_id: userData.user.id,
      action,
      details,
      severity,
      created_at: new Date().toISOString(),
    });

    // If critical, also log to admin alerts table for immediate visibility
    if (severity === "critical") {
      await supabase.from("admin_alerts").insert({
        source: "agency_portal",
        agency_id: agencyId,
        alert_type: action,
        message: details,
        severity: "high",
        created_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}

// ============================================================================
// IDENTITY & AUTHENTICATION SERVICES
// ============================================================================

export const agencyIdentityService = {
  /**
   * Get current agency for authenticated user
   */
  async getCurrentAgency(userId: string): Promise<AgencyProfile | null> {
    try {
      // Check if user owns an agency
      const { data: ownedAgency, error: ownedError } = await supabase
        .from("agencies")
        .select("*")
        .eq("owner_user_id", userId)
        .limit(1)
        .maybeSingle();

      if (ownedAgency) {
        return ownedAgency as AgencyProfile;
      }

      // Check if user is a team member of an agency
      const { data: memberData, error: memberError } = await supabase
        .from("agency_team_members")
        .select("agencies(*)")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (memberData?.agencies) {
        const agency = Array.isArray(memberData.agencies)
          ? memberData.agencies[0]
          : memberData.agencies;
        return (agency as AgencyProfile) || null;
      }

      return null;
    } catch (error) {
      console.error("Error fetching current agency:", error);
      return null;
    }
  },

  /**
   * Get agency by ID
   */
  async getAgencyById(agencyId: string): Promise<AgencyProfile | null> {
    try {
      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .eq("id", agencyId)
        .single();

      return data as AgencyProfile;
    } catch (error) {
      console.error("Error fetching agency by ID:", error);
      return null;
    }
  },
};

// ============================================================================
// DASHBOARD & ANALYTICS SERVICES
// ============================================================================

export const agencyDashboardService = {
  /**
   * Calculate comprehensive metrics for agency
   */
  async getMetrics(agencyId: string): Promise<AgencyMetrics> {
    try {
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, status, final_price, user_id, created_at")
        .eq("agency_id", agencyId);

      if (bookingsError || !bookings) {
        console.warn("Dashboard metrics error:", bookingsError?.message);
        return emptyMetrics;
      }

      // Calculate metrics
      const completed = bookings.filter((b) =>
        ["confirmed", "completed"].includes(String(b.status)),
      );
      const totalRevenue = completed.reduce(
        (sum, b) => sum + Number(b.final_price || 0),
        0,
      );
      const customerIds = new Set(
        bookings.map((b) => b.user_id).filter(Boolean),
      );

      // Calculate growth percentages (compare to previous period)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const thisMonth = bookings.filter((b) =>
        new Date(b.created_at) >= thirtyDaysAgo,
      );
      const lastMonth = bookings.filter(
        (b) =>
          new Date(b.created_at) >= sixtyDaysAgo &&
          new Date(b.created_at) < thirtyDaysAgo,
      );

      return {
        totalRevenue,
        totalBookings: bookings.length,
        activeCustomers: customerIds.size,
        conversionRate: bookings.length
          ? Math.round((completed.length / bookings.length) * 1000) / 10
          : 0,
        revenueGrowth:
          lastMonth.length > 0
            ? Math.round(
                (((thisMonth.length - lastMonth.length) / lastMonth.length) *
                  100) *
                  10,
              ) / 10
            : 0,
        bookingGrowth:
          lastMonth.length > 0
            ? Math.round(
                (((thisMonth.length - lastMonth.length) / lastMonth.length) *
                  100) *
                  10,
              ) / 10
            : 0,
        customerGrowth: 0,
        avgOrderValue:
          completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0,
        rating: 4.5,
        completionRate:
          bookings.length > 0
            ? Math.round((completed.length / bookings.length) * 1000) / 10
            : 0,
      };
    } catch (error) {
      console.error("Error calculating metrics:", error);
      return emptyMetrics;
    }
  },

  /**
   * Get recent activity logs for dashboard
   */
  async getRecentActivity(
    agencyId: string,
    limit = 20,
  ): Promise<AgencyActivityLog[]> {
    try {
      const { data, error } = await supabase
        .from("agency_activity_logs")
        .select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(limit);

      return (data as AgencyActivityLog[]) || [];
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      return [];
    }
  },

  /**
   * Subscribe to real-time metrics updates (for live dashboard)
   */
  subscribeToMetrics(
    agencyId: string,
    callback: (metrics: AgencyMetrics) => void,
  ) {
    const subscription = supabase
      .from("bookings")
      .on("*", (payload) => {
        if (payload.new?.agency_id === agencyId) {
          this.getMetrics(agencyId).then(callback);
        }
      })
      .subscribe();

    return subscription;
  },
};

// ============================================================================
// BOOKINGS MANAGEMENT SERVICES
// ============================================================================

export const agencyBookingsService = {
  /**
   * Get all bookings for an agency with optional filtering
   */
  async getBookings(
    agencyId: string,
    status?: string,
    limit = 50,
  ): Promise<AgencyBooking[]> {
    try {
      let query = supabase
        .from("bookings")
        .select(
          `
          id,
          booking_reference,
          product_type,
          status,
          destination_city,
          destination_country,
          start_date,
          end_date,
          number_of_guests,
          final_price,
          currency,
          user_id,
          created_at,
          updated_at,
          notes,
          traveler_details(first_name,last_name,email)
        `,
        )
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((booking: any) => ({
        ...booking,
        traveler_details: Array.isArray(booking.traveler_details)
          ? booking.traveler_details[0] || null
          : booking.traveler_details || null,
      })) as AgencyBooking[];
    } catch (error) {
      console.error("Error fetching bookings:", error);
      return [];
    }
  },

  /**
   * Get single booking detail
   */
  async getBookingDetail(
    agencyId: string,
    bookingId: string,
  ): Promise<AgencyBooking | null> {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          id,
          booking_reference,
          product_type,
          status,
          destination_city,
          destination_country,
          start_date,
          end_date,
          number_of_guests,
          final_price,
          currency,
          user_id,
          created_at,
          updated_at,
          notes,
          traveler_details(*)
        `,
        )
        .eq("id", bookingId)
        .eq("agency_id", agencyId)
        .single();

      return data as AgencyBooking;
    } catch (error) {
      console.error("Error fetching booking detail:", error);
      return null;
    }
  },

  /**
   * Update booking status with audit logging
   */
  async updateBookingStatus(
    agencyId: string,
    bookingId: string,
    status: string,
    notes?: string,
  ): Promise<AgencyBooking | null> {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status, ...(notes && { notes }), updated_at: new Date() })
        .eq("id", bookingId)
        .eq("agency_id", agencyId)
        .select()
        .single();

      if (error) throw error;

      await logAgencyActivity(
        agencyId,
        "booking_status_updated",
        `Booking ${bookingId} status changed to ${status}`,
      );

      return data as AgencyBooking;
    } catch (error) {
      console.error("Error updating booking status:", error);
      throw error;
    }
  },

  /**
   * Create new booking
   */
  async createBooking(
    agencyId: string,
    bookingData: Partial<AgencyBooking>,
  ): Promise<AgencyBooking | null> {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          ...bookingData,
          agency_id: agencyId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await logAgencyActivity(
        agencyId,
        "booking_created",
        `New booking created: ${bookingData.booking_reference}`,
      );

      return data as AgencyBooking;
    } catch (error) {
      console.error("Error creating booking:", error);
      throw error;
    }
  },

  /**
   * Cancel booking
   */
  async cancelBooking(
    agencyId: string,
    bookingId: string,
    reason: string,
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", notes: reason })
        .eq("id", bookingId)
        .eq("agency_id", agencyId);

      if (error) throw error;

      await logAgencyActivity(
        agencyId,
        "booking_cancelled",
        `Booking ${bookingId} cancelled: ${reason}`,
      );

      return true;
    } catch (error) {
      console.error("Error cancelling booking:", error);
      return false;
    }
  },

  /**
   * Subscribe to booking updates in real-time
   */
  subscribeToBookings(
    agencyId: string,
    callback: (bookings: AgencyBooking[]) => void,
  ) {
    return supabase
      .from("bookings")
      .on("*", (payload) => {
        if (payload.new?.agency_id === agencyId) {
          this.getBookings(agencyId).then(callback);
        }
      })
      .subscribe();
  },
};

// ============================================================================
// CUSTOMERS MANAGEMENT SERVICES
// ============================================================================

export const agencyCustomersService = {
  /**
   * Get all customers for an agency
   */
  async getCustomers(agencyId: string): Promise<any[]> {
    try {
      const bookings = await agencyBookingsService.getBookings(agencyId);
      const customers = new Map<string, any>();

      bookings.forEach((booking) => {
        const traveler = booking.traveler_details;
        const name = traveler
          ? `${traveler.first_name} ${traveler.last_name}`.trim()
          : `Customer ${booking.user_id.slice(0, 6)}`;

        const existing = customers.get(booking.user_id) || {
          id: booking.user_id,
          name,
          email: traveler?.email,
          bookings: 0,
          spent: 0,
          vip: false,
          lastBooking: booking.created_at,
        };

        existing.bookings += 1;
        existing.spent += Number(booking.final_price || 0);
        existing.vip = existing.spent >= 10000 || existing.bookings >= 5;
        existing.lastBooking = booking.created_at;
        customers.set(booking.user_id, existing);
      });

      return Array.from(customers.values()).sort((a, b) => b.spent - a.spent);
    } catch (error) {
      console.error("Error fetching customers:", error);
      return [];
    }
  },

  /**
   * Get single customer detail with booking history
   */
  async getCustomerDetail(
    agencyId: string,
    customerId: string,
  ): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", customerId)
        .single();

      if (error) throw error;

      const bookings = await agencyBookingsService.getBookings(agencyId);
      const customerBookings = bookings.filter((b) => b.user_id === customerId);

      return {
        ...data,
        bookings: customerBookings,
        totalSpent: customerBookings.reduce(
          (sum, b) => sum + Number(b.final_price || 0),
          0,
        ),
      };
    } catch (error) {
      console.error("Error fetching customer detail:", error);
      return null;
    }
  },
};

// ============================================================================
// MESSAGES & COMMUNICATIONS SERVICES
// ============================================================================

export const agencyMessagesService = {
  /**
   * Get all messages for an agency
   */
  async getMessages(agencyId: string, limit = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("agency_messages")
        .select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error("Error fetching messages:", error);
      return [];
    }
  },

  /**
   * Send message to customer or team member
   */
  async sendMessage(
    agencyId: string,
    recipientUserId: string,
    content: string,
    subject?: string,
    messageType: "support" | "notification" | "alert" = "support",
  ): Promise<any | null> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("agency_messages")
        .insert({
          agency_id: agencyId,
          sender_user_id: userData.user.id,
          recipient_user_id: recipientUserId,
          subject,
          content,
          message_type: messageType,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await logAgencyActivity(
        agencyId,
        "message_sent",
        `Message sent to ${recipientUserId}: ${subject}`,
      );

      return data;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  /**
   * Subscribe to new messages in real-time
   */
  subscribeToMessages(
    agencyId: string,
    callback: (message: any) => void,
  ) {
    return supabase
      .from("agency_messages")
      .on("INSERT", (payload) => {
        if (payload.new?.agency_id === agencyId) {
          callback(payload.new);
        }
      })
      .subscribe();
  },
};

// ============================================================================
// PROFILE & TEAM MANAGEMENT SERVICES
// ============================================================================

export const agencyProfileService = {
  /**
   * Get complete agency profile
   */
  async getProfile(agencyId: string): Promise<AgencyProfile | null> {
    try {
      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .eq("id", agencyId)
        .single();

      if (error) throw error;
      return data as AgencyProfile;
    } catch (error) {
      console.error("Error fetching agency profile:", error);
      return null;
    }
  },

  /**
   * Update agency profile with audit logging
   */
  async updateProfile(
    agencyId: string,
    updates: Partial<AgencyProfile>,
  ): Promise<AgencyProfile | null> {
    try {
      const { data, error } = await supabase
        .from("agencies")
        .update({ ...updates, updated_at: new Date() })
        .eq("id", agencyId)
        .select()
        .single();

      if (error) throw error;

      await logAgencyActivity(
        agencyId,
        "profile_updated",
        `Agency profile updated`,
      );

      return data as AgencyProfile;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  },

  /**
   * Get all team members
   */
  async getTeamMembers(agencyId: string): Promise<AgencyTeamMember[]> {
    try {
      const { data, error } = await supabase
        .from("agency_team_members")
        .select("*")
        .eq("agency_id", agencyId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      return (data as AgencyTeamMember[]) || [];
    } catch (error) {
      console.error("Error fetching team members:", error);
      return [];
    }
  },

  /**
   * Add new team member
   */
  async addTeamMember(
    agencyId: string,
    memberData: Partial<AgencyTeamMember>,
  ): Promise<AgencyTeamMember | null> {
    try {
      const { data, error } = await supabase
        .from("agency_team_members")
        .insert({
          ...memberData,
          agency_id: agencyId,
          status: "active",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await logAgencyActivity(
        agencyId,
        "team_member_added",
        `New team member added: ${memberData.email}`,
      );

      return data as AgencyTeamMember;
    } catch (error) {
      console.error("Error adding team member:", error);
      throw error;
    }
  },

  /**
   * Remove team member
   */
  async removeTeamMember(
    agencyId: string,
    memberId: string,
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("agency_team_members")
        .update({ status: "inactive" })
        .eq("id", memberId)
        .eq("agency_id", agencyId);

      if (error) throw error;

      await logAgencyActivity(
        agencyId,
        "team_member_removed",
        `Team member ${memberId} removed`,
      );

      return true;
    } catch (error) {
      console.error("Error removing team member:", error);
      return false;
    }
  },
};

// ============================================================================
// FINANCIAL SERVICES
// ============================================================================

export const agencyPaymentsService = {
  /**
   * Get all bank accounts for agency
   */
  async getBankAccounts(agencyId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("agency_bank_accounts")
        .select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });

      return data || [];
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      return [];
    }
  },

  /**
   * Add bank account
   */
  async addBankAccount(
    agencyId: string,
    accountData: any,
  ): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from("agency_bank_accounts")
        .insert({
          ...accountData,
          agency_id: agencyId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await logAgencyActivity(
        agencyId,
        "bank_account_added",
        `Bank account added: ${accountData.account_holder_name}`,
        "info",
      );

      return data;
    } catch (error) {
      console.error("Error adding bank account:", error);
      throw error;
    }
  },

  /**
   * Get payment history
   */
  async getPaymentHistory(agencyId: string, limit = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("agency_payments")
        .select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error("Error fetching payment history:", error);
      return [];
    }
  },
};

// ============================================================================
// VERIFICATION & DOCUMENTS SERVICES
// ============================================================================

export const agencyVerificationService = {
  /**
   * Get all documents for agency
   */
  async getDocuments(agencyId: string): Promise<AgencyDocument[]> {
    try {
      const { data, error } = await supabase
        .from("agency_documents")
        .select("*")
        .eq("agency_id", agencyId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;

      return (data as AgencyDocument[]) || [];
    } catch (error) {
      console.error("Error fetching documents:", error);
      return [];
    }
  },

  /**
   * Upload verification document
   */
  async uploadDocument(
    agencyId: string,
    docData: any,
  ): Promise<AgencyDocument | null> {
    try {
      const { data, error } = await supabase
        .from("agency_documents")
        .insert({
          ...docData,
          agency_id: agencyId,
          verification_status: "pending",
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await logAgencyActivity(
        agencyId,
        "document_uploaded",
        `Document uploaded for verification: ${docData.document_type}`,
      );

      return data as AgencyDocument;
    } catch (error) {
      console.error("Error uploading document:", error);
      throw error;
    }
  },

  /**
   * Get verification status
   */
  async getVerificationStatus(agencyId: string): Promise<{
    overall: string;
    documents: AgencyDocument[];
    kyc_status: string;
  } | null> {
    try {
      const profile = await agencyProfileService.getProfile(agencyId);
      const documents = await this.getDocuments(agencyId);

      return {
        overall: profile?.verification_status || "pending",
        documents,
        kyc_status: profile?.verification_status || "pending",
      };
    } catch (error) {
      console.error("Error fetching verification status:", error);
      return null;
    }
  },
};

// ============================================================================
// OPERATIONS & SUPPORT SERVICES
// ============================================================================

export const agencyOperationsService = {
  /**
   * Get live operations status
   */
  async getOperationsStatus(agencyId: string): Promise<any> {
    try {
      const metrics = await agencyDashboardService.getMetrics(agencyId);
      const bookings = await agencyBookingsService.getBookings(agencyId);
      const pendingBookings = bookings.filter((b) => b.status === "pending");
      const completedToday = bookings.filter(
        (b) =>
          b.status === "completed" &&
          new Date(b.created_at).toDateString() === new Date().toDateString(),
      );

      return {
        totalActiveBookings: bookings.length,
        pendingActions: pendingBookings.length,
        completedToday: completedToday.length,
        revenue: metrics.totalRevenue,
        customers: metrics.activeCustomers,
        status: "operational",
      };
    } catch (error) {
      console.error("Error fetching operations status:", error);
      return null;
    }
  },

  /**
   * Get support tickets
   */
  async getSupportTickets(agencyId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });

      return data || [];
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      return [];
    }
  },

  /**
   * Create support ticket
   */
  async createSupportTicket(
    agencyId: string,
    ticketData: any,
  ): Promise<any | null> {
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          ...ticketData,
          agency_id: agencyId,
          created_by: userData.user?.id,
          status: "open",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await logAgencyActivity(
        agencyId,
        "support_ticket_created",
        `Support ticket created: ${ticketData.title}`,
      );

      return data;
    } catch (error) {
      console.error("Error creating support ticket:", error);
      throw error;
    }
  },
};
