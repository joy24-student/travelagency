import { Audio } from "../utils/safeExpoAv";
import * as Haptics from "expo-haptics";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import { callsRepository, CallSignal, CallLog } from "./repositories/calls";
import { DEMO_USER_ID, FriendProfile } from "./repositories/friends";

type SignalListener = (signal: CallSignal) => void;

class CallService {
  private channel: RealtimeChannel | null = null;
  private listeners: Set<SignalListener> = new Set();
  private ringtoneInterval: NodeJS.Timeout | null = null;
  private isChannelReady = false;

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
   * Send a call signaling message
   */
  public async sendSignal(signal: CallSignal): Promise<boolean> {
    try {
      if (!this.channel) {
        this.initSignaling();
      }

      // If channel is still connecting, brief wait
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
      // Incoming call: double buzz every 1.5s
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      this.ringtoneInterval = setInterval(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }, 1600);
    } else {
      // Outgoing call: gentle pulse cadence
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  /**
   * Play call end feedback
   */
  public playCallEndFeedback() {
    this.stopRingingPattern();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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

    // Dispatch to all local listeners directly
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

