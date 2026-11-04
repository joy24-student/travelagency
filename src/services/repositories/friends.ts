import { supabase } from "../../utils/supabase";

export interface FriendProfile {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string;
  cover_url?: string;
  bio?: string;
  location?: string;
  is_influencer?: boolean;
  influencer_category?: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  created_at?: string;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined" | "blocked";
  created_at: string;
  updated_at: string;
  sender?: FriendProfile;
  receiver?: FriendProfile;
}

export const DEMO_USER_ID = "5e491c34-50b4-4d2a-8cac-d09fddd7745c"; // Elvis Mittra

export const friendsRepository = {
  /**
   * Get all accepted friends for a user
   */
  async getFriends(userId: string = DEMO_USER_ID): Promise<FriendProfile[]> {
    try {
      const { data, error } = await supabase
        .from("friend_requests")
        .select(`
          id,
          status,
          sender:community_profiles!friend_requests_sender_id_fkey(*),
          receiver:community_profiles!friend_requests_receiver_id_fkey(*)
        `)
        .eq("status", "accepted")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

      if (error || !data) return [];

      return data.map((item: any) => {
        if (item.sender?.id === userId) {
          return item.receiver;
        }
        return item.sender;
      }).filter(Boolean);
    } catch (e) {
      console.warn("getFriends error:", e);
      return [];
    }
  },

  /**
   * Get incoming and outgoing pending friend requests
   */
  async getFriendRequests(userId: string = DEMO_USER_ID): Promise<{
    incoming: FriendRequest[];
    outgoing: FriendRequest[];
  }> {
    try {
      const [incRes, outRes] = await Promise.all([
        supabase
          .from("friend_requests")
          .select("*, sender:community_profiles!friend_requests_sender_id_fkey(*)")
          .eq("receiver_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("friend_requests")
          .select("*, receiver:community_profiles!friend_requests_receiver_id_fkey(*)")
          .eq("sender_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ]);

      return {
        incoming: (incRes.data as FriendRequest[]) || [],
        outgoing: (outRes.data as FriendRequest[]) || [],
      };
    } catch (e) {
      console.warn("getFriendRequests error:", e);
      return { incoming: [], outgoing: [] };
    }
  },

  /**
   * Get suggested friends (community profiles not yet friends or pending)
   */
  async getSuggestedFriends(userId: string = DEMO_USER_ID): Promise<FriendProfile[]> {
    try {
      // 1. Get all requests involving this user
      const { data: requests } = await supabase
        .from("friend_requests")
        .select("sender_id, receiver_id, status")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

      const excludedIds = new Set<string>([userId]);
      if (requests) {
        requests.forEach((r: any) => {
          if (r.sender_id === userId) excludedIds.add(r.receiver_id);
          if (r.receiver_id === userId) excludedIds.add(r.sender_id);
        });
      }

      // 2. Fetch profiles not in excluded set
      const { data: profiles, error } = await supabase
        .from("community_profiles")
        .select("*")
        .order("followers_count", { ascending: false })
        .limit(20);

      if (error || !profiles) return [];
      return profiles.filter((p: any) => !excludedIds.has(p.id));
    } catch (e) {
      console.warn("getSuggestedFriends error:", e);
      return [];
    }
  },

  /**
   * Send a friend request
   */
  async sendFriendRequest(senderId: string, receiverId: string) {
    return supabase
      .from("friend_requests")
      .upsert(
        { sender_id: senderId, receiver_id: receiverId, status: "pending", updated_at: new Date().toISOString() },
        { onConflict: "sender_id,receiver_id" }
      )
      .select("*, receiver:community_profiles!friend_requests_receiver_id_fkey(*)")
      .single();
  },

  /**
   * Accept friend request
   */
  async acceptFriendRequest(requestId: string) {
    return supabase
      .from("friend_requests")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", requestId)
      .select("*, sender:community_profiles!friend_requests_sender_id_fkey(*)")
      .single();
  },

  /**
   * Decline friend request
   */
  async declineFriendRequest(requestId: string) {
    return supabase
      .from("friend_requests")
      .update({ status: "declined", updated_at: new Date().toISOString() })
      .eq("id", requestId);
  },

  /**
   * Cancel sent friend request
   */
  async cancelFriendRequest(requestId: string) {
    return supabase.from("friend_requests").delete().eq("id", requestId);
  },

  /**
   * Unfriend
   */
  async unfriend(userId: string, friendId: string) {
    return supabase
      .from("friend_requests")
      .delete()
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`
      );
  },

  /**
   * Check relationship between two users
   */
  async getFriendshipStatus(
    userId: string,
    targetUserId: string
  ): Promise<{ status: "none" | "pending_sent" | "pending_received" | "accepted"; requestId?: string }> {
    if (userId === targetUserId) return { status: "none" };

    const { data } = await supabase
      .from("friend_requests")
      .select("id, sender_id, receiver_id, status")
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${userId})`
      )
      .maybeSingle();

    if (!data) return { status: "none" };
    if (data.status === "accepted") return { status: "accepted", requestId: data.id };
    if (data.status === "pending") {
      if (data.sender_id === userId) return { status: "pending_sent", requestId: data.id };
      return { status: "pending_received", requestId: data.id };
    }
    return { status: "none" };
  },
};
