import React, { useState, useEffect, useRef } from "react";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useAuth } from "../../src/hooks/useAuth";
import { AddWidgetModal } from "../../src/components/AddWidgetModal";


const TRIP_BLUE = "#0055F2";
const TRIP_PINK = "#FFF0F3";
const ACCENT_YELLOW = "#FACC15";

const HOTEL_CARDS = [
  {
    id: "h1",
    name: "NASA BANGKOK - Airport Rail Link R...",
    rating: "8/10",
    reviews: "16,347 reviews",
    price: "$18.00",
    originalPrice: "$19.00",
    discount: "5% off",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500",
    stars: 4,
  },
  {
    id: "h2",
    name: "Arawana Regency Park Sukhumvit",
    rating: "7.8/10",
    reviews: "468 reviews",
    price: "$44.00",
    originalPrice: "$118.00",
    discount: "62% off",
    image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=500",
    stars: 4,
  },
];

const TRAVELERS_FAVORITES = [
  {
    id: "tf1",
    title: "Tokyo",
    subTitle: "Top 6 Rides at Tokyo DisneySea You Can't Miss",
    bannerTag: "TOP 6 RIDES TOKYO DISNEYSEA",
    author: "Exit.Row.44",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600",
  },
  {
    id: "tf2",
    title: "Jakarta",
    subTitle: "payung island at thousand islands🌊",
    bannerTag: "",
    author: "elvirasaa_",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600",
  },
];

export default function TripsTab() {
  const { user } = useAuth();
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);

  // Monitor scroll position to trigger morphing Back-to-Top button
  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      if (value > 120) {
        if (!isScrolled) setIsScrolled(true);
      } else {
        if (isScrolled) setIsScrolled(false);
      }
    });
    return () => scrollY.removeListener(listenerId);
  }, [isScrolled, scrollY]);

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      {/* Screenshot 2 Header Bar */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>My Trips</Text>

        <Pressable
          style={styles.widgetBtn}
          onPress={() => setShowWidgetModal(true)}
        >
          <Ionicons name="grid-outline" size={18} color="#111827" />
          <Text style={styles.widgetBtnText}>Widget</Text>
        </Pressable>
      </View>

      {/* Main Scroll Content */}
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Top Filter Pills Row (Screenshot 2) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          <Pressable
            style={[
              styles.filterPill,
              activeFilter === "all" && styles.filterPillActive,
            ]}
            onPress={() => setActiveFilter("all")}
          >
            <Ionicons name="calendar-outline" size={14} color="#111827" />
            <Text style={styles.filterPillText}>All Bookings</Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterPill,
              activeFilter === "itineraries" && styles.filterPillActive,
            ]}
            onPress={() => setActiveFilter("itineraries")}
          >
            <Ionicons name="swap-horizontal-outline" size={14} color="#111827" />
            <Text style={styles.filterPillText}>My itineraries</Text>
          </Pressable>

          <Pressable
            style={styles.filterPill}
            onPress={() => router.push("/screens/search" as any)}
          >
            <Ionicons name="options-outline" size={14} color="#111827" />
            <Ionicons name="chevron-down" size={14} color="#111827" />
          </Pressable>
        </ScrollView>

        {/* Horizontal Booking Cards Carousel (Screenshot 2) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hotelCardsRow}
        >
          {HOTEL_CARDS.map((hotel) => (
            <Pressable
              key={hotel.id}
              style={styles.hotelCard}
              onPress={() => router.push("/screens/search-stays" as any)}
            >
              <Image source={{ uri: hotel.image }} style={styles.hotelImage} />
              
              <View style={styles.hotelCardContent}>
                <Text style={styles.hotelName} numberOfLines={2}>
                  {hotel.name}
                </Text>

                {/* Stars Rating */}
                <View style={styles.starsRow}>
                  {Array.from({ length: hotel.stars }).map((_, i) => (
                    <Ionicons key={i} name="star" size={12} color="#F59E0B" />
                  ))}
                </View>

                {/* Reviews Count */}
                <Text style={styles.reviewText}>
                  <Text style={{ fontWeight: "800", color: TRIP_BLUE }}>{hotel.rating}</Text> · {hotel.reviews}
                </Text>

                {/* Price & Discount Badge Row */}
                <View style={styles.priceRow}>
                  <Text style={styles.priceText}>{hotel.price}</Text>
                  <Text style={styles.originalPriceText}>{hotel.originalPrice}</Text>
                  <View style={styles.pinkDiscountBadge}>
                    <Text style={styles.pinkDiscountText}>{hotel.discount}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Quick AI Tool Action Pills (Screenshot 2) */}
        <View style={styles.quickAiActionRow}>
          <Pressable
            style={styles.aiActionPill}
            onPress={() => router.push("/(screens)/ai-assistant" as any)}
          >
            <Text style={styles.aiSparkleIcon}>✨</Text>
            <Text style={styles.aiActionLabel}>Plan a trip with AI</Text>
          </Pressable>

          <Pressable
            style={styles.aiActionPill}
            onPress={() => router.push("/screens/explore" as any)}
          >
            <Ionicons name="map-outline" size={15} color="#111827" />
            <Text style={styles.aiActionLabel}>Explore on map</Text>
          </Pressable>
        </View>

        {/* "Travelers' favorites" Section (Screenshot 2) */}
        <View style={styles.favoritesSectionHeader}>
          <Text style={styles.favoritesTitle}>Travelers' favorites</Text>
          <Pressable
            style={styles.momentsLinkRow}
            onPress={() => router.push("/screens/community" as any)}
          >
            <Text style={styles.momentsLinkText}>Moments</Text>
            <Ionicons name="chevron-forward" size={14} color={TRIP_BLUE} />
          </Pressable>
        </View>

        {/* Vertical Feed Cards Grid */}
        <View style={styles.favoritesGrid}>
          {TRAVELERS_FAVORITES.map((card) => (
            <Pressable key={card.id} style={styles.favoriteCard}>
              <Image source={{ uri: card.image }} style={styles.favoriteCardImage} />

              <View style={styles.favoriteCardOverlay}>
                {card.bannerTag ? (
                  <Text style={styles.yellowBannerText}>{card.bannerTag}</Text>
                ) : null}

                <View style={styles.favoriteBottomDetails}>
                  <Text style={styles.favoriteCityTitle}>{card.title}</Text>
                  <Text style={styles.favoriteSubTitle} numberOfLines={2}>
                    {card.subTitle}
                  </Text>

                  <View style={styles.authorBadgeRow}>
                    <Image source={{ uri: card.avatar }} style={styles.authorAvatarImg} />
                    <Text style={styles.authorNameText}>{card.author}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Bottom Scroll Padding */}
        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* Screenshot 1: Add Trip.com Widget Overlay Modal */}
      <AddWidgetModal
        visible={showWidgetModal}
        onClose={() => setShowWidgetModal(false)}
        onAddWidget={() => setShowWidgetModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  widgetBtn: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  widgetBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  scrollContent: {
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
  },
  filterPillsRow: {
    paddingHorizontal: 16,
    gap: 8,
    marginVertical: 10,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: "#111827",
    backgroundColor: "#FFFFFF",
  },
  filterPillActive: {
    backgroundColor: "#F1F5F9",
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  hotelCardsRow: {
    paddingHorizontal: 16,
    gap: 12,
    marginVertical: 8,
  },
  hotelCard: {
    width: 210,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  hotelImage: {
    width: "100%",
    height: 120,
  },
  hotelCardContent: {
    padding: 10,
  },
  hotelName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 16,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  priceText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  originalPriceText: {
    fontSize: 11,
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  pinkDiscountBadge: {
    backgroundColor: TRIP_PINK,
    borderWidth: 1,
    borderColor: "#FFE4E8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pinkDiscountText: {
    color: "#E11D48",
    fontSize: 10,
    fontWeight: "900",
  },
  quickAiActionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginVertical: 14,
  },
  aiActionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    borderRadius: 20,
  },
  aiSparkleIcon: {
    fontSize: 14,
  },
  aiActionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  favoritesSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 12,
  },
  favoritesTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  momentsLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  momentsLinkText: {
    fontSize: 14,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  favoritesGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
  },
  favoriteCard: {
    flex: 1,
    height: 250,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  favoriteCardImage: {
    width: "100%",
    height: "100%",
  },
  favoriteCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    padding: 12,
    justifyContent: "space-between",
  },
  yellowBannerText: {
    color: ACCENT_YELLOW,
    fontSize: 16,
    fontWeight: "900",
    width: "80%",
    lineHeight: 18,
  },
  favoriteBottomDetails: {
    justifyContent: "flex-end",
  },
  favoriteCityTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  favoriteSubTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    opacity: 0.9,
  },
  authorBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  authorAvatarImg: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  authorNameText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});
