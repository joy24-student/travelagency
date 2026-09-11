import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { UIScreen } from "../data/screens";
import { useAuth } from "../hooks/useAuth";
import { useCompleteBookingFlow, useUserBookings } from "../hooks/useBooking";
import { bookingRepository } from "../services/repositories/booking";
import { BottomNav } from "./Navigation";
import { TopBar } from "./TopBar";

const primary = "#287dfa";

export function BookingSystemScreen({ screen }: { screen: UIScreen }) {
  const { user } = useAuth();
  const {
    bookings,
    loading: bookingsLoading,
    refetch,
  } = useUserBookings(user?.id);
  const { completeBookingFlow, loading: saving } = useCompleteBookingFlow();
  const [traveler, setTraveler] = useState({
    first_name: "Alex",
    last_name: "Morgan",
    email: user?.email ?? "alex@example.com",
    phone: "+1 555 0198",
    nationality: "US",
  });
  const [trip, setTrip] = useState({
    destination_city: "Tokyo",
    destination_country: "Japan",
    start_date: "2026-07-18",
    end_date: "2026-07-24",
    final_price: "1480",
  });
  const [statusMessage, setStatusMessage] = useState("");
  const latestBooking = bookings[0];

  const timeline = useMemo(
    () => latestBooking?.trip_timeline_events ?? [],
    [latestBooking],
  );
  const invoice = latestBooking?.invoices?.[0];
  const voucher = latestBooking?.vouchers?.[0];
  const refund = latestBooking?.refund_requests?.[0];

  const submitBooking = async () => {
    if (!user?.id) {
      setStatusMessage(
        "Sign in first so Supabase RLS can attach this booking to your account.",
      );
      return;
    }

    const amount = Number(trip.final_price) || 0;

    try {
      setStatusMessage("");
      const confirmed = await completeBookingFlow({
        userId: user.id,
        payload: {
          traveler,
          booking: {
            product_type: "package",
            destination_city: trip.destination_city,
            destination_country: trip.destination_country,
            start_date: trip.start_date,
            end_date: trip.end_date,
            number_of_guests: 2,
            total_price: amount,
            tax_amount: 82,
            service_fee: 24,
            final_price: amount + 106,
            currency: "USD",
            special_requests: "Window seats and late hotel check-in.",
          },
          passengers: [
            { ...traveler, passenger_type: "adult", is_primary: true },
            {
              first_name: "Jamie",
              last_name: "Morgan",
              email: traveler.email,
              passenger_type: "adult",
            },
          ],
          items: [
            {
              product_type: "package",
              product_name: `${trip.destination_city} flight + hotel bundle`,
              quantity: 1,
              unit_price: amount,
              line_total: amount,
            },
          ],
          payment: {
            payment_method: "card",
            payment_gateway: "manual",
          },
        },
      });

      setStatusMessage(
        `Confirmed ${(confirmed as any)?.booking_reference || "Booking"}. Invoice and voucher are ready.`,
      );
      refetch();
    } catch (error) {
      setStatusMessage((error as Error).message);
    }
  };

  const requestRefund = async () => {
    if (!user?.id || !latestBooking) return;

    try {
      await bookingRepository.requestRefund(latestBooking.id, user.id, {
        payment_id: latestBooking.booking_payments?.[0]?.id,
        amount: Math.min(Number(latestBooking.final_price ?? 0), 250),
        currency: latestBooking.currency ?? "USD",
        reason: "Traveler requested a date change refund review.",
      });
      setStatusMessage(
        "Refund request added to Supabase and the trip timeline.",
      );
      refetch();
    } catch (error) {
      setStatusMessage((error as Error).message);
    }
  };

  return (
    <SafeAreaView style={styles.shell}>
      <TopBar screen={screen} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Booking System</Text>
          <Text style={styles.title}>Traveler to voucher flow</Text>
          <Text style={styles.subtitle}>
            Create a booking, save passenger details, confirm payment, issue an
            invoice, issue a voucher, track the trip, and request refunds.
          </Text>
        </View>

        <Section icon="person-outline" title="Traveler Details">
          <Field
            label="First name"
            value={traveler.first_name}
            onChangeText={(first_name) =>
              setTraveler({ ...traveler, first_name })
            }
          />
          <Field
            label="Last name"
            value={traveler.last_name}
            onChangeText={(last_name) =>
              setTraveler({ ...traveler, last_name })
            }
          />
          <Field
            label="Email"
            value={traveler.email}
            onChangeText={(email) => setTraveler({ ...traveler, email })}
          />
          <Field
            label="Phone"
            value={traveler.phone}
            onChangeText={(phone) => setTraveler({ ...traveler, phone })}
          />
        </Section>

        <Section icon="airplane-outline" title="Booking Flow">
          <Field
            label="Destination"
            value={trip.destination_city}
            onChangeText={(destination_city) =>
              setTrip({ ...trip, destination_city })
            }
          />
          <Field
            label="Country"
            value={trip.destination_country}
            onChangeText={(destination_country) =>
              setTrip({ ...trip, destination_country })
            }
          />
          <View style={styles.split}>
            <Field
              label="Start"
              value={trip.start_date}
              onChangeText={(start_date) => setTrip({ ...trip, start_date })}
              compact
            />
            <Field
              label="End"
              value={trip.end_date}
              onChangeText={(end_date) => setTrip({ ...trip, end_date })}
              compact
            />
          </View>
          <Field
            label="Base price"
            value={trip.final_price}
            onChangeText={(final_price) => setTrip({ ...trip, final_price })}
            keyboardType="numeric"
          />
          <Pressable
            disabled={saving}
            onPress={submitBooking}
            style={[styles.primaryButton, saving && styles.disabled]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Create Confirmed Booking
              </Text>
            )}
          </Pressable>
          {statusMessage ? (
            <Text style={styles.statusMessage}>{statusMessage}</Text>
          ) : null}
        </Section>

        <Section icon="people-outline" title="Passenger Details">
          <InfoRow
            label="Primary"
            value={`${traveler.first_name} ${traveler.last_name}`}
          />
          <InfoRow label="Companion" value="Jamie Morgan" />
          <InfoRow label="Stored in" value="booking_passengers" />
        </Section>

        <Section icon="receipt-outline" title="Invoice & Voucher">
          {bookingsLoading ? <ActivityIndicator color={primary} /> : null}
          <InfoRow
            label="Latest booking"
            value={latestBooking?.booking_reference ?? "No booking yet"}
          />
          <InfoRow
            label="Invoice"
            value={invoice?.invoice_number ?? "Created after confirmation"}
          />
          <InfoRow
            label="Voucher"
            value={voucher?.voucher_code ?? "Issued after confirmation"}
          />
          <InfoRow
            label="Amount"
            value={
              latestBooking
                ? `${latestBooking.currency} ${latestBooking.final_price}`
                : "USD 0"
            }
          />
        </Section>

        <Section icon="git-branch-outline" title="Trip Timeline">
          {(timeline.length
            ? timeline
            : [
                {
                  title: "Waiting for booking",
                  event_type: "created",
                  event_at: new Date().toISOString(),
                },
              ]
          ).map((event: any) => (
            <View
              key={`${event.event_type}-${event.event_at}`}
              style={styles.timelineRow}
            >
              <View style={styles.timelineDot} />
              <View style={styles.timelineText}>
                <Text style={styles.timelineTitle}>{event.title}</Text>
                <Text style={styles.timelineMeta}>{event.event_type}</Text>
              </View>
            </View>
          ))}
        </Section>

        <Section icon="refresh-circle-outline" title="Refund Tracking">
          <InfoRow
            label="Status"
            value={refund?.status ?? "No refund requested"}
          />
          <InfoRow
            label="Reason"
            value={refund?.reason ?? "Refund requests appear here"}
          />
          <Pressable
            disabled={!latestBooking}
            onPress={requestRefund}
            style={[styles.secondaryButton, !latestBooking && styles.disabled]}
          >
            <Text style={styles.secondaryButtonText}>
              Request Refund Review
            </Text>
          </Pressable>
        </Section>
      </ScrollView>
      <BottomNav active="My Trips" color={primary} />
    </SafeAreaView>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons color={primary} name={icon} size={20} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  compact,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric";
  compact?: boolean;
}) {
  return (
    <View style={[styles.fieldWrap, compact && styles.compactField]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: "#f5f7fa",
    flex: 1,
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 112,
  },
  header: {
    backgroundColor: "#102a43",
    borderRadius: 8,
    padding: 18,
  },
  kicker: {
    color: "#8fd3ff",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    marginTop: 6,
  },
  subtitle: {
    color: "#d8e7f4",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 8,
    gap: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  sectionIcon: {
    alignItems: "center",
    backgroundColor: "#e8f3ff",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
  },
  fieldWrap: {
    gap: 6,
  },
  compactField: {
    flex: 1,
  },
  fieldLabel: {
    color: "#667085",
    fontSize: 12,
    fontWeight: "800",
  },
  input: {
    backgroundColor: "#f8fafc",
    borderColor: "#e5e7eb",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
    minHeight: 46,
    paddingHorizontal: 12,
  },
  split: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: primary,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#e8f3ff",
    borderRadius: 8,
    minHeight: 46,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: primary,
    fontSize: 14,
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.55,
  },
  statusMessage: {
    color: "#344054",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  infoRow: {
    alignItems: "flex-start",
    borderTopColor: "#f2f4f7",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingTop: 10,
  },
  infoLabel: {
    color: "#667085",
    fontSize: 12,
    fontWeight: "800",
    width: 112,
  },
  infoValue: {
    color: "#111827",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  timelineRow: {
    flexDirection: "row",
    gap: 10,
  },
  timelineDot: {
    backgroundColor: primary,
    borderRadius: 999,
    height: 10,
    marginTop: 5,
    width: 10,
  },
  timelineText: {
    flex: 1,
  },
  timelineTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  timelineMeta: {
    color: "#667085",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
});
