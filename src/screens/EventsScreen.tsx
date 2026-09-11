import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// Sample Event Data matching reference UI
interface EventItem {
  id: string;
  title: string;
  artist: string;
  date: string;
  location: string;
  price: string;
  status: "Upcoming" | "On Sale" | "Sold Out";
  badgeColor: string;
  poster: string;
  venue: string;
  description: string;
}

const POPULAR_EVENTS: EventItem[] = [
  {
    id: "1",
    title: "BIGBANG 2026-2027 WORLD TOUR",
    artist: "BIGBANG",
    date: "Nov 7",
    location: "Bangkok",
    price: "USD317.12",
    status: "Upcoming",
    badgeColor: "#FFF1F2",
    poster: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=600&q=80",
    venue: "Rajamangala National Stadium",
    description: "The legendary K-pop icons return for their monumental 2026-2027 World Tour in Bangkok!",
  },
  {
    id: "2",
    title: "Taipei | BIGBANG 2026-2027 WORLD TOUR",
    artist: "BIGBANG",
    date: "Oct 9-Oct 11",
    location: "Taipei",
    price: "USD280.00",
    status: "Upcoming",
    badgeColor: "#FFF1F2",
    poster: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    venue: "Taipei Dome",
    description: "Experience 3 nights of unforgettable performances at the iconic Taipei Dome.",
  },
  {
    id: "3",
    title: "PaJang World Tour | Taipei",
    artist: "PaJang & Guests",
    date: "Oct 24",
    location: "Taipei",
    price: "USD150.00",
    status: "On Sale",
    badgeColor: "#F3E8FF",
    poster: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    venue: "Taipei Music Center",
    description: "Electrifying live vocals and visual production by top Asian pop sensations.",
  },
];

const AVAILABLE_SOON_EVENTS: EventItem[] = [
  {
    id: "4",
    title: "The Weeknd After Hours Stadium Tour",
    artist: "The Weeknd",
    date: "Dec 12",
    location: "Tokyo",
    price: "USD220.00",
    status: "Upcoming",
    badgeColor: "#FEF3C7",
    poster: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80",
    venue: "Japan National Stadium",
    description: "Immersive stadium light show featuring hits from After Hours & Dawn FM.",
  },
  {
    id: "5",
    title: "Yoasobi 3D Dome Tour 2026",
    artist: "Yoasobi",
    date: "Dec 18-20",
    location: "Osaka",
    price: "USD190.00",
    status: "Upcoming",
    badgeColor: "#E0F2FE",
    poster: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
    venue: "Kyocera Dome Osaka",
    description: "J-pop sensation Yoasobi brings story music to life with holographic visual effects.",
  },
];

const FILTER_TAGS = [
  { id: "all", label: "All" },
  { id: "concerts", label: "Concerts", icon: "musical-notes-outline" },
  { id: "exhibitions", label: "Exhibitions", icon: "color-palette-outline" },
  { id: "musicals", label: "Musicals", icon: "ticket-outline" },
  { id: "sports", label: "Sports", icon: "football-outline" },
];

const LOCATIONS = ["Global", "Bangkok", "Taipei", "Tokyo", "Seoul", "Singapore", "Hong Kong"];

export function EventsScreen() {
  const insets = useSafeAreaInsets();

  // State
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("Global");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);

  // Event detail modal
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);
  const [claimed, setClaimed] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(true);

  // Search filter logic
  const filteredPopular = POPULAR_EVENTS.filter((evt) =>
    evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    evt.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    evt.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* ─── Top Navigation & Search Bar Header ────────────────────────────── */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/");
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search an artist or show"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => setShowClaimModal(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="share-social-outline" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── Title Section ("Events. Global ∨") ─────────────────────────── */}
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <Text style={styles.titleText}>Events</Text>
            <View style={styles.yellowDot} />
          </View>

          <TouchableOpacity
            style={styles.locationSelector}
            onPress={() => setShowLocationModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.locationText}>{selectedLocation}</Text>
            <Ionicons name="chevron-down" size={18} color="#1E293B" />
          </TouchableOpacity>
        </View>

        {/* ─── Category Filter Chips ───────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScrollView}
          contentContainerStyle={styles.chipsContainer}
        >
          {FILTER_TAGS.map((tag) => {
            const isSelected = selectedTag === tag.id;
            return (
              <TouchableOpacity
                key={tag.id}
                style={[
                  styles.chipItem,
                  isSelected && styles.chipItemSelected,
                ]}
                onPress={() => setSelectedTag(tag.id)}
                activeOpacity={0.7}
              >
                {tag.icon ? (
                  <Ionicons
                    name={tag.icon as any}
                    size={16}
                    color={isSelected ? "#FFFFFF" : "#1E293B"}
                    style={{ marginRight: 6 }}
                  />
                ) : null}
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {tag.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── "Popular" Section ───────────────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Popular</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.popularCarousel}
        >
          {filteredPopular.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.eventCard}
              activeOpacity={0.88}
              onPress={() => setSelectedEvent(item)}
            >
              <Image source={{ uri: item.poster }} style={styles.eventCardImage} />

              {/* Status Badge */}
              <View style={[styles.badgeContainer, { backgroundColor: item.badgeColor }]}>
                <Text
                  style={[
                    styles.badgeText,
                    item.status === "On Sale" && styles.badgeOnSaleText,
                  ]}
                >
                  {item.status}
                </Text>
              </View>

              {/* Gradient Text Overlay at Bottom */}
              <LinearGradient
                colors={["transparent", "rgba(15, 23, 42, 0.92)"]}
                style={styles.eventGradientOverlay}
              >
                <Text style={styles.eventCardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.eventCardDate}>
                  {item.date} · {item.location}
                </Text>
                <Text style={styles.eventCardPrice}>
                  From <Text style={styles.priceBold}>{item.price}</Text>
                </Text>
                <View style={styles.dotIndicatorRow}>
                  <View style={[styles.miniDot, styles.miniDotActive]} />
                  <View style={styles.miniDot} />
                  <View style={styles.miniDot} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ─── Concerts & Events Travel Voucher Pack Banner ───────────────── */}
        <TouchableOpacity
          style={styles.bannerContainer}
          activeOpacity={0.9}
          onPress={() => setShowClaimModal(true)}
        >
          <LinearGradient
            colors={["#FF2A55", "#FF4D79", "#FF6B8B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bannerGradient}
          >
            <View style={styles.bannerLeftCol}>
              <Text style={styles.bannerSmallText}>Concerts & Events</Text>
              <Text style={styles.bannerMainTitle}>Travel Voucher Pack</Text>
              <Text style={styles.bannerDiscount}>Up to 8% off</Text>
            </View>

            <View style={styles.bannerIconsRow}>
              <View style={styles.iconSquare}>
                <Ionicons name="bed-outline" size={16} color="#FF2A55" />
              </View>
              <View style={styles.iconSquare}>
                <Ionicons name="airplane-outline" size={16} color="#FF2A55" />
              </View>
              <View style={styles.iconSquare}>
                <Ionicons name="umbrella-outline" size={16} color="#FF2A55" />
              </View>
              <View style={styles.iconSquare}>
                <Ionicons name="car-outline" size={16} color="#FF2A55" />
              </View>
            </View>

            <TouchableOpacity
              style={styles.claimButton}
              onPress={() => setShowClaimModal(true)}
            >
              <Text style={styles.claimText}>{claimed ? "Claimed!" : "Claim"}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </TouchableOpacity>

        {/* ─── Two-Column Subscriptions & Calendar Row ─────────────────────── */}
        <View style={styles.gridRow}>
          {/* Card 1: My Subscriptions */}
          <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.8}
            onPress={() => setIsSubscribed(!isSubscribed)}
          >
            <View style={styles.gridCardHeader}>
              <Text style={styles.gridCardTitle}>My Subscriptions</Text>
              <Ionicons name="chevron-forward" size={16} color="#64748B" />
            </View>

            <View style={styles.subscriptionRow}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
                }}
                style={styles.artistAvatar}
              />
              <View style={styles.artistInfo}>
                <Text style={styles.artistName}>A-Lin</Text>
                <Text style={styles.artistLocation}>Dongguan</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 2: Events Calendar */}
          <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.8}
            onPress={() => router.push("/screens/trip-planner" as any)}
          >
            <View style={styles.gridCardHeader}>
              <Text style={styles.gridCardTitle}>Events Calendar</Text>
              <Ionicons name="chevron-forward" size={16} color="#64748B" />
            </View>

            <View style={styles.calendarPostersRow}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=200&q=80",
                }}
                style={styles.miniPoster}
              />
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=200&q=80",
                }}
                style={styles.miniPoster}
              />
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=200&q=80",
                }}
                style={styles.miniPoster}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── "Available soon" Section ────────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Available soon</Text>
          <TouchableOpacity onPress={() => setSelectedTag("all")}>
            <View style={styles.showMoreRow}>
              <Text style={styles.showMoreText}>Show more</Text>
              <Ionicons name="chevron-forward" size={16} color="#2563EB" />
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.popularCarousel}
        >
          {AVAILABLE_SOON_EVENTS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.eventCard}
              activeOpacity={0.88}
              onPress={() => setSelectedEvent(item)}
            >
              <Image source={{ uri: item.poster }} style={styles.eventCardImage} />

              <View style={[styles.badgeContainer, { backgroundColor: item.badgeColor }]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>

              <LinearGradient
                colors={["transparent", "rgba(15, 23, 42, 0.92)"]}
                style={styles.eventGradientOverlay}
              >
                <Text style={styles.eventCardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.eventCardDate}>
                  {item.date} · {item.location}
                </Text>
                <Text style={styles.eventCardPrice}>
                  From <Text style={styles.priceBold}>{item.price}</Text>
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>

      {/* ─── Floating AI Speech Bubble Button ──────────────────────────────── */}
      <View style={styles.floatingAiContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.floatingAiBtn}
          activeOpacity={0.85}
          onPress={() => router.push("/screens/trip-planner" as any)}
        >
          <LinearGradient
            colors={["#EFF6FF", "#E0F2FE", "#FFFFFF"]}
            style={styles.floatingAiGradient}
          >
            <Ionicons name="chatbubbles-outline" size={22} color="#2563EB" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ─── MODAL: Location Selector ─────────────────────────────────────── */}
      <Modal
        visible={showLocationModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {LOCATIONS.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={styles.locationOption}
                onPress={() => {
                  setSelectedLocation(loc);
                  setShowLocationModal(false);
                }}
              >
                <Text
                  style={[
                    styles.locationOptionText,
                    selectedLocation === loc && styles.locationSelectedText,
                  ]}
                >
                  {loc}
                </Text>
                {selectedLocation === loc && (
                  <Ionicons name="checkmark" size={20} color="#2563EB" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Event Detail & Ticket Booking ─────────────────────────── */}
      <Modal
        visible={!!selectedEvent}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            <View style={styles.eventModalHeader}>
              <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.eventModalTitle}>Event Details</Text>
              <Ionicons name="share-outline" size={22} color="#0F172A" />
            </View>

            <ScrollView style={{ padding: 16 }}>
              <Image source={{ uri: selectedEvent.poster }} style={styles.detailPoster} />

              <View style={styles.detailTitleBox}>
                <Text style={styles.detailTitle}>{selectedEvent.title}</Text>
                <Text style={styles.detailVenue}>📍 {selectedEvent.venue}</Text>
                <Text style={styles.detailDate}>📅 {selectedEvent.date} · {selectedEvent.location}</Text>
              </View>

              <View style={styles.detailDescBox}>
                <Text style={styles.detailDescTitle}>About the Event</Text>
                <Text style={styles.detailDescText}>{selectedEvent.description}</Text>
              </View>

              <View style={styles.detailPriceRow}>
                <Text style={styles.detailPriceLabel}>Starting Price</Text>
                <Text style={styles.detailPriceVal}>{selectedEvent.price}</Text>
              </View>

              <TouchableOpacity
                style={styles.bookTicketBtn}
                onPress={() => {
                  alert(`Tickets reserved for ${selectedEvent.title}!`);
                  setSelectedEvent(null);
                }}
              >
                <Text style={styles.bookTicketText}>Buy Tickets</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* ─── MODAL: Claim Voucher Pack ────────────────────────────────────── */}
      <Modal
        visible={showClaimModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowClaimModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.claimModalSheet}>
            <Ionicons name="gift-outline" size={48} color="#FF2A55" style={{ alignSelf: "center" }} />
            <Text style={styles.claimModalTitle}>Concerts & Events Voucher Pack</Text>
            <Text style={styles.claimModalSub}>
              Unlock up to 8% discount on hotel stays, flight bookings, and local car rentals for your next live show!
            </Text>

            <TouchableOpacity
              style={styles.claimConfirmBtn}
              onPress={() => {
                setClaimed(true);
                setShowClaimModal(false);
              }}
            >
              <Text style={styles.claimConfirmText}>Claim Voucher Pack</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 80,
  },

  /* Top Navigation Row */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  searchBar: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  shareBtn: {
    padding: 4,
  },

  /* Title Row ("Events. Global ∨") */
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  titleLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  yellowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
    marginLeft: 3,
    marginTop: 8,
  },
  locationSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },

  /* Category Filter Chips */
  chipsScrollView: {
    marginBottom: 16,
  },
  chipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chipItem: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  chipItemSelected: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },

  /* Popular Section */
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  popularCarousel: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  eventCard: {
    width: 185,
    height: 275,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    position: "relative",
  },
  eventCardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  badgeContainer: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E11D48",
  },
  badgeOnSaleText: {
    color: "#7E22CE",
  },
  eventGradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    padding: 12,
    justifyContent: "flex-end",
  },
  eventCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 18,
  },
  eventCardDate: {
    fontSize: 12,
    color: "#CBD5E1",
    marginTop: 4,
  },
  eventCardPrice: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  priceBold: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dotIndicatorRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
  },
  miniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  miniDotActive: {
    backgroundColor: "#FFFFFF",
    width: 12,
  },

  /* Travel Voucher Pack Banner */
  bannerContainer: {
    marginHorizontal: 16,
    borderRadius: 30,
    overflow: "hidden",
    marginBottom: 20,
  },
  bannerGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  bannerLeftCol: {},
  bannerSmallText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    opacity: 0.9,
  },
  bannerMainTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    marginVertical: 1,
  },
  bannerDiscount: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.95,
  },
  bannerIconsRow: {
    flexDirection: "row",
    gap: 5,
  },
  iconSquare: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  claimButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  claimText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FF2A55",
  },

  /* Two-Column Grid */
  gridRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  gridCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  gridCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  subscriptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  artistAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  artistInfo: {},
  artistName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  artistLocation: {
    fontSize: 12,
    color: "#64748B",
  },
  calendarPostersRow: {
    flexDirection: "row",
    gap: 6,
  },
  miniPoster: {
    width: 32,
    height: 46,
    borderRadius: 4,
  },

  /* Available Soon Link */
  showMoreRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },

  /* Floating AI Button */
  floatingAiContainer: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
  },
  floatingAiBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  floatingAiGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  locationOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  locationOptionText: {
    fontSize: 16,
    color: "#1E293B",
  },
  locationSelectedText: {
    fontWeight: "700",
    color: "#2563EB",
  },

  /* Detail Modal */
  eventModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  eventModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  detailPoster: {
    width: "100%",
    height: 260,
    borderRadius: 16,
  },
  detailTitleBox: {
    marginVertical: 16,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  detailVenue: {
    fontSize: 15,
    color: "#2563EB",
    fontWeight: "600",
    marginTop: 6,
  },
  detailDate: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  detailDescBox: {
    marginBottom: 20,
  },
  detailDescTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  detailDescText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },
  detailPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  detailPriceLabel: {
    fontSize: 15,
    color: "#64748B",
  },
  detailPriceVal: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  bookTicketBtn: {
    backgroundColor: "#FF2A55",
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  bookTicketText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Claim Modal */
  claimModalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  claimModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginTop: 12,
  },
  claimModalSub: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 20,
  },
  claimConfirmBtn: {
    backgroundColor: "#FF2A55",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  claimConfirmText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
