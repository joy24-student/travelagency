/**
 * Collaborative Group Trip Service - Shopno Jatra
 *
 * Implements:
 * 1. Trip Management: CRUD for group_trips and group_members.
 * 2. Live Itinerary: optimistic reordering with version conflict validation.
 * 3. Proposals & Voting: proposal creation, voting, and atomic accept_proposal RPC.
 * 4. Zero-Float Expenses: integer paisa expense tracking & settlements.
 * 5. Secure Invites: token generation, hashing, and atomic join_trip RPC.
 * 6. Supabase Realtime pub-sub bridged into appEventBus.
 */

import { supabase } from "../../utils/supabase";
import { appEventBus, APP_EVENTS } from "../events/appEventBus";
import { groupTripNotificationService } from "./groupTripNotificationService";
import {
  compute_balances,
  minimise_transfers,
  bdtToPaisa,
  paisaToBdt,
  splitExpenseWithLargestRemainder,
  GroupExpense,
  Transfer,
} from "../../utils/groupTripBalances";
import CryptoJS from "crypto-js";

export type GroupMemberRole = "owner" | "editor" | "viewer";

export interface GroupTrip {
  id: string;
  owner_id: string;
  title: string;
  start_date: string;
  end_date: string;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

export interface GroupMember {
  trip_id: string;
  user_id: string;
  role: GroupMemberRole;
  joined_at: string;
  display_name?: string;
  avatar_url?: string;
}

export interface TripItem {
  id: string;
  trip_id: string;
  day: string;
  start_time?: string | null;
  title: string;
  location?: any;
  cost_paisa?: bigint | number | null;
  version: number;
  updated_by?: string | null;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface TripProposal {
  id: string;
  trip_id: string;
  creator_id: string;
  kind: "activity" | "stay" | "transport" | "dining" | string;
  title: string;
  details: {
    day?: string;
    start_time?: string;
    location?: any;
    cost_paisa?: number | string | bigint;
    description?: string;
    [key: string]: any;
  };
  closes_at: string;
  status: "open" | "accepted" | "rejected" | "expired";
  created_at: string;
  score?: number;
  upvotes?: number;
  downvotes?: number;
  userVote?: number;
}

export interface TripInvite {
  id: string;
  trip_id: string;
  token: string;
  expires_at: string;
  max_uses: number;
  uses: number;
}

export class VersionConflictError extends Error {
  constructor(message = "Conflict: Itinerary was modified by another member. Please refresh.") {
    super(message);
    this.name = "VersionConflictError";
  }
}

export const groupTripService = {
  /**
   * Create a new group trip and assign owner role to creator
   */
  async createTrip(params: {
    title: string;
    startDate: string;
    endDate: string;
    currency?: string;
  }): Promise<GroupTrip> {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) {
      throw new Error("User must be authenticated to create a trip");
    }

    const { data: trip, error: tripError } = await supabase
      .from("group_trips")
      .insert({
        owner_id: userId,
        title: params.title,
        start_date: params.startDate,
        end_date: params.endDate,
        currency: params.currency || "BDT",
      })
      .select()
      .single();

    if (tripError || !trip) {
      throw new Error(tripError?.message || "Failed to create group trip");
    }

    // Insert owner into group_members
    const { error: memberError } = await supabase.from("group_members").insert({
      trip_id: trip.id,
      user_id: userId,
      role: "owner",
    });

    if (memberError) {
      console.warn("Owner membership insert warning:", memberError);
    }

    appEventBus.publish(APP_EVENTS.GROUP_TRIP_UPDATED, {
      tripId: trip.id,
      action: "created",
      title: trip.title,
      timestamp: Date.now(),
    });

    return trip;
  },

  /**
   * Fetch trip details by id
   */
  async getTrip(tripId: string): Promise<GroupTrip | null> {
    const { data, error } = await supabase
      .from("group_trips")
      .select("*")
      .eq("id", tripId)
      .maybeSingle();

    if (error) {
      console.warn("Error fetching trip:", error);
      return null;
    }
    return data;
  },

  /**
   * Fetch all trips the user belongs to
   */
  async getUserTrips(): Promise<GroupTrip[]> {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return [];

    const { data: memberships, error } = await supabase
      .from("group_members")
      .select("trip_id, group_trips(*)")
      .eq("user_id", userId);

    if (error || !memberships) return [];

    return memberships
      .map((m: any) => m.group_trips)
      .filter(Boolean) as GroupTrip[];
  },

  /**
   * Fetch all members for a trip
   */
  async getMembers(tripId: string): Promise<GroupMember[]> {
    const { data, error } = await supabase
      .from("group_members")
      .select("*")
      .eq("trip_id", tripId)
      .order("joined_at", { ascending: true });

    if (error || !data) return [];
    return data;
  },

  /**
   * Fetch itinerary items ordered by day and sequence
   */
  async getItems(tripId: string): Promise<TripItem[]> {
    const { data, error } = await supabase
      .from("trip_items")
      .select("*")
      .eq("trip_id", tripId)
      .order("day", { ascending: true })
      .order("order_index", { ascending: true });

    if (error || !data) return [];
    return data;
  },

  /**
   * Create an itinerary item (Editor or Owner only)
   */
  async createItem(item: {
    trip_id: string;
    day: string;
    start_time?: string | null;
    title: string;
    location?: any;
    cost_paisa?: bigint | number | null;
    order_index?: number;
  }): Promise<TripItem> {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    const payload: any = {
      trip_id: item.trip_id,
      day: item.day,
      start_time: item.start_time || null,
      title: item.title,
      location: item.location || null,
      cost_paisa: item.cost_paisa ? item.cost_paisa.toString() : null,
      order_index: item.order_index ?? 0,
      version: 1,
      updated_by: userId || null,
    };

    const { data, error } = await supabase
      .from("trip_items")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to create trip item");
    }

    appEventBus.publish(APP_EVENTS.TRIP_ITEM_MUTATED, {
      itemId: data.id,
      tripId: data.trip_id,
      action: "inserted",
      day: data.day,
      version: data.version,
      timestamp: Date.now(),
    });

    return data;
  },

  /**
   * Update itinerary item with optimistic concurrency version check
   */
  async updateItemOptimistic(item: {
    id: string;
    trip_id: string;
    day: string;
    start_time?: string | null;
    title: string;
    location?: any;
    cost_paisa?: bigint | number | null;
    order_index?: number;
    expected_version: number;
  }): Promise<TripItem> {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    // Use RPC if available, or direct conditional atomic update
    const { data, error } = await supabase
      .from("trip_items")
      .update({
        day: item.day,
        start_time: item.start_time || null,
        title: item.title,
        location: item.location || null,
        cost_paisa: item.cost_paisa ? item.cost_paisa.toString() : null,
        order_index: item.order_index ?? 0,
        version: item.expected_version + 1,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("version", item.expected_version)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new VersionConflictError();
    }

    appEventBus.publish(APP_EVENTS.TRIP_ITEM_MUTATED, {
      itemId: data.id,
      tripId: data.trip_id,
      action: "updated",
      day: data.day,
      version: data.version,
      timestamp: Date.now(),
    });

    return data;
  },

  /**
   * Reorder items with optimistic updates
   */
  async reorderItemsOptimistic(
    itemsToUpdate: Array<{
      id: string;
      trip_id: string;
      day: string;
      order_index: number;
      version: number;
      title: string;
    }>
  ): Promise<void> {
    for (const it of itemsToUpdate) {
      await this.updateItemOptimistic({
        id: it.id,
        trip_id: it.trip_id,
        day: it.day,
        order_index: it.order_index,
        title: it.title,
        expected_version: it.version,
      });
    }

    if (itemsToUpdate.length > 0) {
      appEventBus.publish(APP_EVENTS.TRIP_ITEM_MUTATED, {
        itemId: itemsToUpdate[0].id,
        tripId: itemsToUpdate[0].trip_id,
        action: "reordered",
        timestamp: Date.now(),
      });
    }
  },

  /**
   * Delete an itinerary item
   */
  async deleteItem(itemId: string, tripId: string): Promise<void> {
    const { error } = await supabase.from("trip_items").delete().eq("id", itemId);
    if (error) {
      throw new Error(error.message);
    }
    appEventBus.publish(APP_EVENTS.TRIP_ITEM_MUTATED, {
      itemId,
      tripId,
      action: "deleted",
      timestamp: Date.now(),
    });
  },

  /**
   * Fetch proposals with current vote tallies and user vote
   */
  async getProposals(tripId: string): Promise<TripProposal[]> {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    const { data: proposals, error: propErr } = await supabase
      .from("trip_proposals")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (propErr || !proposals) return [];

    const proposalIds = proposals.map((p) => p.id);
    if (proposalIds.length === 0) return [];

    // Fetch votes for these proposals
    const { data: votes } = await supabase
      .from("trip_votes")
      .select("proposal_id, user_id, vote")
      .in("proposal_id", proposalIds);

    const votesMap = new Map<string, { up: number; down: number; userVote: number }>();
    proposalIds.forEach((pid) => votesMap.set(pid, { up: 0, down: 0, userVote: 0 }));

    (votes || []).forEach((v) => {
      const entry = votesMap.get(v.proposal_id);
      if (entry) {
        if (v.vote === 1) entry.up++;
        else if (v.vote === -1) entry.down++;
        if (userId && v.user_id === userId) {
          entry.userVote = v.vote;
        }
      }
    });

    return proposals.map((p) => {
      const tally = votesMap.get(p.id) || { up: 0, down: 0, userVote: 0 };
      return {
        ...p,
        upvotes: tally.up,
        downvotes: tally.down,
        score: tally.up - tally.down,
        userVote: tally.userVote,
      };
    });
  },

  /**
   * Create a proposal and notify group members
   */
  async createProposal(params: {
    trip_id: string;
    kind: string;
    title: string;
    details: any;
    closes_at: string;
    trip_title?: string;
  }): Promise<TripProposal> {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) throw new Error("Authentication required");

    const { data, error } = await supabase
      .from("trip_proposals")
      .insert({
        trip_id: params.trip_id,
        creator_id: userId,
        kind: params.kind,
        title: params.title,
        details: params.details || {},
        closes_at: params.closes_at,
        status: "open",
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to create proposal");
    }

    // Trigger push notification
    groupTripNotificationService.notifyNewProposal({
      tripId: params.trip_id,
      tripTitle: params.trip_title || "Group Trip",
      proposalTitle: data.title,
      creatorName: authData.user?.email?.split("@")[0] || "সহযাত্রী",
    });

    appEventBus.publish(APP_EVENTS.TRIP_PROPOSAL_MUTATED, {
      proposalId: data.id,
      tripId: data.trip_id,
      action: "created",
      status: data.status,
      timestamp: Date.now(),
    });

    return data;
  },

  /**
   * Cast vote (-1, 0, or 1) on a proposal
   */
  async castVote(proposalId: string, tripId: string, vote: -1 | 0 | 1): Promise<void> {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) throw new Error("Authentication required");

    if (vote === 0) {
      // Remove vote
      await supabase
        .from("trip_votes")
        .delete()
        .eq("proposal_id", proposalId)
        .eq("user_id", userId);
    } else {
      const { error } = await supabase
        .from("trip_votes")
        .upsert({
          proposal_id: proposalId,
          user_id: userId,
          vote,
        });

      if (error) throw new Error(error.message);
    }

    appEventBus.publish(APP_EVENTS.TRIP_PROPOSAL_MUTATED, {
      proposalId,
      tripId,
      action: "voted",
      timestamp: Date.now(),
    });
  },

  /**
   * Accept proposal: calls database function accept_proposal atomically
   */
  async acceptProposal(proposalId: string, tripTitle?: string): Promise<string> {
    const { data, error } = await supabase.rpc("accept_proposal", {
      p_proposal_id: proposalId,
    });

    if (error) {
      throw new Error(error.message || "Failed to accept proposal");
    }

    // Get proposal details for notification
    const { data: proposal } = await supabase
      .from("trip_proposals")
      .select("title, trip_id")
      .eq("id", proposalId)
      .maybeSingle();

    if (proposal) {
      groupTripNotificationService.notifyVoteResult({
        tripId: proposal.trip_id,
        tripTitle: tripTitle || "Group Trip",
        proposalTitle: proposal.title,
        status: "accepted",
      });

      appEventBus.publish(APP_EVENTS.TRIP_PROPOSAL_MUTATED, {
        proposalId,
        tripId: proposal.trip_id,
        action: "accepted",
        status: "accepted",
        timestamp: Date.now(),
      });
    }

    return data as string;
  },

  /**
   * Fetch all expenses for a trip
   */
  async getExpenses(tripId: string): Promise<GroupExpense[]> {
    const { data, error } = await supabase
      .from("trip_expenses")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map((exp: any) => ({
      ...exp,
      amount_paisa: BigInt(exp.amount_paisa),
    }));
  },

  /**
   * Add a new expense (integer paisa with largest-remainder split)
   */
  async addExpense(params: {
    trip_id: string;
    trip_title?: string;
    amount_paisa: bigint;
    description: string;
    split: any;
    paid_by?: string;
    allMemberIds: string[];
  }): Promise<void> {
    const { data: authData } = await supabase.auth.getUser();
    const userId = params.paid_by || authData?.user?.id;
    if (!userId) throw new Error("Payer is required");

    if (params.amount_paisa <= BigInt(0)) {
      throw new Error("Amount must be greater than zero");
    }

    const { data, error } = await supabase
      .from("trip_expenses")
      .insert({
        trip_id: params.trip_id,
        paid_by: userId,
        amount_paisa: params.amount_paisa.toString(),
        description: params.description,
        split: params.split,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to save expense");
    }

    // Compute shares to notify members of their portion
    const shares = splitExpenseWithLargestRemainder(
      params.amount_paisa,
      params.split,
      params.allMemberIds
    );

    // Notify involved members (except payer)
    for (const [memberId, sharePaisa] of shares.entries()) {
      if (memberId !== userId && sharePaisa > BigInt(0)) {
        groupTripNotificationService.notifyExpenseAdded({
          tripId: params.trip_id,
          tripTitle: params.trip_title || "Group Trip",
          payerName: authData?.user?.email?.split("@")[0] || "সহযাত্রী",
          description: params.description,
          mySharePaisa: sharePaisa,
        });
      }
    }

    appEventBus.publish(APP_EVENTS.TRIP_EXPENSE_MUTATED, {
      expenseId: data.id,
      tripId: data.trip_id,
      action: "created",
      amountPaisa: params.amount_paisa,
      paidBy: userId,
      timestamp: Date.now(),
    });
  },

  /**
   * Generate an invite token and store in trip_invites
   */
  async createInvite(params: {
    trip_id: string;
    max_uses?: number;
    expiresInHours?: number;
  }): Promise<{ token: string; link: string; deepLink: string; expiresAt: string }> {
    const token = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const tokenHash = CryptoJS.SHA256(token).toString(CryptoJS.enc.Hex).toLowerCase();

    const hours = params.expiresInHours || 72; // default 3 days
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

    const { error } = await supabase.from("trip_invites").insert({
      trip_id: params.trip_id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      max_uses: params.max_uses || 10,
      uses: 0,
    });

    if (error) {
      throw new Error(error.message || "Failed to create invite link");
    }

    const link = `https://shopnojatra.com/group-trip/join/${token}`;
    const deepLink = `shopnojatra://group-trip/join/${token}`;

    return { token, link, deepLink, expiresAt };
  },

  /**
   * Join a trip using an invite token: calls atomic join_trip RPC
   */
  async joinTrip(token: string): Promise<string> {
    const cleanToken = token.trim();
    if (!cleanToken) throw new Error("Invite token is required");

    const { data: tripId, error } = await supabase.rpc("join_trip", {
      p_token: cleanToken,
    });

    if (error) {
      throw new Error(error.message || "Failed to join trip");
    }

    appEventBus.publish(APP_EVENTS.GROUP_TRIP_UPDATED, {
      tripId: tripId as string,
      action: "member_joined",
      timestamp: Date.now(),
    });

    return tripId as string;
  },

  /**
   * Calculate group settlements and minimal debt transfers
   */
  calculateSettlement(
    expenses: GroupExpense[],
    members: string[]
  ): {
    balances: Record<string, bigint>;
    transfers: Transfer[];
    totalSpentPaisa: bigint;
  } {
    const balances = compute_balances(expenses, members);
    const transfers = minimise_transfers(balances);
    const totalSpentPaisa = expenses.reduce(
      (acc, e) => acc + BigInt(e.amount_paisa),
      BigInt(0)
    );
    return { balances, transfers, totalSpentPaisa };
  },

  /**
   * Subscribe to Realtime postgres mutations and bridge to appEventBus
   */
  subscribeTripRealtime(tripId: string, onUpdate: () => void): () => void {
    const channel = supabase
      .channel(`realtime-group-trip-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_items",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          onUpdate();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_proposals",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          onUpdate();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_expenses",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          onUpdate();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
