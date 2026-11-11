import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { safeGoBack } from "../../utils/navigationHelper";
import { useLanguage } from "../../context/LanguageContext";
import { FONTS } from "../../theme/typography";

export interface BookingStepperProps {
  currentStep: 1 | 2 | 3 | 4;
  breadcrumbs?: string[];
  productType?: string;
  onStepPress?: (step: 1 | 2 | 3 | 4) => void;
  onBackPress?: () => void;
  showBreadcrumbs?: boolean;
}

export const BOOKING_STEPS = [
  { step: 1, labelEn: "Select", labelBn: "নির্বাচন", icon: "cart-outline" as const },
  { step: 2, labelEn: "Travelers", labelBn: "যাত্রী তথ্য", icon: "person-outline" as const },
  { step: 3, labelEn: "Review", labelBn: "পর্যালোচনা", icon: "receipt-outline" as const },
  { step: 4, labelEn: "Payment", labelBn: "পেমেন্ট", icon: "card-outline" as const },
] as const;

export function BookingStepper({
  currentStep,
  breadcrumbs = ["Home", "Booking", "Checkout"],
  productType,
  onStepPress,
  onBackPress,
  showBreadcrumbs = true,
}: BookingStepperProps) {
  const { language } = useLanguage();
  const isBn = language === "bn";

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      safeGoBack("/(tabs)");
    }
  };

  const activeStepObj = BOOKING_STEPS.find((s) => s.step === currentStep) || BOOKING_STEPS[0];
  const stepTitle = isBn ? activeStepObj.labelBn : activeStepObj.labelEn;
  const whereAmIText = isBn
    ? `ধাপ ${currentStep}/৪: ${stepTitle}`
    : `Step ${currentStep} of 4: ${stepTitle}`;

  return (
    <View style={styles.container}>
      {/* ─── Breadcrumb & Header Row ─────────────────────────────────────────── */}
      <View style={styles.topRow}>
        <Pressable
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </Pressable>

        {/* Breadcrumb Trail */}
        {showBreadcrumbs && breadcrumbs.length > 0 ? (
          <View style={styles.breadcrumbTrail}>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <View key={crumb} style={styles.crumbItem}>
                  <Text
                    style={[
                      styles.crumbText,
                      isLast && styles.crumbTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {crumb}
                  </Text>
                  {!isLast && (
                    <Ionicons
                      name="chevron-forward"
                      size={12}
                      color="#94A3B8"
                      style={styles.crumbSeparator}
                    />
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {/* "Where am I" Pill Badge */}
        <View style={styles.whereAmIBadge}>
          <View style={styles.liveIndicatorDot} />
          <Text style={styles.whereAmIText}>{whereAmIText}</Text>
        </View>
      </View>

      {/* ─── 4-Step Stepper Progress Bar ───────────────────────────────────────── */}
      <View style={styles.stepperRow}>
        {BOOKING_STEPS.map((s, idx) => {
          const isCompleted = s.step < currentStep;
          const isActive = s.step === currentStep;
          const isPending = s.step > currentStep;
          const isClickable = onStepPress && (isCompleted || isActive);

          const stepLabel = isBn ? s.labelBn : s.labelEn;

          return (
            <React.Fragment key={s.step}>
              {/* Step Circle & Label */}
              <Pressable
                disabled={!isClickable}
                onPress={() => onStepPress && onStepPress(s.step as any)}
                style={styles.stepItem}
              >
                <View
                  style={[
                    styles.stepCircle,
                    isCompleted && styles.stepCircleCompleted,
                    isActive && styles.stepCircleActive,
                    isPending && styles.stepCirclePending,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        isActive && styles.stepNumberActive,
                        isPending && styles.stepNumberPending,
                      ]}
                    >
                      {s.step}
                    </Text>
                  )}
                </View>

                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isCompleted && styles.stepLabelCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {stepLabel}
                </Text>
              </Pressable>

              {/* Progress Connector Line (between steps) */}
              {idx < BOOKING_STEPS.length - 1 && (
                <View
                  style={[
                    styles.connectorLine,
                    isCompleted && styles.connectorLineActive,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  breadcrumbTrail: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    overflow: "hidden",
  },
  crumbItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  crumbText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  crumbTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
  crumbSeparator: {
    marginHorizontal: 4,
  },
  whereAmIBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    gap: 6,
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0055F2",
  },
  whereAmIText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0055F2",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepItem: {
    alignItems: "center",
    gap: 4,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  stepCircleCompleted: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  stepCircleActive: {
    backgroundColor: "#0055F2",
    borderColor: "#0055F2",
    shadowColor: "#0055F2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 4px rgba(15, 23, 42, 0.3)" } : {}),
  },
  stepCirclePending: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stepNumberActive: {
    color: "#FFFFFF",
  },
  stepNumberPending: {
    color: "#94A3B8",
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#94A3B8",
  },
  stepLabelActive: {
    color: "#0055F2",
    fontWeight: "700",
  },
  stepLabelCompleted: {
    color: "#10B981",
    fontWeight: "600",
  },
  connectorLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 6,
    marginBottom: 16,
  },
  connectorLineActive: {
    backgroundColor: "#10B981",
  },
});
