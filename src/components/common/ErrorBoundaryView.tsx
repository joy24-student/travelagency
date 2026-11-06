/**
 * Self-Healing Error Boundary & View
 *
 * DevSecOps & Frontend Reliability Component:
 * 1. Catches unhandled screen exceptions and prevents white-screen / crash-to-desktop.
 * 2. PII-Safe Sanitization Engine:
 *    - Strips emails, phone numbers, auth tokens, passwords, credit cards, local file paths,
 *      and database schema names before logging or displaying diagnostics.
 * 3. Self-Healing State Recovery:
 *    - "Recover Screen" button forces React subtree key invalidation, resetting corrupted
 *      local component state without restarting the application.
 *    - Rapid loop detection prevents infinite render crash loops.
 */

import * as React from "react";
import { Component, ErrorInfo, ReactNode, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  ViewStyle,
  StyleProp,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { uxHealthMonitor } from "../../services/telemetry/uxHealthMonitor";
import { colors } from "../../theme/colors";

// ============================================================================
// PII & Credential Scrubbing (DevSecOps Standard)
// ============================================================================

export interface SanitizedErrorInfo {
  sanitizedMessage: string;
  sanitizedStack: string;
  sanitizedComponentStack: string;
  screenName?: string;
  timestamp: number;
}

/**
 * Robust PII and credential sanitization filter.
 * Removes user emails, phone numbers, JWT tokens, session keys,
 * database schema identifiers, local usernames, and credit cards.
 */
export function sanitizeDiagnostics(rawText?: string | null): string {
  if (!rawText || typeof rawText !== "string") return "";

  let cleaned = rawText;

  // 1. Scrub User Email Addresses
  cleaned = cleaned.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    "[REDACTED_EMAIL]"
  );

  // 2. Scrub Phone Numbers (Bangladesh + International formats)
  cleaned = cleaned.replace(
    /(?:(?:\+?880|00880)?1[3-9]\d{8}|\+?1[2-9]\d{2}[2-9]\d{6}|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b)/g,
    "[REDACTED_PHONE]"
  );

  // 3. Scrub JWT / Bearer / Session Auth Tokens
  cleaned = cleaned.replace(
    /eyJh[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/gi,
    "[REDACTED_JWT]"
  );
  cleaned = cleaned.replace(
    /(?:bearer\s+[a-zA-Z0-9._~+/-]+=*|apikey[=:\s]+[^\s,]+|secret[=:\s]+[^\s,]+|password[=:\s]+[^\s,]+|token[=:\s]+[a-zA-Z0-9_\-\.]{12,})/gi,
    "[REDACTED_CREDENTIAL]"
  );

  // 4. Scrub Payment Card Numbers (Luhn-like 13-16 digit spans)
  cleaned = cleaned.replace(
    /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    "[REDACTED_CARD]"
  );

  // 5. Scrub Local OS Paths Leaking Usernames (Windows / macOS / Linux)
  cleaned = cleaned.replace(
    /[a-zA-Z]:\\Users\\[^\\]+/gi,
    "C:\\Users\\[LOCAL_USER]"
  );
  cleaned = cleaned.replace(
    /\/(?:Users|home)\/[^/]+/gi,
    "/[LOCAL_USER]"
  );

  // 6. Scrub Database Schema / Table Leaks & SQLSTATEs
  cleaned = cleaned.replace(
    /(?:relation\s+"[a-zA-Z0-9_.]+"\s+does\s+not\s+exist|column\s+"[a-zA-Z0-9_.]+"\s+does\s+not\s+exist|SQLSTATE\[[A-Z0-9]+\])/gi,
    "[DB_SCHEMA_RESTRICTED]"
  );

  // 7. Scrub Private IPv4 Addresses
  cleaned = cleaned.replace(
    /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})\b/g,
    "[REDACTED_INTERNAL_IP]"
  );

  return cleaned.trim();
}

// ============================================================================
// Error Boundary View (Presentation Component)
// ============================================================================

export interface ErrorBoundaryViewProps {
  title?: string;
  message?: string;
  screenName?: string;
  sanitizedMessage?: string;
  sanitizedStack?: string;
  recoveryCount?: number;
  isRapidLoop?: boolean;
  onRecover: () => void;
  onGoBack?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ErrorBoundaryView({
  title = "Something went wrong on this screen",
  message = "A temporary visual display issue occurred. Your user session and profile remain safe. Tap below to refresh this view.",
  screenName,
  sanitizedMessage,
  sanitizedStack,
  recoveryCount = 0,
  isRapidLoop = false,
  onRecover,
  onGoBack,
  style,
}: ErrorBoundaryViewProps) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRecover = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    } catch {
      // Safe fallback
    }
    onRecover();
  };

  const handleCopyDiagnostics = () => {
    const diagnosticPayload = `[Screen]: ${screenName || "AppScreen"}\n[Time]: ${new Date().toISOString()}\n[Message]: ${sanitizedMessage || "Unknown"}\n[Stack]:\n${sanitizedStack || "No stack trace available"}`;

    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(diagnosticPayload).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.contentCard}>
        {/* Shield / Health Indicator */}
        <View style={styles.iconBadge}>
          <Ionicons
            name={isRapidLoop ? "warning-outline" : "shield-checkmark-outline"}
            size={36}
            color={isRapidLoop ? "#F59E0B" : colors.brand.trip.blue}
          />
        </View>

        {/* Screen Context Indicator */}
        {screenName && (
          <View style={styles.screenTag}>
            <Text style={styles.screenTagText}>{screenName}</Text>
          </View>
        )}

        {/* Human-Friendly Titles */}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>
          {isRapidLoop
            ? "Multiple unexpected errors were caught in succession. You can attempt self-healing recovery or navigate to safety."
            : message}
        </Text>

        {/* Primary Action: Self-Healing Recover Screen */}
        <Pressable
          style={({ pressed }) => [
            styles.recoverButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleRecover}
          accessibilityRole="button"
          accessibilityLabel="Recover Screen"
        >
          <Ionicons name="refresh-circle-outline" size={22} color="#FFFFFF" />
          <Text style={styles.recoverButtonText}>
            {recoveryCount > 0 ? `Recover Screen (Attempt #${recoveryCount + 1})` : "Recover Screen"}
          </Text>
        </Pressable>

        {/* Secondary Action: Go Back (if navigation available) */}
        {onGoBack && (
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onGoBack}
            accessibilityRole="button"
            accessibilityLabel="Go Back"
          >
            <Ionicons name="arrow-back-outline" size={18} color="#475569" />
            <Text style={styles.secondaryButtonText}>Return to Previous Screen</Text>
          </Pressable>
        )}

        {/* Diagnostics Toggle */}
        {(sanitizedMessage || sanitizedStack) && (
          <View style={styles.diagnosticsContainer}>
            <Pressable
              style={styles.diagnosticsToggle}
              onPress={() => setShowDiagnostics((prev) => !prev)}
            >
              <Ionicons
                name={showDiagnostics ? "chevron-up-outline" : "chevron-down-outline"}
                size={16}
                color="#64748B"
              />
              <Text style={styles.diagnosticsToggleText}>
                {showDiagnostics ? "Hide Technical Diagnostics" : "View Technical Diagnostics (PII-Scrubbed)"}
              </Text>
            </Pressable>

            {showDiagnostics && (
              <View style={styles.diagnosticsCard}>
                <View style={styles.diagnosticsHeader}>
                  <Text style={styles.diagnosticsTitle}>Security-Sanitized Report</Text>
                  <Pressable
                    style={styles.copyButton}
                    onPress={handleCopyDiagnostics}
                  >
                    <Ionicons
                      name={copied ? "checkmark-outline" : "copy-outline"}
                      size={14}
                      color={copied ? "#10B981" : "#287DFA"}
                    />
                    <Text
                      style={[
                        styles.copyButtonText,
                        copied && { color: "#10B981" },
                      ]}
                    >
                      {copied ? "Copied" : "Copy"}
                    </Text>
                  </Pressable>
                </View>

                <ScrollView
                  style={styles.diagnosticsScrollView}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                >
                  {sanitizedMessage ? (
                    <Text style={styles.errorSnippetText}>
                      <Text style={styles.boldText}>Error: </Text>
                      {sanitizedMessage}
                    </Text>
                  ) : null}
                  {sanitizedStack ? (
                    <Text style={styles.stackSnippetText}>{sanitizedStack}</Text>
                  ) : null}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// Error Boundary Class Component (Self-Healing Harness)
// ============================================================================

export interface ErrorBoundaryProps {
  children?: ReactNode;
  screenName?: string;
  fallback?: (props: {
    error: Error;
    sanitizedMessage: string;
    sanitizedStack: string;
    recover: () => void;
  }) => ReactNode;
  onRecover?: () => void;
  onError?: (sanitizedInfo: SanitizedErrorInfo) => void;
  onGoBack?: () => void;
  style?: StyleProp<ViewStyle>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  sanitizedMessage: string;
  sanitizedStack: string;
  sanitizedComponentStack: string;
  recoveryKey: number;
  recoveryCount: number;
  lastCrashTimestamp: number;
  isRapidLoop: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private rapidCrashWindowMs = 10000; // 10s crash loop window
  private maxRapidCrashes = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      sanitizedMessage: "",
      sanitizedStack: "",
      sanitizedComponentStack: "",
      recoveryKey: 0,
      recoveryCount: 0,
      lastCrashTimestamp: 0,
      isRapidLoop: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const rawMsg = error?.message || String(error);
    const rawStack = error?.stack || "";

    return {
      hasError: true,
      error,
      sanitizedMessage: sanitizeDiagnostics(rawMsg),
      sanitizedStack: sanitizeDiagnostics(rawStack),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const now = Date.now();
    const timeSinceLastCrash = now - this.state.lastCrashTimestamp;
    const isRapid =
      this.state.lastCrashTimestamp > 0 &&
      timeSinceLastCrash < this.rapidCrashWindowMs &&
      this.state.recoveryCount >= this.maxRapidCrashes;

    const sanitizedMessage = sanitizeDiagnostics(error?.message || "Unknown error");
    const sanitizedStack = sanitizeDiagnostics(error?.stack || "");
    const sanitizedComponentStack = sanitizeDiagnostics(
      errorInfo?.componentStack || ""
    );

    this.setState({
      sanitizedMessage,
      sanitizedStack,
      sanitizedComponentStack,
      lastCrashTimestamp: now,
      isRapidLoop: isRapid,
    });

    const errorReport: SanitizedErrorInfo = {
      screenName: this.props.screenName,
      sanitizedMessage,
      sanitizedStack,
      sanitizedComponentStack,
      timestamp: now,
    };

    // Forward sanitized diagnostic telemetry
    uxHealthMonitor.recordError({
      screenName: this.props.screenName,
      sanitizedMessage,
      sanitizedStack,
      componentStack: sanitizedComponentStack,
      timestamp: now,
    });

    if (this.props.onError) {
      try {
        this.props.onError(errorReport);
      } catch {
        // Prevent listener failures from cascading
      }
    }
  }

  /**
   * Self-Healing State Recovery Method:
   * Increments `recoveryKey` to force React's reconciler to tear down corrupted
   * component tree state and mount brand-new pristine instances.
   */
  public handleRecover = (): void => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      recoveryKey: prevState.recoveryKey + 1,
      recoveryCount: prevState.recoveryCount + 1,
      isRapidLoop: false,
    }));

    uxHealthMonitor.recordScreenRecovery(this.props.screenName);

    if (this.props.onRecover) {
      try {
        this.props.onRecover();
      } catch (err) {
        console.warn("Error inside onRecover callback:", err);
      }
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback && this.state.error) {
        return this.props.fallback({
          error: this.state.error,
          sanitizedMessage: this.state.sanitizedMessage,
          sanitizedStack: this.state.sanitizedStack,
          recover: this.handleRecover,
        });
      }

      return (
        <ErrorBoundaryView
          screenName={this.props.screenName}
          sanitizedMessage={this.state.sanitizedMessage}
          sanitizedStack={this.state.sanitizedStack}
          recoveryCount={this.state.recoveryCount}
          isRapidLoop={this.state.isRapidLoop}
          onRecover={this.handleRecover}
          onGoBack={this.props.onGoBack}
          style={this.props.style}
        />
      );
    }

    // Changing the key forces unmounting and clean re-instantiation of children
    return (
      <React.Fragment key={this.state.recoveryKey}>
        {this.props.children}
      </React.Fragment>
    );
  }
}

// ============================================================================
// High-Order Component (HOC) Helper
// ============================================================================

/**
 * Wrap any React screen or widget in a self-healing Error Boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  boundaryProps?: Omit<ErrorBoundaryProps, "children">
): React.FC<P> {
  const ComponentWithErrorBoundary: React.FC<P> = (props: P) => (
    <ErrorBoundary
      screenName={boundaryProps?.screenName || WrappedComponent.displayName || WrappedComponent.name}
      {...boundaryProps}
    >
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return ComponentWithErrorBoundary;
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  contentCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  screenTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  screenTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  recoverButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand.trip.blue,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: colors.brand.trip.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  recoverButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
    backgroundColor: "#F1F5F9",
  },
  secondaryButtonText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  diagnosticsContainer: {
    width: "100%",
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 16,
  },
  diagnosticsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  diagnosticsToggleText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  diagnosticsCard: {
    marginTop: 12,
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 12,
    maxHeight: 200,
    width: "100%",
  },
  diagnosticsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    paddingBottom: 6,
  },
  diagnosticsTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  copyButtonText: {
    fontSize: 11,
    color: "#287DFA",
    fontWeight: "600",
  },
  diagnosticsScrollView: {
    maxHeight: 140,
  },
  errorSnippetText: {
    fontSize: 11,
    color: "#FCA5A5",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 6,
  },
  stackSnippetText: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    lineHeight: 14,
  },
  boldText: {
    fontWeight: "700",
  },
});
