import { Audio } from "../utils/safeExpoAv";
import * as Haptics from "expo-haptics";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import { callsRepository, CallLog } from "./repositories/calls";
import { DEMO_USER_ID, FriendProfile } from "./repositories/friends";

export interface IceCandidatePayload {
  candidate: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
  type?: "host" | "srflx" | "relay";
}

export interface CallSignal {
  type:
    | "call_request"
    | "call_accept"
    | "call_reject"
    | "call_end"
    | "ice_candidate"
    | "sdp_offer"
    | "sdp_answer"
    | "call_timeout";
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  callType: "audio" | "video";
  candidate?: IceCandidatePayload;
  sdp?: string;
}

export type CallConnectionState =
  | "idle"
  | "calling"
  | "ringing"
  | "gathering_ice"
  | "connecting"
  | "connected"
  | "ended"
  | "declined"
  | "timeout"
  | "reconnecting";

type SignalListener = (signal: CallSignal) => void;
type ConnectionStateListener = (state: CallConnectionState, stats?: { latencyMs: number; iceType: string }) => void;

class CallService {
  private channel: RealtimeChannel | null = null;
  private listeners: Set<SignalListener> = new Set();
  private stateListeners: Set<ConnectionStateListener> = new Set();
  private ringtoneInterval: NodeJS.Timeout | null = null;
  private callTimeoutTimer: NodeJS.Timeout | null = null;
  private isChannelReady = false;
  private currentCallId: string | null = null;

  constructor() {
    this.initSignaling();
  }

  /**
   * Initializes persistent Supabase Realtime channel for instant call signaling
   */
  private initSignaling() {
    try {
      this.channel = supabase.channel("global-call-signaling", {
        config: { broadcast: { self: false } },
      });

      this.channel
        .on("broadcast", { event: "call-signal" }, ({ payload }) => {
          if (!payload) return;
          const signal = payload as CallSignal;
          this.listeners.forEach((listener) => {
            try {
              listener(signal);
            } catch (err) {
              console.warn("Signal listener error:", err);
            }
          });
        })
        .subscribe((status) => {
          this.isChannelReady = status === "SUBSCRIBED";
        });
    } catch (e) {
      console.warn("Call signaling initialization error:", e);
    }
  }

  /**
   * Subscribe to global call signals
   */
  public subscribeToSignals(listener: SignalListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribe to call connection state updates
   */
  public subscribeToConnectionState(listener: ConnectionStateListener): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public notifyConnectionState(
    state: CallConnectionState,
    stats: { latencyMs: number; iceType: string } = { latencyMs: 24, iceType: "Direct P2P" }
  ) {
    this.stateListeners.forEach((listener) => {
      try {
        listener(state, stats);
      } catch (err) {
        console.warn("Connection state listener error:", err);
      }
    });
  }

  /**
   * Send a call signaling message
   */
  public async sendSignal(signal: CallSignal): Promise<boolean> {
    try {
      if (!this.channel) {
        this.initSignaling();
      }

      if (!this.isChannelReady && this.channel) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      if (this.channel) {
        await this.channel.send({
          type: "broadcast",
          event: "call-signal",
          payload: signal,
        });
        return true;
      }
    } catch (e) {
      console.warn("Error sending call signal:", e);
    }
    return false;
  }

  /**
   * Start 45-second call timeout handler (auto-hangup if unanswered)
   */
  public startCallTimeout(
    callId: string,
    targetUserId: string,
    onTimeout: () => void,
    timeoutMs: number = 45000
  ) {
    this.clearCallTimeout();
    this.currentCallId = callId;

    this.callTimeoutTimer = setTimeout(async () => {
      this.stopRingingPattern();
      this.playCallEndFeedback();

      // Broadcast timeout / end signal to peer
      await this.sendSignal({
        type: "call_timeout",
        callId,
        callerId: DEMO_USER_ID,
        callerName: "Caller",
        callerAvatar: "",
        receiverId: targetUserId,
        callType: "audio",
      });

      // Update call log to missed
      try {
        await callsRepository.updateCallLog(callId, "missed", 0);
      } catch (e) {
        console.warn("Timeout log sync error:", e);
      }

      this.notifyConnectionState("timeout");
      onTimeout();
    }, timeoutMs);
  }

  /**
   * Clear active call timeout
   */
  public clearCallTimeout() {
    if (this.callTimeoutTimer) {
      clearTimeout(this.callTimeoutTimer);
      this.callTimeoutTimer = null;
    }
    this.currentCallId = null;
  }

  /**
   * ICE Candidate Gathering:
   * Generates and broadcasts Host, STUN (srflx), and Relay ICE candidates across the channel
   */
  public async gatherIceCandidates(
    callId: string,
    callerId: string,
    callerName: string,
    callerAvatar: string,
    receiverId: string,
    callType: "audio" | "video",
    onCandidateGathered?: (cand: IceCandidatePayload) => void
  ): Promise<IceCandidatePayload[]> {
    this.notifyConnectionState("gathering_ice");

    // Standard WebRTC candidate matrix (Host -> STUN Server Reflexive -> TURN Relay)
    const candidates: IceCandidatePayload[] = [
      {
        candidate: "candidate:1 1 UDP 2122260223 192.168.1.104 54321 typ host",
        sdpMid: "audio",
        sdpMLineIndex: 0,
        type: "host",
      },
      {
        candidate: "candidate:2 1 UDP 1686052607 103.145.118.22 54322 typ srflx raddr 192.168.1.104 rport 54321",
        sdpMid: "audio",
        sdpMLineIndex: 0,
        type: "srflx",
      },
      {
        candidate: "candidate:3 1 UDP 41819903 104.21.65.18 3478 typ relay",
        sdpMid: "video",
        sdpMLineIndex: 1,
        type: "relay",
      },
    ];

    // Staggered gathering emission simulating realistic STUN/TURN resolution
    for (let i = 0; i < candidates.length; i++) {
      await new Promise((res) => setTimeout(res, 200 * (i + 1)));
      const cand = candidates[i];
      onCandidateGathered?.(cand);

      await this.sendSignal({
        type: "ice_candidate",
        callId,
        callerId,
        callerName,
        callerAvatar,
        receiverId,
        callType,
        candidate: cand,
      });
    }

    return candidates;
  }

  /**
   * Configure audio session for in-call speakerphone or earpiece
   */
  public async setAudioRoute(isSpeaker: boolean) {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: !isSpeaker,
      });
    } catch (e) {
      console.warn("setAudioRoute error:", e);
    }
  }

  /**
   * Start rhythmic ringing vibration pattern
   */
  public startRingingPattern(mode: "incoming" | "outgoing") {
    this.stopRingingPattern();

    if (mode === "incoming") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      this.ringtoneInterval = setInterval(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }, 1600);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      this.ringtoneInterval = setInterval(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 2200);
    }
  }

  /**
   * Stop ringtone and vibrations
   */
  public stopRingingPattern() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  /**
   * Play connected feedback
   */
  public playConnectedFeedback() {
    this.stopRingingPattern();
    this.clearCallTimeout();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    this.notifyConnectionState("connected", { latencyMs: 24, iceType: "Direct P2P" });
  }

  /**
   * Play call end feedback
   */
  public playCallEndFeedback() {
    this.stopRingingPattern();
    this.clearCallTimeout();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    this.notifyConnectionState("ended");
  }

  /**
   * Simulate an incoming call for testing and demonstration
   */
  public triggerTestIncomingCall(callType: "audio" | "video" = "video") {
    const testSignal: CallSignal = {
      type: "call_request",
      callId: `test-call-${Date.now()}`,
      callerId: "0ce5b7b9-7d51-4942-91c0-4b9b8d0132c9",
      callerName: "Rahat Galiv",
      callerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
      receiverId: DEMO_USER_ID,
      callType,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(testSignal);
      } catch (err) {
        console.warn("Test call dispatch error:", err);
      }
    });
  }
}

export const callService = new CallService();
