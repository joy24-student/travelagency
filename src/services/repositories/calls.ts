import { supabase } from "../../utils/supabase";
import { DEMO_USER_ID, FriendProfile } from "./friends";

export interface CallLog {
  id: string;
  caller_id: string;
  receiver_id: string;
  call_type: "audio" | "video";
  status: "calling" | "ringing" | "connected" | "completed" | "missed" | "rejected";
  duration_seconds: number;
  started_at: string;
  ended_at?: string;
  caller?: FriendProfile;
  receiver?: FriendProfile;
  other_party?: FriendProfile;
  is_outgoing?: boolean;
}

export interface CallSignal {
  type: "call_request" | "call_accept" | "call_reject" | "call_end" | "ice_candidate" | "sdp_offer" | "sdp_answer" | "call_timeout";
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  callType: "audio" | "video";
}

export const callsRepository = {
  /**
   * Fetch call logs for a user
   */
  async getCallLogs(userId: string = DEMO_USER_ID): Promise<CallLog[]> {
    try {
      const { data, error } = await supabase
        .from("call_logs")
        .select(`
          *,
          caller:community_profiles!call_logs_caller_id_fkey(*),
          receiver:community_profiles!call_logs_receiver_id_fkey(*)
        `)
        .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("started_at", { ascending: false });

      if (error || !data) return [];

      return data.map((item: any) => {
        const isOutgoing = item.caller_id === userId;
        const otherParty = isOutgoing ? item.receiver : item.caller;
        return {
          ...item,
          is_outgoing: isOutgoing,
          other_party: otherParty,
        };
      });
    } catch (e) {
      console.warn("getCallLogs error:", e);
      return [];
    }
  },

  /**
   * Create a new call log entry
   */
  async createCallLog(
    callerId: string,
    receiverId: string,
    callType: "audio" | "video",
    status: CallLog["status"] = "calling",
    durationSeconds: number = 0
  ): Promise<CallLog | null> {
    const { data, error } = await supabase
      .from("call_logs")
      .insert({
        caller_id: callerId,
        receiver_id: receiverId,
        call_type: callType,
        status,
        duration_seconds: durationSeconds,
      })
      .select(`
        *,
        caller:community_profiles!call_logs_caller_id_fkey(*),
        receiver:community_profiles!call_logs_receiver_id_fkey(*)
      `)
      .single();

    if (error || !data) return null;
    return data as CallLog;
  },

  /**
   * Update an existing call log entry
   */
  async updateCallLog(
    callId: string,
    status: CallLog["status"],
    durationSeconds: number
  ) {
    return supabase
      .from("call_logs")
      .update({
        status,
        duration_seconds: durationSeconds,
        ended_at: new Date().toISOString(),
      })
      .eq("id", callId);
  },

  /**
   * Broadcast signaling message via Supabase Realtime channel
   */
  async sendCallSignal(signal: CallSignal) {
    const channel = supabase.channel("call-signaling");
    return channel.send({
      type: "broadcast",
      event: "call-signal",
      payload: signal,
    });
  },

  /**
   * Subscribe to incoming call signals
   */
  subscribeToCallSignaling(userId: string, onSignal: (signal: CallSignal) => void) {
    const channel = supabase.channel("call-signaling");
    channel
      .on("broadcast", { event: "call-signal" }, ({ payload }) => {
        if (payload.receiverId === userId || payload.callerId === userId) {
          onSignal(payload as CallSignal);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

