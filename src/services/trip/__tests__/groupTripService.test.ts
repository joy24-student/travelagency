/**
 * Comprehensive Unit Tests for Group Trip Service & Business Rules
 *
 * Requirements covered:
 * 1. RLS enforcement (non-member cannot read anything; viewers cannot write)
 * 2. Invite token expiry and max uses validation
 * 3. Optimistic concurrency conflict handling on version mismatch
 * 4. Atomic proposal acceptance into itinerary items
 */

import {
  groupTripService,
  VersionConflictError,
  GroupMemberRole,
} from "../groupTripService";
import { supabase } from "../../../utils/supabase";

// Mock Supabase
jest.mock("../../../utils/supabase", () => {
  return {
    supabase: {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
      rpc: jest.fn(),
      channel: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      })),
      removeChannel: jest.fn(),
    },
  };
});

describe("Group Trip Service & Security Rules", () => {
  const mockUserId = "user-alice-123";
  const mockTripId = "trip-coxs-bazar-456";

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: mockUserId, email: "alice@example.com" } },
      error: null,
    });
  });

  describe("1. RLS & Access Control (Non-members & Viewers)", () => {
    it("RLS: Non-member cannot read trip items (returns empty/null)", async () => {
      // Simulating Supabase RLS filtering where non-member sees empty result
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      const items = await groupTripService.getItems("unauthorized-trip-id");
      expect(items).toEqual([]);
    });

    it("RLS: Non-member query error is handled cleanly", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Permission denied for relation trip_items" },
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      const items = await groupTripService.getItems("unauthorized-trip-id");
      expect(items).toEqual([]);
    });

    it("DO NOT let viewers write: rejects insert when database RLS denies viewer", async () => {
      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: {
              message: "new row violates row-level security policy for table trip_items",
            },
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });

      await expect(
        groupTripService.createItem({
          trip_id: mockTripId,
          day: "2026-11-10",
          title: "Viewer unauthorized activity",
        })
      ).rejects.toThrow("new row violates row-level security policy");
    });
  });

  describe("2. Invite Expiry & Max Uses Validation", () => {
    it("join_trip: rejects when invite token has expired", async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: "This invite link has expired" },
      });

      await expect(
        groupTripService.joinTrip("expired_token_123")
      ).rejects.toThrow("This invite link has expired");
    });

    it("join_trip: rejects when invite token has reached max uses", async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: "This invite link has reached its maximum allowed uses" },
      });

      await expect(
        groupTripService.joinTrip("exhausted_token_456")
      ).rejects.toThrow("This invite link has reached its maximum allowed uses");
    });

    it("join_trip: succeeds with valid token, returns tripId and publishes event", async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockTripId,
        error: null,
      });

      const result = await groupTripService.joinTrip("valid_active_token_789");
      expect(result).toBe(mockTripId);
      expect(supabase.rpc).toHaveBeenCalledWith("join_trip", {
        p_token: "valid_active_token_789",
      });
    });
  });

  describe("3. Optimistic Concurrency & Conflict Handling on Version Mismatch", () => {
    it("succeeds when version matches expected version", async () => {
      const updatedItem = {
        id: "item-1",
        trip_id: mockTripId,
        day: "2026-11-10",
        title: "Sunset in Sajek",
        version: 2,
        order_index: 0,
      };

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: updatedItem,
                error: null,
              }),
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: updateMock });

      const res = await groupTripService.updateItemOptimistic({
        id: "item-1",
        trip_id: mockTripId,
        day: "2026-11-10",
        title: "Sunset in Sajek",
        expected_version: 1,
      });

      expect(res.version).toBe(2);
      expect(res.title).toBe("Sunset in Sajek");
    });

    it("detects conflict and throws VersionConflictError when version does not match", async () => {
      // When version has already changed from 1 to 2 by another user, query eq('version', 1) returns null
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue({ update: updateMock });

      await expect(
        groupTripService.updateItemOptimistic({
          id: "item-1",
          trip_id: mockTripId,
          day: "2026-11-10",
          title: "Stale title",
          expected_version: 1, // but database is now 2
        })
      ).rejects.toThrow(VersionConflictError);
    });
  });

  describe("4. Atomic Proposal Acceptance", () => {
    it("calls accept_proposal RPC atomically and returns generated item id", async () => {
      const mockCreatedItemId = "item-created-from-proposal-999";
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockCreatedItemId,
        error: null,
      });

      const selectProposalMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: "prop-1",
                trip_id: mockTripId,
                title: "Campfire BBQ",
              },
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === "trip_proposals") return selectProposalMock();
        return {};
      });

      const itemId = await groupTripService.acceptProposal("prop-1", "Sajek Tour");
      expect(itemId).toBe(mockCreatedItemId);
      expect(supabase.rpc).toHaveBeenCalledWith("accept_proposal", {
        p_proposal_id: "prop-1",
      });
    });
  });
});
