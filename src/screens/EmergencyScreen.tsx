/**
 * Critical Safety & Emergency Systems Hub - Shopno Jatra
 * One-Tap Tourist SOS, 15km Nearby Medical & Police Finder,
 * Offline Medical Phrasebook, and Foreign Embassy Directory.
 *
 * Strict Boundaries: Isolated safety hub; zero impact on booking or marketing flows.
 *
 * @module screens/EmergencyScreen
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import {
  sosService,
  GeoCoordinates,
  EmergencyContact,
  EmergencyFacility,
  EmergencyFacilityType,
  MedicalPhrase,
  MedicalPhraseCategory,
  EmbassyContact,
  NATIONAL_HOTLINES,
  SOSDispatchResult,
} from "../services/safety/sosService";
import { colors } from "../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type TabKey = "sos" | "nearby" | "phrases" | "embassies";

export const EmergencyScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabKey>("sos");

  // GPS Location State
  const [coords, setCoords] = useState<GeoCoordinates | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Emergency Contacts
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isContactsModalVisible, setIsContactsModalVisible] = useState<boolean>(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactRel, setNewContactRel] = useState<EmergencyContact["relationship"]>("Family");
  const [newContactNotify, setNewContactNotify] = useState(true);

  // SOS Panic State & Countdown
  const [isSOSArmed, setIsSOSArmed] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(3);
  const [isDispatchingSOS, setIsDispatchingSOS] = useState<boolean>(false);
  const [sosResult, setSosResult] = useState<SOSDispatchResult | null>(null);
  const [isResultModalVisible, setIsResultModalVisible] = useState<boolean>(false);
  const [customSOSNote, setCustomSOSNote] = useState<string>("");
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarAnim = useRef(new Animated.Value(1)).current;
  const radarOpacity = useRef(new Animated.Value(0.7)).current;

  // Nearby Facilities State
  const [facilityTypeFilter, setFacilityTypeFilter] = useState<EmergencyFacilityType | "all">("all");
  const [facilitySearch, setFacilitySearch] = useState<string>("");
  const [facilityRadius, setFacilityRadius] = useState<number>(15);

  // Phrasebook State
  const [phraseCategory, setPhraseCategory] = useState<MedicalPhraseCategory | "all">("all");
  const [phraseSearch, setPhraseSearch] = useState<string>("");
  const [selectedPhrase, setSelectedPhrase] = useState<MedicalPhrase | null>(null);
  const [isDoctorCardVisible, setIsDoctorCardVisible] = useState<boolean>(false);

  // Embassy State
  const [embassySearch, setEmbassySearch] = useState<string>("");

  // ── Pulsing Radar Animation for SOS Button ───────────────────────────────
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    const radarLoop = Animated.loop(
      Animated.parallel([
        Animated.timing(radarAnim, {
          toValue: 1.45,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(radarOpacity, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    radarLoop.start();

    return () => {
      pulseLoop.stop();
      radarLoop.stop();
    };
  }, []);

  // ── Initial Data Fetch ───────────────────────────────────────────────────
  useEffect(() => {
    loadLocation();
    loadContacts();
  }, []);

  const loadLocation = async () => {
    setIsLocating(true);
    setGpsError(null);
    try {
      const loc = await sosService.getCurrentLocation();
      setCoords(loc);
    } catch (err: any) {
      setGpsError("Unable to acquire live GPS. Using cached tourist coordinates.");
    } finally {
      setIsLocating(false);
    }
  };

  const loadContacts = async () => {
    try {
      const data = await sosService.getContacts();
      setContacts(data);
    } catch (err) {
      console.warn("Failed to load contacts:", err);
    }
  };

  // ── SOS Activation & Countdown Logic ────────────────────────────────────
  const handleStartSOS = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsSOSArmed(true);
    setCountdown(3);

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    let currentCount = 3;
    countdownTimerRef.current = setInterval(() => {
      currentCount -= 1;
      setCountdown(currentCount);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      if (currentCount <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        executeSOSDispatch();
      }
    }, 1000);
  };

  const handleCancelSOS = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setIsSOSArmed(false);
    setCountdown(3);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const executeSOSDispatch = async () => {
    setIsSOSArmed(false);
    setIsDispatchingSOS(true);
    try {
      const result = await sosService.triggerOneTapSOS(customSOSNote);
      setSosResult(result);
      setIsResultModalVisible(true);
    } catch (err: any) {
      Alert.alert("SOS Error", "Failed to dispatch SOS. Calling 999 directly.", [
        { text: "Call 999", onPress: () => sosService.triggerCall("999") },
        { text: "Dismiss", style: "cancel" },
      ]);
    } finally {
      setIsDispatchingSOS(false);
    }
  };

  // ── Add New Emergency Contact ───────────────────────────────────────────
  const handleAddContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      Alert.alert("Missing Details", "Please provide a valid name and phone number.");
      return;
    }

    try {
      const updated = await sosService.saveContact({
        name: newContactName,
        phone: newContactPhone,
        relationship: newContactRel,
        isPrimary: contacts.length === 0,
        notifyOnSOS: newContactNotify,
      });
      setContacts(updated);
      setNewContactName("");
      setNewContactPhone("");
      setIsContactsModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Error", "Could not save contact.");
    }
  };

  const handleDeleteContact = (id: string, name: string) => {
    Alert.alert("Delete Contact", `Remove ${name} from emergency contacts?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = await sosService.deleteContact(id);
          setContacts(updated);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  // ── Share Current Location ───────────────────────────────────────────────
  const handleShareLocation = async () => {
    if (!coords) return;
    try {
      const mapLink = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
      await Share.share({
        message: `🚨 My Current Tourist Safety Location:\nLatitude: ${coords.latitude.toFixed(5)}, Longitude: ${coords.longitude.toFixed(5)}\nGoogle Maps: ${mapLink}`,
        title: "Emergency Location Share",
      });
    } catch (err) {
      console.warn("Share failed:", err);
    }
  };

  // ── Nearby Facilities Data Computation ───────────────────────────────────
  const currentCoords = useMemo<GeoCoordinates>(() => {
    return (
      coords || {
        latitude: 23.7925,
        longitude: 90.4078,
        accuracy: 10,
        timestamp: Date.now(),
        isEstimated: true,
      }
    );
  }, [coords]);

  const nearbyData = useMemo(() => {
    return sosService.findNearbyFacilities(currentCoords, {
      maxRadiusKm: facilityRadius,
      typeFilter: facilityTypeFilter,
      searchQuery: facilitySearch,
    });
  }, [currentCoords, facilityRadius, facilityTypeFilter, facilitySearch]);

  // ── Medical Phrases Data Computation ─────────────────────────────────────
  const phraseData = useMemo(() => {
    return sosService.searchMedicalPhrases(phraseSearch, phraseCategory);
  }, [phraseSearch, phraseCategory]);

  // ── Embassy Directory Data Computation ───────────────────────────────────
  const embassyData = useMemo(() => {
    return sosService.searchEmbassies(embassySearch, currentCoords);
  }, [embassySearch, currentCoords]);

  // ==========================================================================
  // RENDER SECTIONS
  // ==========================================================================

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* ── HIGH VISIBILITY APP HEADER ────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)");
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <View style={styles.headerBadgeRow}>
            <View style={styles.liveIndicatorDot} />
            <Text style={styles.headerBadgeText}>CRITICAL RESPONSE ACTIVE</Text>
          </View>
          <Text style={styles.headerTitle}>Emergency Safety Hub</Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Share current GPS location"
          style={styles.shareBtn}
          onPress={handleShareLocation}
        >
          <Ionicons name="share-social-outline" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* ── LIVE GPS BANNER ──────────────────────────────────────────────── */}
      <View style={styles.gpsBanner}>
        <View style={styles.gpsInfoCol}>
          <View style={styles.gpsRow}>
            <Ionicons
              name={coords?.isEstimated ? "warning-outline" : "navigate-circle"}
              size={18}
              color={coords?.isEstimated ? "#f59e0b" : "#10b981"}
            />
            <Text style={styles.gpsTitle}>
              {isLocating
                ? "Acquiring GPS lock..."
                : coords
                ? `GPS: ${coords.latitude.toFixed(4)}° N, ${coords.longitude.toFixed(4)}° E`
                : "GPS unavailable"}
            </Text>
          </View>
          <Text style={styles.gpsSub}>
            {coords?.locationName || "High accuracy coordinate tracking active"}
            {coords?.accuracy ? ` (±${Math.round(coords.accuracy)}m)` : ""}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.gpsRefreshBtn}
          onPress={loadLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#0284c7" />
          ) : (
            <Ionicons name="refresh" size={16} color="#0284c7" />
          )}
          <Text style={styles.gpsRefreshText}>Re-ping</Text>
        </TouchableOpacity>
      </View>

      {/* ── FOUR TAB SELECTOR ────────────────────────────────────────────── */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "sos" && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab("sos");
            Haptics.selectionAsync();
          }}
        >
          <Ionicons
            name="alert-circle"
            size={18}
            color={activeTab === "sos" ? "#ffffff" : "#64748b"}
          />
          <Text style={[styles.tabBtnText, activeTab === "sos" && styles.tabBtnTextActive]}>
            One-Tap SOS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "nearby" && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab("nearby");
            Haptics.selectionAsync();
          }}
        >
          <Ionicons
            name="medical"
            size={18}
            color={activeTab === "nearby" ? "#ffffff" : "#64748b"}
          />
          <Text style={[styles.tabBtnText, activeTab === "nearby" && styles.tabBtnTextActive]}>
            Nearby 15km
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "phrases" && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab("phrases");
            Haptics.selectionAsync();
          }}
        >
          <Ionicons
            name="chatbubbles"
            size={18}
            color={activeTab === "phrases" ? "#ffffff" : "#64748b"}
          />
          <Text style={[styles.tabBtnText, activeTab === "phrases" && styles.tabBtnTextActive]}>
            Phrasebook
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "embassies" && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab("embassies");
            Haptics.selectionAsync();
          }}
        >
          <Ionicons
            name="flag"
            size={18}
            color={activeTab === "embassies" ? "#ffffff" : "#64748b"}
          />
          <Text style={[styles.tabBtnText, activeTab === "embassies" && styles.tabBtnTextActive]}>
            Embassies
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── TAB CONTENT SCROLLER ─────────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================== */}
        {/* TAB 1: ONE-TAP SOS PANIC HUB */}
        {/* ================================================================== */}
        {activeTab === "sos" && (
          <View style={styles.sectionContainer}>
            {/* SOS PANIC HERO BUTTON */}
            <View style={styles.panicHeroWrap}>
              {/* Pulsing Radar Ring Behind Panic Button */}
              <Animated.View
                style={[
                  styles.radarRing,
                  {
                    transform: [{ scale: radarAnim }],
                    opacity: radarOpacity,
                  },
                ]}
              />

              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="One-Tap Tourist Emergency SOS Panic Button"
                  style={[styles.panicButton, isSOSArmed && styles.panicButtonArmed]}
                  activeOpacity={0.85}
                  onPress={isSOSArmed ? handleCancelSOS : handleStartSOS}
                  disabled={isDispatchingSOS}
                >
                  {isDispatchingSOS ? (
                    <ActivityIndicator size="large" color="#ffffff" />
                  ) : isSOSArmed ? (
                    <View style={styles.panicInnerArmed}>
                      <Text style={styles.countdownNumber}>{countdown}</Text>
                      <Text style={styles.countdownLabel}>TAP TO CANCEL</Text>
                    </View>
                  ) : (
                    <View style={styles.panicInner}>
                      <Ionicons name="warning" size={44} color="#ffffff" />
                      <Text style={styles.panicTitle}>PRESS FOR SOS</Text>
                      <Text style={styles.panicSubtitle}>One-Tap Tourist Police & 999</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>

              <Text style={styles.panicHint}>
                {isSOSArmed
                  ? "⚠️ Sending coordinates in 3 seconds! Tap button to abort."
                  : "Tap to broadcast live GPS coordinates via SMS to emergency contacts & 999"}
              </Text>

              {/* Instant Immediate Dispatch Shortcut */}
              <TouchableOpacity
                style={styles.instantDispatchBtn}
                onPress={executeSOSDispatch}
                disabled={isDispatchingSOS}
              >
                <Ionicons name="flash-outline" size={16} color="#dc2626" />
                <Text style={styles.instantDispatchText}>Instant Dispatch (No Countdown)</Text>
              </TouchableOpacity>
            </View>

            {/* OPTIONAL SITUATIONAL NOTE */}
            <View style={styles.noteInputCard}>
              <View style={styles.noteHeaderRow}>
                <Ionicons name="create-outline" size={16} color="#475569" />
                <Text style={styles.noteLabel}>Emergency Context Note (Optional):</Text>
              </View>
              <TextInput
                style={styles.noteTextInput}
                placeholder="e.g., Medical emergency / Mugged / In taxi plate #..."
                placeholderTextColor="#94a3b8"
                value={customSOSNote}
                onChangeText={setCustomSOSNote}
                maxLength={100}
              />
            </View>

            {/* QUICK EMERGENCY HOTLINES GRID */}
            <View style={styles.blockSection}>
              <View style={styles.blockTitleRow}>
                <Ionicons name="call" size={20} color="#dc2626" />
                <Text style={styles.blockTitle}>Direct Emergency Lines (Bangladesh)</Text>
              </View>
              <Text style={styles.blockSub}>Toll-free 24/7 one-touch direct dialers</Text>

              <View style={styles.hotlinesGrid}>
                {NATIONAL_HOTLINES.map((hotline) => (
                  <TouchableOpacity
                    key={hotline.id}
                    style={styles.hotlineCard}
                    activeOpacity={0.8}
                    onPress={() => sosService.triggerCall(hotline.number)}
                  >
                    <View style={[styles.hotlineIconBadge, { backgroundColor: `${hotline.color}15` }]}>
                      <Ionicons name={hotline.icon as any} size={24} color={hotline.color} />
                    </View>
                    <View style={styles.hotlineBody}>
                      <View style={styles.hotlineTopRow}>
                        <Text style={styles.hotlineName}>{hotline.name}</Text>
                        <View style={[styles.badgePill, { backgroundColor: `${hotline.color}20` }]}>
                          <Text style={[styles.badgePillText, { color: hotline.color }]}>
                            {hotline.badge}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.hotlineBn}>{hotline.nameBn}</Text>
                      <Text style={styles.hotlineDesc}>{hotline.desc}</Text>
                      <View style={styles.hotlineCallAction}>
                        <Ionicons name="call" size={14} color="#dc2626" />
                        <Text style={styles.hotlineCallNumber}>
                          {hotline.displayNumber || hotline.number}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* DESIGNATED EMERGENCY CONTACTS */}
            <View style={styles.blockSection}>
              <View style={styles.blockTitleRowBetween}>
                <View style={styles.blockTitleRow}>
                  <Ionicons name="people" size={20} color="#0284c7" />
                  <Text style={styles.blockTitle}>Designated SOS Contacts</Text>
                </View>
                <TouchableOpacity
                  style={styles.addContactBtn}
                  onPress={() => setIsContactsModalVisible(true)}
                >
                  <Ionicons name="add-circle" size={18} color="#0284c7" />
                  <Text style={styles.addContactBtnText}>Add Contact</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.blockSub}>
                These contacts receive automated SMS with your GPS coordinates during SOS.
              </Text>

              {contacts.length === 0 ? (
                <View style={styles.emptyContactsCard}>
                  <Text style={styles.emptyContactsText}>
                    No custom contacts added yet. Tap "Add Contact" to include family, hotel, or guide.
                  </Text>
                </View>
              ) : (
                contacts.map((contact) => (
                  <View key={contact.id} style={styles.contactCard}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>
                        {contact.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.contactDetails}>
                      <View style={styles.contactNameRow}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        {contact.isPrimary && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.contactPhone}>{contact.phone}</Text>
                      <Text style={styles.contactRel}>
                        {contact.relationship} • {contact.notifyOnSOS ? "Receives SOS SMS" : "Manual call only"}
                      </Text>
                    </View>
                    <View style={styles.contactActions}>
                      <TouchableOpacity
                        style={styles.contactActionBtn}
                        onPress={() => sosService.triggerCall(contact.phone)}
                      >
                        <Ionicons name="call-outline" size={18} color="#16a34a" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.contactActionBtn}
                        onPress={() => handleDeleteContact(contact.id, contact.name)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* ================================================================== */}
        {/* TAB 2: NEARBY MEDICAL & POLICE FINDER (15km) */}
        {/* ================================================================== */}
        {activeTab === "nearby" && (
          <View style={styles.sectionContainer}>
            {/* SEARCH AND RADIUS FILTER */}
            <View style={styles.searchBarWrap}>
              <Ionicons name="search" size={18} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search hospital, police, or pharmacy..."
                placeholderTextColor="#94a3b8"
                value={facilitySearch}
                onChangeText={setFacilitySearch}
              />
              {facilitySearch.length > 0 && (
                <TouchableOpacity onPress={() => setFacilitySearch("")}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* CATEGORY FILTER CHIPS */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsRow}
            >
              {[
                { key: "all", label: "All Facilities" },
                { key: "hospital", label: "🏥 Hospitals" },
                { key: "tourist_police", label: "👮 Tourist Police" },
                { key: "police", label: "🛡️ Police Stations" },
                { key: "pharmacy", label: "💊 24/7 Pharmacies" },
              ].map((chip) => (
                <TouchableOpacity
                  key={chip.key}
                  style={[
                    styles.filterChip,
                    facilityTypeFilter === chip.key && styles.filterChipActive,
                  ]}
                  onPress={() => {
                    setFacilityTypeFilter(chip.key as any);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      facilityTypeFilter === chip.key && styles.filterChipTextActive,
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* RADIUS SUMMARY BAR */}
            <View style={styles.radiusHeaderRow}>
              <View style={styles.radiusIndicator}>
                <Ionicons name="compass-outline" size={16} color="#0284c7" />
                <Text style={styles.radiusText}>
                  Radius: <Text style={styles.boldText}>{facilityRadius} km</Text> •{" "}
                  {nearbyData.withinRadius.length} found nearby
                </Text>
              </View>

              {nearbyData.withinRadius.length === 0 && (
                <TouchableOpacity
                  style={styles.expandRadiusBtn}
                  onPress={() => setFacilityRadius(100)}
                >
                  <Text style={styles.expandRadiusText}>Expand to 100km</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* FACILITIES LIST */}
            {nearbyData.withinRadius.length === 0 ? (
              <View style={styles.noFacilitiesBox}>
                <Ionicons name="location-outline" size={42} color="#94a3b8" />
                <Text style={styles.noFacilitiesTitle}>No facilities within {facilityRadius}km</Text>
                <Text style={styles.noFacilitiesSub}>
                  Showing closest verified emergency locations across Bangladesh below:
                </Text>
              </View>
            ) : null}

            {(nearbyData.withinRadius.length > 0 ? nearbyData.withinRadius : nearbyData.allSorted).map(
              (fac) => (
                <View key={fac.id} style={styles.facilityCard}>
                  <View style={styles.facCardHeader}>
                    <View style={styles.facTypeBadgeRow}>
                      <View
                        style={[
                          styles.facTypePill,
                          fac.type === "hospital" && styles.facTypeHosp,
                          fac.type === "tourist_police" && styles.facTypeTouristPol,
                          fac.type === "police" && styles.facTypePol,
                          fac.type === "pharmacy" && styles.facTypePharm,
                        ]}
                      >
                        <Text style={styles.facTypePillText}>{fac.categoryLabel}</Text>
                      </View>

                      {fac.isOpen24Hours && (
                        <View style={styles.open24Badge}>
                          <View style={styles.greenPulseDot} />
                          <Text style={styles.open24Text}>24/7 OPEN</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.distanceBadge}>
                      <Ionicons name="navigate-outline" size={14} color="#0f172a" />
                      <Text style={styles.distanceBadgeText}>{fac.distanceKm} km</Text>
                    </View>
                  </View>

                  <Text style={styles.facName}>{fac.name}</Text>
                  <Text style={styles.facNameBn}>{fac.nameBn}</Text>

                  <View style={styles.facLocationRow}>
                    <Ionicons name="location" size={14} color="#64748b" />
                    <Text style={styles.facAddress}>{fac.address}</Text>
                  </View>

                  {/* Feature tags */}
                  <View style={styles.featureTagsRow}>
                    {fac.features.map((feat, i) => (
                      <View key={i} style={styles.featureTag}>
                        <Text style={styles.featureTagText}>{feat}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Action Buttons: Direct Call & Navigate */}
                  <View style={styles.facActionRow}>
                    <TouchableOpacity
                      style={styles.facCallBtn}
                      activeOpacity={0.8}
                      onPress={() => sosService.triggerCall(fac.phone)}
                    >
                      <Ionicons name="call" size={16} color="#ffffff" />
                      <Text style={styles.facCallBtnText}>Call ({fac.phone})</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.facNavBtn}
                      activeOpacity={0.8}
                      onPress={() => sosService.triggerNavigation(fac.latitude, fac.longitude, fac.name)}
                    >
                      <Ionicons name="navigate" size={16} color="#0284c7" />
                      <Text style={styles.facNavBtnText}>Navigate</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            )}
          </View>
        )}

        {/* ================================================================== */}
        {/* TAB 3: OFFLINE MEDICAL PHRASEBOOK */}
        {/* ================================================================== */}
        {activeTab === "phrases" && (
          <View style={styles.sectionContainer}>
            {/* OFFLINE STATUS PILL */}
            <View style={styles.offlinePill}>
              <Ionicons name="cloud-offline" size={16} color="#15803d" />
              <Text style={styles.offlinePillText}>
                100% Offline Accessible • English to Bengali Medical Translations
              </Text>
            </View>

            {/* SEARCH INPUT */}
            <View style={styles.searchBarWrap}>
              <Ionicons name="search" size={18} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search symptom, allergy, heart, chest, ambulance..."
                placeholderTextColor="#94a3b8"
                value={phraseSearch}
                onChangeText={setPhraseSearch}
              />
              {phraseSearch.length > 0 && (
                <TouchableOpacity onPress={() => setPhraseSearch("")}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* CATEGORY CHIPS */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsRow}
            >
              {[
                { key: "all", label: "All Phrases" },
                { key: "critical", label: "🚨 Critical Emergency" },
                { key: "allergies", label: "⚠️ Severe Allergies" },
                { key: "symptoms", label: "🩺 Symptoms" },
                { key: "police_assistance", label: "👮 Police Assistance" },
              ].map((chip) => (
                <TouchableOpacity
                  key={chip.key}
                  style={[
                    styles.filterChip,
                    phraseCategory === chip.key && styles.filterChipActive,
                  ]}
                  onPress={() => {
                    setPhraseCategory(chip.key as any);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      phraseCategory === chip.key && styles.filterChipTextActive,
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.phraseCountText}>
              Showing {phraseData.length} phrase cards. Tap any card for full-screen "Show to Doctor" display.
            </Text>

            {/* PHRASE CARDS */}
            {phraseData.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.phraseCard,
                  item.urgency === "critical" && styles.phraseCardCritical,
                ]}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedPhrase(item);
                  setIsDoctorCardVisible(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <View style={styles.phraseHeaderRow}>
                  <View style={styles.phraseCategoryBadge}>
                    <Ionicons name={item.iconName as any} size={14} color="#0f172a" />
                    <Text style={styles.phraseCategoryText}>{item.categoryLabel}</Text>
                  </View>
                  <View
                    style={[
                      styles.urgencyBadge,
                      item.urgency === "critical"
                        ? styles.urgencyCritical
                        : item.urgency === "high"
                        ? styles.urgencyHigh
                        : styles.urgencyNormal,
                    ]}
                  >
                    <Text style={styles.urgencyText}>{item.urgency.toUpperCase()}</Text>
                  </View>
                </View>

                {/* English Text */}
                <Text style={styles.phraseEnglish}>{item.english}</Text>

                {/* Bengali Script */}
                <View style={styles.phraseBengaliBox}>
                  <Text style={styles.phraseBengali}>{item.bengali}</Text>
                </View>

                {/* Phonetics */}
                <View style={styles.phrasePhonicsRow}>
                  <Ionicons name="volume-medium-outline" size={16} color="#0284c7" />
                  <Text style={styles.phrasePhonics}>"{item.pronunciation}"</Text>
                </View>

                <View style={styles.showDoctorRow}>
                  <Text style={styles.showDoctorPrompt}>Tap to open full-screen Doctor Card</Text>
                  <Ionicons name="expand-outline" size={16} color="#0284c7" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ================================================================== */}
        {/* TAB 4: FOREIGN EMBASSY DIRECTORY */}
        {/* ================================================================== */}
        {activeTab === "embassies" && (
          <View style={styles.sectionContainer}>
            {/* EMBASSY SEARCH */}
            <View style={styles.searchBarWrap}>
              <Ionicons name="search" size={18} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country or embassy (e.g. USA, UK, India)..."
                placeholderTextColor="#94a3b8"
                value={embassySearch}
                onChangeText={setEmbassySearch}
              />
              {embassySearch.length > 0 && (
                <TouchableOpacity onPress={() => setEmbassySearch("")}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.embassyNoticeBox}>
              <Ionicons name="information-circle" size={18} color="#0369a1" />
              <Text style={styles.embassyNoticeText}>
                All embassies listed maintain 24/7 emergency consular protection for foreign citizens,
                stolen passports, and detention assistance.
              </Text>
            </View>

            {embassyData.map((emb) => (
              <View key={emb.id} style={styles.embassyCard}>
                <View style={styles.embassyTopRow}>
                  <Text style={styles.embassyFlag}>{emb.flag}</Text>
                  <View style={styles.embassyNameCol}>
                    <Text style={styles.embassyCountry}>{emb.country}</Text>
                    <Text style={styles.embassyTitle}>{emb.embassyName}</Text>
                  </View>
                  {emb.passportAssistance && (
                    <View style={styles.passportBadge}>
                      <Text style={styles.passportBadgeText}>PASSPORT HELP</Text>
                    </View>
                  )}
                </View>

                <View style={styles.embassyDetailRow}>
                  <Ionicons name="location-outline" size={15} color="#475569" />
                  <Text style={styles.embassyDetailText}>{emb.address}</Text>
                </View>

                <View style={styles.embassyDetailRow}>
                  <Ionicons name="time-outline" size={15} color="#475569" />
                  <Text style={styles.embassyDetailText}>{emb.workingHours}</Text>
                </View>

                {/* Embassy Action Triggers */}
                <View style={styles.embassyActionsGrid}>
                  <TouchableOpacity
                    style={styles.embassyEmergencyBtn}
                    onPress={() => sosService.triggerCall(emb.consularHotline24h)}
                  >
                    <Ionicons name="call" size={15} color="#ffffff" />
                    <Text style={styles.embassyEmergencyBtnText}>24/7 Hotline</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.embassyNavBtn}
                    onPress={() =>
                      sosService.triggerNavigation(emb.latitude, emb.longitude, emb.embassyName)
                    }
                  >
                    <Ionicons name="navigate-outline" size={15} color="#0284c7" />
                    <Text style={styles.embassyNavBtnText}>Map</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.embassyEmailBtn}
                    onPress={() =>
                      sosService.triggerEmail(
                        emb.emergencyEmail,
                        `URGENT: Citizen Emergency Assistance (${emb.country})`,
                        `Dear Consular Team,\n\nI am currently in Bangladesh and require urgent consular support.\n\nMy location: ${
                          coords
                            ? `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`
                            : "Dhaka"
                        }`
                      )
                    }
                  >
                    <Ionicons name="mail-outline" size={15} color="#0369a1" />
                    <Text style={styles.embassyEmailBtnText}>Email</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ==================================================================== */}
      {/* FULL SCREEN FLASHCARD: "SHOW TO DOCTOR" MODAL */}
      {/* ==================================================================== */}
      <Modal
        visible={isDoctorCardVisible && selectedPhrase !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsDoctorCardVisible(false)}
      >
        <SafeAreaView style={styles.doctorModalSafe}>
          <View style={styles.doctorModalHeader}>
            <View style={styles.doctorHeaderLeft}>
              <Ionicons name="medkit" size={24} color="#dc2626" />
              <Text style={styles.doctorModalTitle}>SHOW TO DOCTOR / RESPONDER</Text>
            </View>
            <TouchableOpacity
              style={styles.doctorCloseBtn}
              onPress={() => setIsDoctorCardVisible(false)}
            >
              <Ionicons name="close" size={26} color="#0f172a" />
            </TouchableOpacity>
          </View>

          {selectedPhrase && (
            <ScrollView contentContainerStyle={styles.doctorContentContainer}>
              <View style={styles.urgentBanner}>
                <Ionicons name="warning" size={20} color="#dc2626" />
                <Text style={styles.urgentBannerText}>
                  {selectedPhrase.urgency.toUpperCase()} MEDICAL ATTENTION REQUIRED
                </Text>
              </View>

              {/* HUGE BENGALI TEXT FOR LOCAL RESPONDERS */}
              <View style={styles.hugeBengaliCard}>
                <Text style={styles.doctorLangTag}>বাংলা (BENGALI):</Text>
                <Text style={styles.hugeBengaliText}>{selectedPhrase.bengali}</Text>
              </View>

              {/* PHONETIC PRONUNCIATION */}
              <View style={styles.doctorPhonicsCard}>
                <Text style={styles.doctorLangTag}>HOW TO SAY (PHONETIC PRONUNCIATION):</Text>
                <Text style={styles.doctorPhonicsText}>"{selectedPhrase.pronunciation}"</Text>
              </View>

              {/* ENGLISH MEANING */}
              <View style={styles.doctorEnglishCard}>
                <Text style={styles.doctorLangTag}>ENGLISH MEANING:</Text>
                <Text style={styles.doctorEnglishText}>{selectedPhrase.english}</Text>
              </View>

              <View style={styles.doctorActionFooter}>
                <TouchableOpacity
                  style={styles.doctorCallAmbulanceBtn}
                  onPress={() => sosService.triggerCall("999")}
                >
                  <Ionicons name="call" size={20} color="#ffffff" />
                  <Text style={styles.doctorCallAmbulanceText}>Call 999 Ambulance</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.doctorDoneBtn}
                  onPress={() => setIsDoctorCardVisible(false)}
                >
                  <Text style={styles.doctorDoneBtnText}>Dismiss Flashcard</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ==================================================================== */}
      {/* SOS DISPATCH CONFIRMATION MODAL */}
      {/* ==================================================================== */}
      <Modal
        visible={isResultModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsResultModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.resultModalCard}>
            <View style={styles.resultModalIconWrap}>
              <Ionicons name="shield-checkmark" size={48} color="#16a34a" />
            </View>

            <Text style={styles.resultModalTitle}>Emergency SOS Dispatched!</Text>
            <Text style={styles.resultModalSub}>
              Your live GPS coordinates have been prepared and queued via SMS for designated
              contacts and emergency responders.
            </Text>

            {sosResult && (
              <View style={styles.resultDetailsBox}>
                <Text style={styles.resultDetailRow}>
                  📍 <Text style={styles.boldText}>Coordinates:</Text>{" "}
                  {sosResult.coordinates.latitude.toFixed(5)},{" "}
                  {sosResult.coordinates.longitude.toFixed(5)}
                </Text>
                <Text style={styles.resultDetailRow}>
                  👥 <Text style={styles.boldText}>Contacts Targeted:</Text>{" "}
                  {sosResult.contactsNotifiedCount} recipients (including 999)
                </Text>
                <Text style={styles.resultDetailRow}>
                  ⏰ <Text style={styles.boldText}>Timestamp:</Text>{" "}
                  {new Date(sosResult.dispatchTimestamp).toLocaleTimeString()}
                </Text>
              </View>
            )}

            <View style={styles.resultActionsCol}>
              <TouchableOpacity
                style={styles.callNowModalBtn}
                onPress={() => {
                  setIsResultModalVisible(false);
                  sosService.triggerCall("999");
                }}
              >
                <Ionicons name="call" size={18} color="#ffffff" />
                <Text style={styles.callNowModalBtnText}>Call 999 Immediately</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.callTouristPolModalBtn}
                onPress={() => {
                  setIsResultModalVisible(false);
                  sosService.triggerCall("+8801320222222");
                }}
              >
                <Ionicons name="shield" size={18} color="#0284c7" />
                <Text style={styles.callTouristPolModalBtnText}>Call Tourist Police</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dismissModalBtn}
                onPress={() => setIsResultModalVisible(false)}
              >
                <Text style={styles.dismissModalBtnText}>Close Window</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================================== */}
      {/* MANAGE CONTACTS MODAL */}
      {/* ==================================================================== */}
      <Modal
        visible={isContactsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsContactsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.contactsModalContent}>
            <View style={styles.contactsModalHeader}>
              <Text style={styles.contactsModalTitle}>Add Emergency Contact</Text>
              <TouchableOpacity onPress={() => setIsContactsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. John Doe / Hotel Front Desk"
              placeholderTextColor="#94a3b8"
              value={newContactName}
              onChangeText={setNewContactName}
            />

            <Text style={styles.inputLabel}>Phone Number (with country code)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. +8801700000000 or +12025550199"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={newContactPhone}
              onChangeText={setNewContactPhone}
            />

            <Text style={styles.inputLabel}>Relationship</Text>
            <View style={styles.relChipsRow}>
              {(["Family", "Friend", "Tour Guide", "Hotel", "Colleague", "Other"] as const).map(
                (rel) => (
                  <TouchableOpacity
                    key={rel}
                    style={[styles.relChip, newContactRel === rel && styles.relChipActive]}
                    onPress={() => setNewContactRel(rel)}
                  >
                    <Text
                      style={[styles.relChipText, newContactRel === rel && styles.relChipTextActive]}
                    >
                      {rel}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setNewContactNotify(!newContactNotify)}
            >
              <Ionicons
                name={newContactNotify ? "checkbox" : "square-outline"}
                size={22}
                color={newContactNotify ? "#0284c7" : "#94a3b8"}
              />
              <Text style={styles.toggleLabel}>Auto-send SMS with GPS during One-Tap SOS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveContactBtn} onPress={handleAddContact}>
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.saveContactBtnText}>Save Emergency Contact</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ============================================================================
// STYLESHEET (High-Contrast Safety Standards)
// ============================================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#dc2626",
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#dc2626",
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  gpsBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
  },
  gpsInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  gpsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  gpsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e3a8a",
  },
  gpsSub: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
  },
  gpsRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  gpsRefreshText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0284c7",
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: "#0f172a",
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  tabBtnTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionContainer: {
    gap: 20,
  },

  // ── SOS PANIC HERO BUTTON ────────────────────────────────────────────────
  panicHeroWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#fee2e2",
    position: "relative",
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  radarRing: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 3,
    borderColor: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  panicButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 4,
    borderColor: "#ffffff",
  },
  panicButtonArmed: {
    backgroundColor: "#b91c1c",
    borderColor: "#fef08a",
  },
  panicInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  panicTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 4,
  },
  panicSubtitle: {
    color: "#fecaca",
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 2,
  },
  panicInnerArmed: {
    alignItems: "center",
    justifyContent: "center",
  },
  countdownNumber: {
    color: "#ffffff",
    fontSize: 48,
    fontWeight: "900",
  },
  countdownLabel: {
    color: "#fef08a",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  panicHint: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    paddingHorizontal: 24,
    marginTop: 16,
    lineHeight: 18,
  },
  instantDispatchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  instantDispatchText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#dc2626",
  },

  // ── NOTE INPUT ────────────────────────────────────────────────────────────
  noteInputCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  noteHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  noteTextInput: {
    fontSize: 13,
    color: "#0f172a",
    paddingVertical: 4,
  },

  // ── BLOCK SECTIONS ────────────────────────────────────────────────────────
  blockSection: {
    gap: 12,
  },
  blockTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  blockTitleRowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  blockSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: -6,
  },
  hotlinesGrid: {
    gap: 10,
  },
  hotlineCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  hotlineIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  hotlineBody: {
    flex: 1,
  },
  hotlineTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hotlineName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  hotlineBn: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 1,
  },
  hotlineDesc: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  hotlineCallAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  hotlineCallNumber: {
    fontSize: 13,
    fontWeight: "800",
    color: "#dc2626",
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: "700",
  },

  // ── EMERGENCY CONTACTS ────────────────────────────────────────────────────
  addContactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  addContactBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
  },
  emptyContactsCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    alignItems: "center",
  },
  emptyContactsText: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  contactAvatarText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  contactDetails: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contactName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  primaryBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  primaryBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#b45309",
  },
  contactPhone: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginTop: 2,
  },
  contactRel: {
    fontSize: 10,
    color: "#94a3b8",
  },
  contactActions: {
    flexDirection: "row",
    gap: 6,
  },
  contactActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── NEARBY FACILITIES TAB ────────────────────────────────────────────────
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
    padding: 0,
  },
  filterChipsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  filterChipActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  radiusHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  radiusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  radiusText: {
    fontSize: 12,
    color: "#475569",
  },
  boldText: {
    fontWeight: "700",
    color: "#0f172a",
  },
  expandRadiusBtn: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expandRadiusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
  },
  noFacilitiesBox: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  noFacilitiesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 8,
  },
  noFacilitiesSub: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
  },
  facilityCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  facCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  facTypeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  facTypePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  facTypeHosp: { backgroundColor: "#fee2e2" },
  facTypeTouristPol: { backgroundColor: "#e0f2fe" },
  facTypePol: { backgroundColor: "#f1f5f9" },
  facTypePharm: { backgroundColor: "#dcfce7" },
  facTypePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0f172a",
  },
  open24Badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16a34a",
  },
  open24Text: {
    fontSize: 9,
    fontWeight: "800",
    color: "#16a34a",
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },
  facName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  facNameBn: {
    fontSize: 12,
    color: "#64748b",
    marginTop: -4,
  },
  facLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  facAddress: {
    fontSize: 11,
    color: "#475569",
    flex: 1,
  },
  featureTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  featureTag: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  featureTagText: {
    fontSize: 10,
    color: "#64748b",
  },
  facActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  facCallBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#dc2626",
    paddingVertical: 8,
    borderRadius: 10,
  },
  facCallBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  facNavBtn: {
    flex: 0.8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingVertical: 8,
    borderRadius: 10,
  },
  facNavBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284c7",
  },

  // ── PHRASEBOOK TAB ────────────────────────────────────────────────────────
  offlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  offlinePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  phraseCountText: {
    fontSize: 11,
    color: "#64748b",
    marginVertical: -2,
  },
  phraseCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  phraseCardCritical: {
    borderColor: "#fecaca",
    backgroundColor: "#fffafa",
  },
  phraseHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  phraseCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  phraseCategoryText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  urgencyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  urgencyCritical: { backgroundColor: "#fee2e2" },
  urgencyHigh: { backgroundColor: "#ffedd5" },
  urgencyNormal: { backgroundColor: "#f1f5f9" },
  urgencyText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0f172a",
  },
  phraseEnglish: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 20,
  },
  phraseBengaliBox: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#0284c7",
  },
  phraseBengali: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 24,
  },
  phrasePhonicsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  phrasePhonics: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#0284c7",
    fontWeight: "600",
  },
  showDoctorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
    marginTop: 2,
  },
  showDoctorPrompt: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
  },

  // ── EMBASSIES TAB ─────────────────────────────────────────────────────────
  embassyNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  embassyNoticeText: {
    fontSize: 11,
    color: "#0369a1",
    flex: 1,
    lineHeight: 16,
  },
  embassyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  embassyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  embassyFlag: {
    fontSize: 28,
  },
  embassyNameCol: {
    flex: 1,
  },
  embassyCountry: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  embassyTitle: {
    fontSize: 11,
    color: "#64748b",
  },
  passportBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  passportBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#b45309",
  },
  embassyDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  embassyDetailText: {
    fontSize: 11,
    color: "#475569",
    flex: 1,
  },
  embassyActionsGrid: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  embassyEmergencyBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#dc2626",
    paddingVertical: 8,
    borderRadius: 10,
  },
  embassyEmergencyBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  embassyNavBtn: {
    flex: 0.8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingVertical: 8,
    borderRadius: 10,
  },
  embassyNavBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
  },
  embassyEmailBtn: {
    flex: 0.8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 8,
    borderRadius: 10,
  },
  embassyEmailBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },

  // ── DOCTOR FLASHCARD FULLSCREEN MODAL ─────────────────────────────────────
  doctorModalSafe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  doctorModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  doctorHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  doctorModalTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#dc2626",
    letterSpacing: 0.5,
  },
  doctorCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  doctorContentContainer: {
    padding: 20,
    gap: 16,
  },
  urgentBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fee2e2",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  urgentBannerText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#dc2626",
    letterSpacing: 0.5,
  },
  hugeBengaliCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#dc2626",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  doctorLangTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  hugeBengaliText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0f172a",
    lineHeight: 38,
  },
  doctorPhonicsCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  doctorPhonicsText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0369a1",
    lineHeight: 26,
  },
  doctorEnglishCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  doctorEnglishText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    lineHeight: 24,
  },
  doctorActionFooter: {
    gap: 10,
    marginTop: 10,
  },
  doctorCallAmbulanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#dc2626",
    paddingVertical: 14,
    borderRadius: 14,
  },
  doctorCallAmbulanceText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  doctorDoneBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  doctorDoneBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },

  // ── MODAL BACKDROPS & COMMON POPUPS ──────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  resultModalCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  resultModalIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  resultModalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
  },
  resultModalSub: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
  },
  resultDetailsBox: {
    width: "100%",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
  },
  resultDetailRow: {
    fontSize: 12,
    color: "#334155",
  },
  resultActionsCol: {
    width: "100%",
    gap: 8,
    marginTop: 6,
  },
  callNowModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#dc2626",
    paddingVertical: 12,
    borderRadius: 12,
  },
  callNowModalBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  callTouristPolModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingVertical: 12,
    borderRadius: 12,
  },
  callTouristPolModalBtnText: {
    color: "#0284c7",
    fontSize: 14,
    fontWeight: "800",
  },
  dismissModalBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  dismissModalBtnText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },

  // ── ADD CONTACT MODAL ────────────────────────────────────────────────────
  contactsModalContent: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  contactsModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contactsModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 2,
  },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#0f172a",
  },
  relChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  relChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  relChipActive: {
    backgroundColor: "#0284c7",
  },
  relChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  relChipTextActive: {
    color: "#ffffff",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  toggleLabel: {
    fontSize: 12,
    color: "#475569",
    flex: 1,
  },
  saveContactBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  saveContactBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});

export default EmergencyScreen;
