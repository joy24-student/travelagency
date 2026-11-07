import { crashReporter, initGlobalErrorHandlers, CrashReport } from "../crashReporter";
import { uxHealthMonitor } from "../uxHealthMonitor";

describe("CrashReporter & Global Error Handling System", () => {
  beforeEach(() => {
    uxHealthMonitor.resetMetrics();
  });

  afterAll(() => {
    uxHealthMonitor.destroy();
  });

  it("should initialize without errors", () => {
    expect(() => initGlobalErrorHandlers()).not.toThrow();
  });

  it("should capture and sanitize manual exceptions, stripping sensitive PII", () => {
    const receivedReports: CrashReport[] = [];
    const unsubscribe = crashReporter.addListener((report) => {
      receivedReports.push(report);
    });

    crashReporter.captureException(
      new Error("Failed for user user@example.com with token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123secret"),
      { screenName: "TestScreen" }
    );

    expect(receivedReports.length).toBe(1);
    const report = receivedReports[0];
    expect(report.type).toBe("manual_report");
    expect(report.isFatal).toBe(false);
    expect(report.message).not.toContain("user@example.com");
    expect(report.message).toContain("[REDACTED_EMAIL]");
    expect(report.message).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    expect(report.message).toContain("[REDACTED_JWT]");

    unsubscribe();
  });

  it("should support multiple subscribers and unsubscribe properly", () => {
    const listenerA = jest.fn();
    const listenerB = jest.fn();

    const unsubA = crashReporter.addListener(listenerA);
    const unsubB = crashReporter.addListener(listenerB);

    crashReporter.captureException(new Error("Multi-subscriber crash test"));

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);

    unsubA();
    crashReporter.captureException(new Error("Second crash test"));

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(2);

    unsubB();
  });
});
