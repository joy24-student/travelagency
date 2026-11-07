import re

trains_path = "src/screens/TrainsScreen.tsx"
with open(trains_path, "r", encoding="utf-8") as f:
    c = f.read()

# 1. Import SeatPickerModal
if "SeatPickerModal" not in c:
    c = c.replace(
        'import { showLocalizedAlert } from "../utils/localizedAlert";',
        'import { showLocalizedAlert } from "../utils/localizedAlert";\nimport { SeatPickerModal } from "../components/trains/SeatPickerModal";'
    )

# 2. Add activeSeatPicker state
state_target = "  const [showClassModal, setShowClassModal] = useState(false);"
new_state = """  const [showClassModal, setShowClassModal] = useState(false);
  const [activeSeatPicker, setActiveSeatPicker] = useState<{
    train: BDTrain;
    classItem: ClassQuotaAvailability;
  } | null>(null);"""

if "activeSeatPicker" not in c:
    c = c.replace(state_target, new_state)

# 3. Modify handleBookingHandoff to open SeatPickerModal first
old_handoff_start = """  // Booking Handoff Handler
  const handleBookingHandoff = (train: BDTrain, classItem: ClassQuotaAvailability) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 1. Validate user session with useAuthStore
    const authUser = useAuthStore.getState().user;
    const authIsAuthenticated = useAuthStore.getState().isAuthenticated;

    if (!authIsAuthenticated || !authUser) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Sign In Required",
        "Please log in to your account to reserve Bangladesh Railway seats, lock your quota seats, and proceed to checkout.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign In",
            style: "default",
            onPress: () => {
              Haptics.selectionAsync();
              router.push("/(auth)/login" as any);
            },
          },
        ]
      );
      return;
    }

    // 2. Validate Travel Date (guaranteed zero unhandled errors)
    const { date: sanitizedDate } = sanitizeTravelDate(travelDate);
    const dateISO = sanitizedDate.toISOString().split("T")[0];
    const totalFare = classItem.fare * passengersCount;"""

new_handoff_start = """  // Booking Handoff Handler - opens SeatPickerModal first
  const handleBookingHandoff = (train: BDTrain, classItem: ClassQuotaAvailability) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 1. Validate user session with useAuthStore
    const authUser = useAuthStore.getState().user;
    const authIsAuthenticated = useAuthStore.getState().isAuthenticated;

    if (!authIsAuthenticated || !authUser) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Sign In Required",
        "Please log in to your account to reserve Bangladesh Railway seats, lock your quota seats, and proceed to checkout.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign In",
            style: "default",
            onPress: () => {
              Haptics.selectionAsync();
              router.push("/(auth)/login" as any);
            },
          },
        ]
      );
      return;
    }

    // Open SeatPickerModal for interactive zoom/pan seat selection
    setActiveSeatPicker({ train, classItem });
  };

  const handleCompleteSeatSelection = (
    selectedSeats: string[],
    calculatedTotalFare: number
  ) => {
    if (!activeSeatPicker) return;
    const { train, classItem } = activeSeatPicker;
    setActiveSeatPicker(null);

    // 2. Validate Travel Date
    const { date: sanitizedDate } = sanitizeTravelDate(travelDate);
    const dateISO = sanitizedDate.toISOString().split("T")[0];
    const totalFare = calculatedTotalFare || classItem.fare * passengersCount;"""

if old_handoff_start in c:
    c = c.replace(old_handoff_start, new_handoff_start)
    # Also update reference in payment router push to include seats
    c = c.replace(
        'reference: `Train: ${train.name} (${train.train_number}) - ${classItem.classMeta.name}`,',
        'reference: `Train: ${train.name} (${train.train_number}) - ${classItem.classMeta.name} (Seats: ${selectedSeats.join(", ")})`,'
    )
    print("handleBookingHandoff updated to open SeatPickerModal!")
else:
    print("old_handoff_start match failed")

# 4. Render SeatPickerModal before </SafeAreaView>
modal_render = """      {/* ─── Interactive Seat Picker Modal with Zoom/Pan & Accessible Icons ─── */}
      {activeSeatPicker && (
        <SeatPickerModal
          visible={!!activeSeatPicker}
          trainName={activeSeatPicker.train.name}
          trainNumber={activeSeatPicker.train.train_number}
          seatClass={activeSeatPicker.classItem.classMeta.name}
          passengersCount={passengersCount}
          farePerSeat={activeSeatPicker.classItem.fare}
          onClose={() => setActiveSeatPicker(null)}
          onConfirmSeats={handleCompleteSeatSelection}
        />
      )}
    </SafeAreaView>"""

c = c.replace("    </SafeAreaView>\n  );\n}", modal_render + "\n  );\n}")

with open(trains_path, "w", encoding="utf-8") as f:
    f.write(c)
print("TrainsScreen updated successfully!")
