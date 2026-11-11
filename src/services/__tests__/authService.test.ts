import { authService } from "../auth";
import { supabase } from "../../utils/supabase";

jest.mock("../../utils/supabase", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      verifyOtp: jest.fn(),
      updateUser: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
    },
  },
}));

describe("Authentication Service (authService)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signUp", () => {
    it("should successfully sign up a new user with metadata", async () => {
      const mockUser = { id: "user-123", email: "traveler@test.com" };
      (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser, session: null },
        error: null,
      });

      const res = await authService.signUp("traveler@test.com", "Password123!", "Jane", "Doe");

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: "traveler@test.com",
        password: "Password123!",
        options: {
          data: {
            first_name: "Jane",
            last_name: "Doe",
          },
          emailRedirectTo: undefined,
        },
      });
      expect(res.user?.id).toBe("user-123");
    });

    it("should throw error if Supabase signUp fails", async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: new Error("User already exists"),
      });

      await expect(
        authService.signUp("existing@test.com", "Pass123!", "John", "Doe")
      ).rejects.toThrow("User already exists");
    });
  });

  describe("signIn", () => {
    it("should authenticate user with valid credentials", async () => {
      const mockSession = { access_token: "mock-jwt-token" };
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: { user: { id: "u1" }, session: mockSession },
        error: null,
      });

      const result = await authService.signIn("traveler@test.com", "validPass");
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "traveler@test.com",
        password: "validPass",
      });
      expect(result.session?.access_token).toBe("mock-jwt-token");
    });

    it("should throw error for invalid credentials", async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: new Error("Invalid login credentials"),
      });

      await expect(authService.signIn("traveler@test.com", "wrongPass")).rejects.toThrow(
        "Invalid login credentials"
      );
    });
  });

  describe("signOut", () => {
    it("should call supabase auth.signOut without errors", async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({ error: null });

      await expect(authService.signOut()).resolves.toBeUndefined();
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    });

    it("should throw when signOut fails", async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({
        error: new Error("Network timeout"),
      });

      await expect(authService.signOut()).rejects.toThrow("Network timeout");
    });
  });

  describe("Password Reset & Verification", () => {
    it("should trigger reset password email for user", async () => {
      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValueOnce({
        data: {},
        error: null,
      });

      const res = await authService.resetPassword("user@example.com");
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {});
      expect(res).toBeDefined();
    });

    it("should verify recovery OTP and set new password", async () => {
      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValueOnce({
        data: { session: { access_token: "tok" } },
        error: null,
      });
      (supabase.auth.updateUser as jest.Mock).mockResolvedValueOnce({
        data: { user: { id: "u1" } },
        error: null,
      });

      const res = await authService.verifyPasswordResetOtp(
        "user@example.com",
        "123456",
        "NewSecret123!"
      );
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: "user@example.com",
        token: "123456",
        type: "recovery",
      });
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: "NewSecret123!",
      });
      expect(res.user?.id).toBe("u1");
    });
  });
});
