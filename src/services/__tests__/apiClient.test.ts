import { AppError, apiRequest } from "../apiClient";

describe("apiClient & AppError Taxonomy", () => {
  it("should correctly classify network errors as retryable", () => {
    const typeError = new TypeError("Network request failed");
    const appErr = AppError.from(typeError, { url: "/test", method: "GET" });

    expect(appErr.kind).toBe("network");
    expect(appErr.isRetryable).toBe(true);
  });

  it("should correctly identify 502, 503, 504 server errors as retryable", () => {
    const err502 = new AppError("Bad Gateway", { kind: "server", status: 502, timestamp: Date.now() });
    const err500 = new AppError("Internal Server Error", { kind: "server", status: 500, timestamp: Date.now() });

    expect(err502.isRetryable).toBe(true);
    expect(err500.isRetryable).toBe(false);
  });

  it("should identify 401 and 403 as non-retryable auth errors", () => {
    const authErr = new AppError("Unauthorized", { kind: "auth", status: 401, timestamp: Date.now() });

    expect(authErr.kind).toBe("auth");
    expect(authErr.isRetryable).toBe(false);
  });

  it("should identify 400 and 422 as validation errors with field error tracking", () => {
    const validationErr = new AppError("Invalid input", {
      kind: "validation",
      status: 422,
      fieldErrors: {
        email: ["Invalid email format"],
      },
      timestamp: Date.now(),
    });

    expect(validationErr.kind).toBe("validation");
    expect(validationErr.status).toBe(422);
    expect(validationErr.fieldErrors?.email).toContain("Invalid email format");
    expect(validationErr.isRetryable).toBe(false);
  });
});
