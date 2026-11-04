import { supabase } from "../../utils/supabase";

export const userRepository = {
  // Get current user profile
  async getProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    if (!data) {
      return {
        id: user.id,
        email: user.email,
        full_name: (user.user_metadata as any)?.full_name || user.email?.split("@")[0] || "Traveler",
        avatar_url: (user.user_metadata as any)?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
        phone: user.phone || "",
      };
    }
    return data;
  },

  // Update user profile
  async updateProfile(userId: string, profile: any) {
    const { data, error } = await supabase
      .from("user_profiles")
      .update(profile)
      .eq("id", userId)
      .select();

    if (error) throw error;
    return data?.[0];
  },

  // Create user profile
  async createProfile(userId: string, profile: any) {
    const { data, error } = await supabase
      .from("user_profiles")
      .insert([{ id: userId, ...profile }])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  // Get user preferences
  async getPreferences(userId: string) {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    return data || {};
  },

  // Update user preferences
  async updatePreferences(userId: string, preferences: any) {
    const { data, error } = await supabase
      .from("user_preferences")
      .update(preferences)
      .eq("user_id", userId)
      .select();

    if (error) throw error;
    return data?.[0];
  },

  // Get user addresses
  async getAddresses(userId: string) {
    const { data, error } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Add address
  async addAddress(userId: string, address: any) {
    const { data, error } = await supabase
      .from("user_addresses")
      .insert([{ user_id: userId, ...address }])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  // Update address
  async updateAddress(addressId: string, address: any) {
    const { data, error } = await supabase
      .from("user_addresses")
      .update(address)
      .eq("id", addressId)
      .select();

    if (error) throw error;
    return data?.[0];
  },

  // Delete address
  async deleteAddress(addressId: string) {
    const { error } = await supabase
      .from("user_addresses")
      .delete()
      .eq("id", addressId);

    if (error) throw error;
  },

  // Get user settings
  async getSettings() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return {};

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn("getSettings error:", error.message);
        return {};
      }
      return data || {};
    } catch (e) {
      console.warn("getSettings exception:", e);
      return {};
    }
  },

  // Update individual setting
  async updateSetting(key: string, value: any) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_settings")
        .upsert({ user_id: user.id, [key]: value, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
        .select();

      if (error) {
        console.warn("updateSetting error:", error.message);
        return null;
      }
      return data?.[0];
    } catch (e) {
      console.warn("updateSetting exception:", e);
      return null;
    }
  },

  // Update multiple settings
  async saveAllSettings(settings: Record<string, any>) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_settings")
        .upsert({ user_id: user.id, ...settings, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
        .select();

      if (error) {
        console.warn("saveAllSettings error:", error.message);
        return null;
      }
      return data?.[0];
    } catch (e) {
      console.warn("saveAllSettings exception:", e);
      return null;
    }
  },

  // Change password
  async changePassword(currentPassword: string, newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return data;
  },

  // Create payment
  async createPayment(paymentData: any) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("payments")
      .insert([{ user_id: user.id, ...paymentData }])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  // Get user payments
  async getPayments() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get payment by ID
  async getPayment(paymentId: string) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (error) throw error;
    return data;
  },

  // Update payment status
  async updatePaymentStatus(paymentId: string, status: string) {
    const { data, error } = await supabase
      .from("payments")
      .update({ status, updated_at: new Date() })
      .eq("id", paymentId)
      .select();

    if (error) throw error;
    return data?.[0];
  },
};
