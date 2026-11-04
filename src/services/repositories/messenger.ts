import { supabase } from "../../utils/supabase";
import { DEMO_USER_ID, FriendProfile } from "./friends";

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url?: string;
  media_type?: "image" | "video" | "audio" | "file";
  is_read: boolean;
  created_at: string;
  sender?: FriendProfile;
}

export interface ConversationItem {
  id: string;
  type: "direct" | "group";
  title?: string;
  avatar_url?: string;
  last_message_text?: string;
  last_message_sender_id?: string;
  last_message_at: string;
  unread_count?: number;
  other_participant?: FriendProfile;
}

export const messengerRepository = {
  /**
   * Fetch all conversations for the user
   */
  async getConversations(userId: string = DEMO_USER_ID): Promise<ConversationItem[]> {
    try {
      // 1. Get conversation IDs the user participates in
      const { data: participations, error: partErr } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", userId);

      if (partErr || !participations || participations.length === 0) {
        return [];
      }

      const convoIds = participations.map((p) => p.conversation_id);

      // 2. Fetch conversations details
      const { data: convos, error: convoErr } = await supabase
        .from("conversations")
        .select("*")
        .in("id", convoIds)
        .order("last_message_at", { ascending: false });

      if (convoErr || !convos) return [];

      // 3. For each direct conversation, fetch the other participant
      const { data: allParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user:community_profiles!conversation_participants_user_id_fkey(*)")
        .in("conversation_id", convoIds)
        .neq("user_id", userId);

      const participantMap: Record<string, FriendProfile> = {};
      if (allParticipants) {
        allParticipants.forEach((item: any) => {
          if (item.user) {
            participantMap[item.conversation_id] = item.user;
          }
        });
      }

      return convos.map((c: any) => {
        const other = participantMap[c.id];
        return {
          id: c.id,
          type: c.type,
          title: c.type === "direct" && other ? other.display_name : c.title || "Chat",
          avatar_url: c.type === "direct" && other ? other.avatar_url : c.avatar_url,
          last_message_text: c.last_message_text,
          last_message_sender_id: c.last_message_sender_id,
          last_message_at: c.last_message_at,
          unread_count: 0,
          other_participant: other,
        };
      });
    } catch (e) {
      console.warn("getConversations error:", e);
      return [];
    }
  },

  /**
   * Find existing or create a direct conversation between two users
   */
  async getOrCreateDirectConversation(
    userId: string = DEMO_USER_ID,
    targetUserId: string
  ): Promise<ConversationItem> {
    // 1. Check if both participate in the same direct conversation
    const { data: myConvos } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (myConvos && myConvos.length > 0) {
      const myConvoIds = myConvos.map((c) => c.conversation_id);
      const { data: shared } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", targetUserId)
        .in("conversation_id", myConvoIds)
        .limit(1);

      if (shared && shared.length > 0) {
        const existingId = shared[0].conversation_id;
        const { data: convo } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", existingId)
          .single();

        const { data: targetProfile } = await supabase
          .from("community_profiles")
          .select("*")
          .eq("id", targetUserId)
          .single();

        return {
          id: existingId,
          type: "direct",
          title: targetProfile?.display_name || convo?.title || "Chat",
          avatar_url: targetProfile?.avatar_url || convo?.avatar_url,
          last_message_text: convo?.last_message_text,
          last_message_at: convo?.last_message_at,
          other_participant: targetProfile || undefined,
        };
      }
    }

    // 2. Fetch target profile
    const { data: targetProfile } = await supabase
      .from("community_profiles")
      .select("*")
      .eq("id", targetUserId)
      .single();

    // 3. Create new conversation
    const { data: newConvo, error: createErr } = await supabase
      .from("conversations")
      .insert({
        type: "direct",
        title: targetProfile?.display_name || "Direct Chat",
        avatar_url: targetProfile?.avatar_url,
        last_message_text: "Started a conversation",
      })
      .select()
      .single();

    if (createErr || !newConvo) {
      throw new Error(createErr?.message || "Failed to create conversation");
    }

    // 4. Add both participants
    await supabase.from("conversation_participants").insert([
      { conversation_id: newConvo.id, user_id: userId },
      { conversation_id: newConvo.id, user_id: targetUserId },
    ]);

    return {
      id: newConvo.id,
      type: "direct",
      title: targetProfile?.display_name || "Chat",
      avatar_url: targetProfile?.avatar_url,
      last_message_text: newConvo.last_message_text,
      last_message_at: newConvo.last_message_at,
      other_participant: targetProfile || undefined,
    };
  },

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string): Promise<DirectMessage[]> {
    const { data, error } = await supabase
      .from("direct_messages")
      .select("*, sender:community_profiles!direct_messages_sender_id_fkey(*)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return data as DirectMessage[];
  },

  /**
   * Send a direct message
   */
  async sendMessage(
    conversationId: string,
    senderId: string = DEMO_USER_ID,
    content: string,
    mediaUrl?: string,
    mediaType?: "image" | "video" | "audio" | "file"
  ): Promise<DirectMessage> {
    const { data, error } = await supabase
      .from("direct_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        media_url: mediaUrl,
        media_type: mediaType,
      })
      .select("*, sender:community_profiles!direct_messages_sender_id_fkey(*)")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to send message");
    }

    // Update conversation last message
    await supabase
      .from("conversations")
      .update({
        last_message_text: content,
        last_message_sender_id: senderId,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    return data as DirectMessage;
  },

  /**
   * Realtime subscription for conversation messages
   */
  subscribeToMessages(
    conversationId: string,
    onMessage: (msg: DirectMessage) => void
  ) {
    return supabase
      .channel(`convo:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch sender details
          const { data } = await supabase
            .from("community_profiles")
            .select("*")
            .eq("id", payload.new.sender_id)
            .single();

          onMessage({
            ...(payload.new as any),
            sender: data || undefined,
          });
        }
      )
      .subscribe();
  },
};

