# 🚀 Agency Portal - Supabase Data Connection Implementation Guide

**Status**: Implementation Ready  
**Last Updated**: June 3, 2026  
**Target**: Connect all 15 screens to live Supabase database

---

## 📋 Complete Service Method Implementation

### Step 1: Update agencyService.ts with Real Queries

#### A. Dashboard Service - Metrics & Activity

```typescript
export const agencyDashboardService = {
  async getMetrics(agencyId: string): Promise<AgencyMetrics> {
    try {
      // Get all bookings for the agency
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, status, final_price, user_id, created_at")
        .eq("agency_id", agencyId);

      if (bookingsError) {
        console.error("Dashboard metrics error:", bookingsError.message);
        return emptyMetrics;
      }

      const allBookings = bookings || [];

      // Calculate metrics
      const completed = allBookings.filter((b) =>
        ["confirmed", "completed"].includes(String(b.status)),
      );
      const totalRevenue = completed.reduce(
        (sum, b) => sum + Number(b.final_price || 0),
        0,
      );
      const customerIds = new Set(
        allBookings.map((b) => b.user_id).filter(Boolean),
      );

      // Get growth rates (compare with last month)
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

      const { data: lastMonthBookings } = await supabase
        .from("bookings")
        .select("id, final_price")
        .eq("agency_id", agencyId)
        .gte("created_at", lastMonthDate.toISOString())
        .lt("created_at", new Date().toISOString());

      const lastMonthRevenue = (lastMonthBookings || []).reduce(
        (sum, b) => sum + Number(b.final_price || 0),
        0,
      );

      const revenueGrowth =
        lastMonthRevenue > 0
          ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : 0;

      return {
        totalRevenue,
        totalBookings: allBookings.length,
        activeCustomers: customerIds.size,
        conversionRate: allBookings.length
          ? Math.round((completed.length / allBookings.length) * 1000) / 10
          : 0,
        avgOrderValue: completed.length
          ? Math.round(totalRevenue / completed.length)
          : 0,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        bookingGrowth:
          allBookings.length > 0
            ? Math.round(
                ((allBookings.length - (lastMonthBookings?.length || 0)) /
                  (lastMonthBookings?.length || 1)) *
                  1000,
              ) / 10
            : 0,
        customerGrowth: 0, // Calculate based on new customers this month
      };
    } catch (error) {
      console.error("Unexpected error in getMetrics:", error);
      return emptyMetrics;
    }
  },

  async getRecentActivity(agencyId: string, limit = 10) {
    try {
      const { data, error } = await supabase
        .from("agency_activity_logs")
        .select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Activity fetch error:", error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Unexpected error in getRecentActivity:", error);
      return [];
    }
  },

  async getConversionMetrics(agencyId: string) {
    try {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, status")
        .eq("agency_id", agencyId);

      const total = bookings?.length || 0;
      const confirmed =
        bookings?.filter((b) => b.status === "confirmed").length || 0;
      const pending =
        bookings?.filter((b) => b.status === "payment_pending").length || 0;
      const completed =
        bookings?.filter((b) => b.status === "completed").length || 0;

      return {
        confirmed,
        pending,
        completed,
        cancelled: total - confirmed - pending - completed,
      };
    } catch (error) {
      console.error("Error getting conversion metrics:", error);
      return { confirmed: 0, pending: 0, completed: 0, cancelled: 0 };
    }
  },
};
```

#### B. Bookings Service - Full Implementation

```typescript
export const agencyBookingsService = {
  async getBookings(
    agencyId: string,
    status?: string,
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
          traveler_id
        `,
        )
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      const { data: bookings, error } = await query;

      if (error) {
        console.error("Bookings fetch error:", error.message);
        return [];
      }

      // Fetch traveler details for each booking
      const bookingIds = (bookings || []).map((b) => b.id);

      if (bookingIds.length === 0) return [];

      const { data: travelers } = await supabase
        .from("traveler_details")
        .select("id, first_name, last_name, email, phone, user_id")
        .in(
          "user_id",
          (bookings || []).map((b) => b.user_id),
        );

      const travelerMap = new Map((travelers || []).map((t) => [t.user_id, t]));

      return (bookings || []).map((booking: any) => ({
        ...booking,
        traveler_details: travelerMap.get(booking.user_id) || null,
      })) as AgencyBooking[];
    } catch (error) {
      console.error("Unexpected error in getBookings:", error);
      return [];
    }
  },

  async getBookingDetail(agencyId: string, bookingId: string) {
    try {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .eq("agency_id", agencyId)
        .single();

      if (error) {
        console.error("Booking detail fetch error:", error.message);
        return null;
      }

      // Get traveler details
      const { data: traveler } = await supabase
        .from("traveler_details")
        .select("*")
        .eq("user_id", booking.user_id)
        .single();

      // Get booking passengers
      const { data: passengers } = await supabase
        .from("booking_passengers")
        .select("*")
        .eq("booking_id", bookingId);

      // Get invoice
      const { data: invoice } = await supabase
        .from("invoices")
        .select("*")
        .eq("booking_id", bookingId)
        .single();

      // Get voucher
      const { data: voucher } = await supabase
        .from("vouchers")
        .select("*")
        .eq("booking_id", bookingId)
        .single();

      return {
        ...booking,
        traveler_details: traveler,
        passengers: passengers || [],
        invoice,
        voucher,
      };
    } catch (error) {
      console.error("Error fetching booking detail:", error);
      return null;
    }
  },

  async updateBookingStatus(
    agencyId: string,
    bookingId: string,
    status: string,
  ) {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", bookingId)
        .eq("agency_id", agencyId)
        .select()
        .single();

      if (error) throw new Error(getErrorMessage(error));

      // Log activity
      await this.logActivity(
        agencyId,
        "booking_updated",
        `Booking ${bookingId} status changed to ${status}`,
      );

      return data;
    } catch (error) {
      console.error("Error updating booking status:", error);
      throw error;
    }
  },

  async createBooking(agencyId: string, bookingData: any) {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert([
          {
            ...bookingData,
            agency_id: agencyId,
            status: "draft",
          },
        ])
        .select()
        .single();

      if (error) throw new Error(getErrorMessage(error));

      await this.logActivity(
        agencyId,
        "booking_created",
        `New booking created: ${data.booking_reference}`,
      );

      return data;
    } catch (error) {
      console.error("Error creating booking:", error);
      throw error;
    }
  },

  async deleteBooking(agencyId: string, bookingId: string) {
    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId)
        .eq("agency_id", agencyId);

      if (error) throw new Error(getErrorMessage(error));

      await this.logActivity(
        agencyId,
        "booking_deleted",
        `Booking ${bookingId} deleted`,
      );
    } catch (error) {
      console.error("Error deleting booking:", error);
      throw error;
    }
  },

  async logActivity(agencyId: string, action: string, details: string) {
    try {
      const { data: userData } = await supabase.auth.getUser();

      await supabase.from("agency_activity_logs").insert({
        agency_id: agencyId,
        actor_user_id: userData.user?.id,
        action,
        details,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.warn("Failed to log activity:", error);
    }
  },
};
```

#### C. Customers Service - Full Implementation

```typescript
export const agencyCustomersService = {
  async getCustomers(agencyId: string) {
    try {
      // Get all bookings for this agency
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, user_id, final_price, status")
        .eq("agency_id", agencyId);

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError.message);
        return [];
      }

      if (!bookings || bookings.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(bookings.map((b) => b.user_id))];

      // Fetch user details
      const { data: users } = await supabase
        .from("auth.users")
        .select("id, email")
        .in("id", userIds);

      // Fetch traveler details
      const { data: travelers } = await supabase
        .from("traveler_details")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);

      const customers = new Map<string, any>();

      // Build customer map
      bookings.forEach((booking) => {
        const existing = customers.get(booking.user_id) || {
          id: booking.user_id,
          name: "Unknown",
          email: users?.find((u) => u.id === booking.user_id)?.email,
          bookings: 0,
          spent: 0,
          vip: false,
          lastBooking: null,
        };

        const traveler = travelers?.find((t) => t.user_id === booking.user_id);
        if (traveler) {
          existing.name = `${traveler.first_name} ${traveler.last_name}`.trim();
        }

        existing.bookings += 1;
        existing.spent += Number(booking.final_price || 0);
        existing.lastBooking = booking.created_at;
        existing.vip = existing.spent >= 10000 || existing.bookings >= 5;
        customers.set(booking.user_id, existing);
      });

      return Array.from(customers.values()).sort((a, b) => b.spent - a.spent);
    } catch (error) {
      console.error("Error fetching customers:", error);
      return [];
    }
  },

  async getCustomerDetails(agencyId: string, customerId: string) {
    try {
      // Get user basic info
      const { data: user } = await supabase
        .from("auth.users")
        .select("id, email")
        .eq("id", customerId)
        .single();

      // Get traveler details
      const { data: traveler } = await supabase
        .from("traveler_details")
        .select("*")
        .eq("user_id", customerId)
        .single();

      // Get bookings with this customer
      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", customerId)
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Calculate stats
      const totalSpent = (bookings || []).reduce(
        (sum, b) => sum + Number(b.final_price || 0),
        0,
      );

      return {
        id: customerId,
        email: user?.email,
        name: traveler
          ? `${traveler.first_name} ${traveler.last_name}`
          : "Unknown",
        phone: traveler?.phone,
        totalBookings: bookings?.length || 0,
        totalSpent,
        vip: totalSpent >= 10000 || (bookings?.length || 0) >= 5,
        lastBooking: bookings?.[0]?.created_at,
        bookings: bookings || [],
      };
    } catch (error) {
      console.error("Error fetching customer details:", error);
      return null;
    }
  },

  async updateCustomer(agencyId: string, customerId: string, updates: any) {
    try {
      // Update traveler details
      const { error } = await supabase
        .from("traveler_details")
        .update(updates)
        .eq("user_id", customerId);

      if (error) throw new Error(getErrorMessage(error));

      // Log activity
      await agencyBookingsService.logActivity(
        agencyId,
        "customer_updated",
        `Customer ${customerId} information updated`,
      );

      return true;
    } catch (error) {
      console.error("Error updating customer:", error);
      throw error;
    }
  },
};
```

#### D. Messages Service - Real-time Implementation

```typescript
export const agencyMessagesService = {
  async getMessages(agencyId: string) {
    try {
      const { data, error } = await supabase
        .from("agency_messages")
        .select(
          `
          id,
          agency_id,
          sender_id,
          recipient_id,
          message_content,
          status,
          created_at
        `,
        )
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Messages fetch error:", error.message);
        return [];
      }

      // Fetch sender/recipient details
      const userIds = new Set<string>();
      (data || []).forEach((msg) => {
        userIds.add(msg.sender_id);
        userIds.add(msg.recipient_id);
      });

      const { data: users } = await supabase
        .from("auth.users")
        .select("id, email")
        .in("id", Array.from(userIds));

      const userMap = new Map(users?.map((u) => [u.id, u]) || []);

      return (data || []).map((msg) => ({
        ...msg,
        sender: userMap.get(msg.sender_id),
        recipient: userMap.get(msg.recipient_id),
      }));
    } catch (error) {
      console.error("Unexpected error in getMessages:", error);
      return [];
    }
  },

  async sendMessage(agencyId: string, recipientId: string, content: string) {
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("agency_messages")
        .insert([
          {
            agency_id: agencyId,
            sender_id: userData.user?.id,
            recipient_id: recipientId,
            message_content: content,
            status: "sent",
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw new Error(getErrorMessage(error));
      return data;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  // Subscribe to real-time messages
  subscribeToMessages(agencyId: string, callback: (message: any) => void) {
    try {
      const subscription = supabase
        .channel(`messages:agency_id=eq.${agencyId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "agency_messages",
            filter: `agency_id=eq.${agencyId}`,
          },
          (payload) => {
            callback(payload.new);
          },
        )
        .subscribe();

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error("Error subscribing to messages:", error);
      return () => {};
    }
  },
};
```

#### E. Profile Service - Full Implementation

```typescript
export const agencyProfileService = {
  async getProfile(agencyId: string) {
    try {
      const { data: agency, error } = await supabase
        .from("agencies")
        .select("*")
        .eq("id", agencyId)
        .single();

      if (error) {
        console.error("Profile fetch error:", error.message);
        return null;
      }

      return agency;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  },

  async updateProfile(agencyId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from("agencies")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", agencyId)
        .select()
        .single();

      if (error) throw new Error(getErrorMessage(error));

      await agencyBookingsService.logActivity(
        agencyId,
        "profile_updated",
        "Agency profile information updated",
      );

      return data;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  },

  async getTeamMembers(agencyId: string) {
    try {
      const { data, error } = await supabase
        .from("agency_team_members")
        .select(
          `
          id,
          agency_id,
          user_id,
          role,
          permissions,
          status,
          created_at
        `,
        )
        .eq("agency_id", agencyId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Team members fetch error:", error.message);
        return [];
      }

      // Fetch user details
      const userIds = (data || []).map((m) => m.user_id);
      const { data: users } = await supabase
        .from("auth.users")
        .select("id, email")
        .in("id", userIds);

      const userMap = new Map(users?.map((u) => [u.id, u]) || []);

      return (data || []).map((member) => ({
        ...member,
        email: userMap.get(member.user_id)?.email,
      }));
    } catch (error) {
      console.error("Error fetching team members:", error);
      return [];
    }
  },

  async addTeamMember(agencyId: string, email: string, role: string) {
    try {
      // Find user by email
      const { data: users } = await supabase
        .from("auth.users")
        .select("id")
        .eq("email", email);

      if (!users || users.length === 0) {
        throw new Error("User not found");
      }

      const userId = users[0].id;

      // Add team member
      const { data, error } = await supabase
        .from("agency_team_members")
        .insert([
          {
            agency_id: agencyId,
            user_id: userId,
            role,
            status: "active",
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw new Error(getErrorMessage(error));

      await agencyBookingsService.logActivity(
        agencyId,
        "team_member_added",
        `Team member ${email} added with role ${role}`,
      );

      return data;
    } catch (error) {
      console.error("Error adding team member:", error);
      throw error;
    }
  },
};
```

#### F. Payments Service - Full Implementation

```typescript
export const agencyPaymentsService = {
  async getPayments(agencyId: string, limit = 20) {
    try {
      // Get payments through bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, booking_reference, final_price, status, created_at")
        .eq("agency_id", agencyId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(limit);

      return bookings || [];
    } catch (error) {
      console.error("Error fetching payments:", error);
      return [];
    }
  },

  async getBankAccounts(agencyId: string) {
    try {
      const { data, error } = await supabase
        .from("agency_bank_accounts")
        .select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Bank accounts fetch error:", error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      return [];
    }
  },

  async addBankAccount(agencyId: string, accountData: any) {
    try {
      const { data, error } = await supabase
        .from("agency_bank_accounts")
        .insert([
          {
            ...accountData,
            agency_id: agencyId,
            status: "active",
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw new Error(getErrorMessage(error));

      await agencyBookingsService.logActivity(
        agencyId,
        "bank_account_added",
        `Bank account added: ${accountData.bank_name}`,
      );

      return data;
    } catch (error) {
      console.error("Error adding bank account:", error);
      throw error;
    }
  },

  async updateBankAccount(agencyId: string, accountId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from("agency_bank_accounts")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", accountId)
        .eq("agency_id", agencyId)
        .select()
        .single();

      if (error) throw new Error(getErrorMessage(error));

      await agencyBookingsService.logActivity(
        agencyId,
        "bank_account_updated",
        `Bank account updated: ${accountId}`,
      );

      return data;
    } catch (error) {
      console.error("Error updating bank account:", error);
      throw error;
    }
  },
};
```

#### G. Verification Service - Full Implementation

```typescript
export const agencyVerificationService = {
  async getDocuments(agencyId: string) {
    try {
      const { data, error } = await supabase
        .from("agency_documents")
        .select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Documents fetch error:", error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching documents:", error);
      return [];
    }
  },

  async uploadDocument(agencyId: string, docData: any) {
    try {
      const { data, error } = await supabase
        .from("agency_documents")
        .insert([
          {
            ...docData,
            agency_id: agencyId,
            verification_status: "pending",
            uploaded_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw new Error(getErrorMessage(error));

      await agencyBookingsService.logActivity(
        agencyId,
        "document_uploaded",
        `Document uploaded: ${docData.document_type}`,
      );

      return data;
    } catch (error) {
      console.error("Error uploading document:", error);
      throw error;
    }
  },

  async getVerificationStatus(agencyId: string) {
    try {
      const { data, error } = await supabase
        .from("agency_documents")
        .select("document_type, verification_status")
        .eq("agency_id", agencyId);

      if (error) {
        console.error("Verification status error:", error.message);
        return { verified: 0, pending: 0, rejected: 0 };
      }

      const docs = data || [];
      return {
        verified: docs.filter((d) => d.verification_status === "verified")
          .length,
        pending: docs.filter((d) => d.verification_status === "pending").length,
        rejected: docs.filter((d) => d.verification_status === "rejected")
          .length,
        total: docs.length,
      };
    } catch (error) {
      console.error("Error getting verification status:", error);
      return { verified: 0, pending: 0, rejected: 0 };
    }
  },
};
```

---

## 🔧 Screen Integration Examples

### Example 1: DashboardScreen - Real Data Integration

```typescript
import { useFocusEffect } from '@react-navigation/native';
import { agencyDashboardService } from '../services/agencyService';

export function DashboardScreen({ navigation }: DashboardStackScreenProps<'Dashboard'>) {
  const [metrics, setMetrics] = useState<AgencyMetrics | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const agencyId = await getCurrentAgencyId(); // Get from context or auth
      if (!agencyId) {
        console.warn('No agency ID found');
        return;
      }

      const [metricsData, activityData] = await Promise.all([
        agencyDashboardService.getMetrics(agencyId),
        agencyDashboardService.getRecentActivity(agencyId, 10),
      ]);

      setMetrics(metricsData);
      setActivity(activityData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {metrics && (
        <>
          <StatCard
            title="Total Revenue"
            value={`$${metrics.totalRevenue.toLocaleString()}`}
            trend={metrics.revenueGrowth}
          />
          <StatCard
            title="Total Bookings"
            value={metrics.totalBookings.toString()}
            trend={metrics.bookingGrowth}
          />
          {/* ... more stats ... */}
        </>
      )}

      <SectionHeader title="Recent Activity" />
      {activity.map(item => (
        <ActivityItem
          key={item.id}
          title={item.action}
          description={item.details}
          timestamp={item.created_at}
        />
      ))}
    </ScrollView>
  );
}
```

### Example 2: BookingsScreen - Real Data Integration

```typescript
export function BookingsScreen({ navigation }: BookingsStackScreenProps<'Bookings'>) {
  const [bookings, setBookings] = useState<AgencyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const agencyId = useContext(AgencyContext); // Get agency ID from context

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const data = await agencyBookingsService.getBookings(agencyId, status === 'all' ? undefined : status);
        setBookings(data);
      } catch (error) {
        console.error('Error loading bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [agencyId, status]);

  if (loading) return <LoadingScreen />;

  return (
    <View>
      <ScrollView horizontal>
        {['all', 'confirmed', 'pending', 'completed'].map(s => (
          <TouchableOpacity
            key={s}
            onPress={() => setStatus(s)}
            style={[styles.filterTab, status === s && styles.filterTabActive]}
          >
            <Text>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('BookingDetails', { bookingId: item.id })}
          >
            <Card>
              <Text style={styles.bookingRef}>{item.booking_reference}</Text>
              <Text>{item.traveler_details?.first_name} {item.traveler_details?.last_name}</Text>
              <Text>{item.destination_city}</Text>
              <Badge status={item.status}>{item.status}</Badge>
              <Text>${item.final_price}</Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
```

### Example 3: CustomersScreen - Real Data Integration

```typescript
export function CustomersScreen({ navigation }: CustomersStackScreenProps<'Customers'>) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const agencyId = useContext(AgencyContext);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const data = await agencyCustomersService.getCustomers(agencyId);
        setCustomers(data);
        setFilteredCustomers(data);
      } catch (error) {
        console.error('Error loading customers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, [agencyId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      setFilteredCustomers(
        customers.filter(c =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, customers]);

  if (loading) return <LoadingScreen />;

  return (
    <View>
      <TextInput
        placeholder="Search customers..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <FlatList
        data={filteredCustomers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('CustomerDetails', { customerId: item.id })}
          >
            <ListItem
              title={item.name}
              subtitle={`${item.bookings} bookings • $${item.spent}`}
              rightIcon={item.vip ? '👑' : undefined}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
```

---

## 🧪 Testing Data Connections

### Test Script (agencyService.test.ts)

```typescript
import {
  agencyBookingsService,
  agencyCustomersService,
  agencyDashboardService,
} from "./agencyService";

async function testDatabaseConnections(agencyId: string) {
  console.log("🧪 Testing Database Connections...\n");

  try {
    // Test 1: Dashboard Metrics
    console.log("Test 1: Dashboard Metrics");
    const metrics = await agencyDashboardService.getMetrics(agencyId);
    console.log("✅ Metrics:", {
      totalRevenue: metrics.totalRevenue,
      totalBookings: metrics.totalBookings,
      activeCustomers: metrics.activeCustomers,
    });

    // Test 2: Recent Activity
    console.log("\nTest 2: Recent Activity");
    const activity = await agencyDashboardService.getRecentActivity(
      agencyId,
      5,
    );
    console.log("✅ Activity entries:", activity.length);

    // Test 3: Bookings
    console.log("\nTest 3: Bookings");
    const bookings = await agencyBookingsService.getBookings(agencyId);
    console.log("✅ Total bookings:", bookings.length);
    if (bookings.length > 0) {
      console.log("   Sample:", {
        id: bookings[0].id,
        reference: bookings[0].booking_reference,
        customer: bookings[0].traveler_details?.first_name,
        status: bookings[0].status,
        price: bookings[0].final_price,
      });
    }

    // Test 4: Customers
    console.log("\nTest 4: Customers");
    const customers = await agencyCustomersService.getCustomers(agencyId);
    console.log("✅ Total customers:", customers.length);
    if (customers.length > 0) {
      console.log("   Top customer:", {
        name: customers[0].name,
        bookings: customers[0].bookings,
        spent: customers[0].spent,
        vip: customers[0].vip,
      });
    }

    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Usage
testDatabaseConnections("<agency_id>");
```

---

## 📊 Integration Checklist

### Phase 1: Service Methods (✅ Complete)

- [x] Dashboard service methods
- [x] Bookings service methods
- [x] Customers service methods
- [x] Messages service methods
- [x] Profile service methods
- [x] Payments service methods
- [x] Verification service methods

### Phase 2: Screen Integration (Ready to Implement)

- [ ] LoginScreen - Auth integration
- [ ] DashboardScreen - Real metrics
- [ ] OperationsScreen - Live bookings
- [ ] BookingsScreen - Booking list with filters
- [ ] BookingDetailsScreen - Full booking details
- [ ] CustomersScreen - Customer list with search
- [ ] CustomerDetailsScreen - Customer profile
- [ ] MessagesScreen - Real-time messaging
- [ ] ProfileScreen - Agency info
- [ ] AgencyInfoScreen - Edit agency
- [ ] TeamManagementScreen - Team members
- [ ] BankAccountsScreen - Bank accounts
- [ ] VerificationScreen - Documents
- [ ] SupportCenterScreen - Support tickets
- [ ] SettingsScreen - App settings

### Phase 3: Real-time Features (Next)

- [ ] Message subscriptions
- [ ] Booking status updates
- [ ] Activity log streaming
- [ ] Real-time customer updates

### Phase 4: Advanced Features (Future)

- [ ] Data caching
- [ ] Offline support
- [ ] Data export
- [ ] Advanced filtering
- [ ] Analytics dashboard

---

**Status**: Ready for Implementation ✅  
**Next Step**: Integrate service methods into screens  
**Estimated Time**: 4-6 hours for full implementation
