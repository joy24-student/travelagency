/**
 * AgencyListScreen
 * Browse all agencies with search, specialty filters, rating filter,
 * follow toggle, save toggle, and navigation to AgencyDetailScreen.
 */

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../hooks/useAuth";
import {
  agencyService,
  type Agency,
  type AgencyFilters,
} from "../services/agencyService";

const PRIMARY = "#287dfa";
const SPECIALTIES = [
  "All",
  "Beach",
  "Adventure",
  "Honeymoon",
  "Cultural",
  "Family",
  "Mountain",
];
const RATINGS = ["Any", "4.5+", "4.0+", "3.5+"];

export function AgencyListScreen() {
  const { user } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [minRating, setMinRating] = useState("Any");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  const PAGE = 10;

  // ── Build filters ──────────────────────────────────────────────────────────
  const buildFilters = useCallback(
    (off: number): AgencyFilters => ({
      search: search.trim() || undefined,
      specialty: specialty !== "All" ? specialty.toLowerCase() : undefined,
      minRating: minRating !== "Any" ? parseFloat(minRating) : undefined,
      verified: verifiedOnly || undefined,
      limit: PAGE,
      offset: off,
    }),
    [search, specialty, minRating, verifiedOnly],
  );

  // ── Initial load ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setOffset(0);
    try {
      const data = await agencyService.getAgencies(buildFilters(0));
      setAgencies(data);
      setHasMore(data.length === PAGE);
    } catch (e) {
      console.error("AgencyListScreen load:", e);
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  // Load saved / followed states for current user
  const loadUserStates = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [saved, followed] = await Promise.all([
        agencyService.getSavedAgencies(user.id),
        agencyService.getFollowedAgencies(user.id),
      ]);
      setSavedIds(new Set(saved.map((a) => a.id)));
      setFollowedIds(new Set(followed.map((a) => a.id)));
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  useEffect(() => {
    load();
    loadUserStates();
  }, [load, loadUserStates]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const newOffset = offset + PAGE;
    try {
      const data = await agencyService.getAgencies(buildFilters(newOffset));
      setAgencies((prev) => [...prev, ...data]);
      setOffset(newOffset);
      setHasMore(data.length === PAGE);
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Toggle follow ──────────────────────────────────────────────────────────
  const toggleFollow = async (agencyId: string) => {
    if (!user?.id) {
      router.push("/(auth)/login" as any);
      return;
    }
    const following = followedIds.has(agencyId);
    setFollowedIds((prev) => {
      const next = new Set(prev);
      following ? next.delete(agencyId) : next.add(agencyId);
      return next;
    });
    try {
      following
        ? await agencyService.unfollowAgency(agencyId, user.id)
        : await agencyService.followAgency(agencyId, user.id);
    } catch {
      // rollback
      setFollowedIds((prev) => {
        const next = new Set(prev);
        following ? next.add(agencyId) : next.delete(agencyId);
        return next;
      });
    }
  };

  // ── Toggle save ────────────────────────────────────────────────────────────
  const toggleSave = async (agencyId: string) => {
    if (!user?.id) {
      router.push("/(auth)/login" as any);
      return;
    }
    const saved = savedIds.has(agencyId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      saved ? next.delete(agencyId) : next.add(agencyId);
      return next;
    });
    try {
      saved
        ? await agencyService.unsaveAgency(agencyId, user.id)
        : await agencyService.saveAgency(agencyId, user.id);
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        saved ? next.add(agencyId) : next.delete(agencyId);
        return next;
      });
    }
  };

  // ── Navigate to detail ─────────────────────────────────────────────────────
  const openDetail = (agency: Agency) => {
    router.push({
      pathname: "/(tabs)/agency/[id]",
      params: { id: agency.id, name: agency.name },
    } as any);
  };

  // ── Render card ────────────────────────────────────────────────────────────
  const renderCard = ({ item }: { item: Agency }) => {
    const followed = followedIds.has(item.id);
    const saved = savedIds.has(item.id);

    return (
      <Pressable style={s.card} onPress={() => openDetail(item)}>
        {/* Cover / logo */}
        <View style={s.cardTop}>
          {item.cover_url ? (
            <Image source={{ uri: item.cover_url }} style={s.cover} />
          ) : (
            <View style={[s.cover, s.coverFallback]}>
              <Ionicons name="business" size={28} color="#9ca3af" />
            </View>
          )}
          <View style={s.logoWrap}>
            {item.logo_url ? (
              <Image source={{ uri: item.logo_url }} style={s.logo} />
            ) : (
              <View style={s.logoFallback}>
                <Text style={s.logoInitial}>{item.name[0]}</Text>
              </View>
            )}
          </View>
          {/* Actions top-right */}
          <View style={s.topActions}>
            <Pressable
              onPress={() => toggleSave(item.id)}
              hitSlop={8}
              style={s.iconBtn}
            >
              <Ionicons
                name={saved ? "bookmark" : "bookmark-outline"}
                size={18}
                color={saved ? PRIMARY : "#fff"}
              />
            </Pressable>
          </View>
          {item.verified && (
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#fff" />
              <Text style={s.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        {/* Body */}
        <View style={s.cardBody}>
          <View style={s.nameRow}>
            <Text style={s.agencyName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.is_certified && (
              <Ionicons name="ribbon" size={14} color="#f59e0b" />
            )}
          </View>

          <Text style={s.agencyCity} numberOfLines={1}>
            {[item.city, item.country].filter(Boolean).join(", ")}
          </Text>

          {/* Specialties */}
          <View style={s.chipRow}>
            {item.specialties.slice(0, 3).map((sp) => (
              <View key={sp} style={s.chip}>
                <Text style={s.chipText}>{sp}</Text>
              </View>
            ))}
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <Stat
              icon="star"
              value={item.avg_rating.toFixed(1)}
              label="Rating"
            />
            <Stat
              icon="gift-outline"
              value={String(item.total_packages)}
              label="Packages"
            />
            <Stat
              icon="people"
              value={String(item.followers_count)}
              label="Followers"
            />
          </View>

          {/* Action row */}
          <View style={s.actionRow}>
            <Pressable
              style={[s.followBtn, followed && s.followBtnActive]}
              onPress={() => toggleFollow(item.id)}
            >
              <Ionicons
                name={followed ? "heart" : "heart-outline"}
                size={14}
                color={followed ? "#fff" : PRIMARY}
              />
              <Text
                style={[s.followBtnText, followed && s.followBtnTextActive]}
              >
                {followed ? "Following" : "Follow"}
              </Text>
            </Pressable>

            <Pressable style={s.viewBtn} onPress={() => openDetail(item)}>
              <Text style={s.viewBtnText}>View Agency</Text>
              <Ionicons name="chevron-forward" size={14} color={PRIMARY} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.shell}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Travel Agencies</Text>
        <Text style={s.subtitle}>
          {loading ? "…" : `${agencies.length}+ agencies`}
        </Text>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={17} color="#9ca3af" />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search agencies or cities..."
          placeholderTextColor="#aaa"
          returnKeyType="search"
          onSubmitEditing={load}
        />
        {search.length > 0 && (
          <Pressable
            onPress={() => {
              setSearch("");
              load();
            }}
          >
            <Ionicons name="close-circle" size={17} color="#aaa" />
          </Pressable>
        )}
      </View>

      {/* Specialty chips */}
      <FlatList
        data={SPECIALTIES}
        keyExtractor={(item) => item}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterChips}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setSpecialty(item);
              load();
            }}
            style={[s.filterChip, specialty === item && s.filterChipActive]}
          >
            <Text
              style={[
                s.filterChipText,
                specialty === item && s.filterChipTextActive,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        )}
      />

      {/* Secondary filters row */}
      <View style={s.secondaryFilters}>
        {/* Rating filter */}
        <View style={s.ratingRow}>
          {RATINGS.map((r) => (
            <Pressable
              key={r}
              onPress={() => {
                setMinRating(r);
                load();
              }}
              style={[s.ratingChip, minRating === r && s.ratingChipActive]}
            >
              <Text
                style={[
                  s.ratingChipText,
                  minRating === r && s.ratingChipTextActive,
                ]}
              >
                {r}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Verified toggle */}
        <Pressable
          onPress={() => {
            setVerifiedOnly((v) => !v);
            load();
          }}
          style={[s.verifiedToggle, verifiedOnly && s.verifiedToggleActive]}
        >
          <Ionicons
            name="checkmark-circle"
            size={14}
            color={verifiedOnly ? "#fff" : "#10b981"}
          />
          <Text
            style={[s.verifiedToggleText, verifiedOnly && { color: "#fff" }]}
          >
            Verified
          </Text>
        </Pressable>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={agencies}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={PRIMARY}
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="business-outline" size={52} color="#d1d5db" />
              <Text style={s.emptyText}>No agencies found</Text>
              <Text style={s.emptySubText}>Try adjusting your filters</Text>
            </View>
          }
        />
      )}

    </SafeAreaView>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Stat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <View style={s.stat}>
      <Ionicons name={icon as any} size={13} color="#9ca3af" />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#f5f7fa" },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#333" },
  filterChips: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },
  filterChipActive: { backgroundColor: PRIMARY },
  filterChipText: { fontSize: 12, fontWeight: "700", color: "#667085" },
  filterChipTextActive: { color: "#fff" },
  secondaryFilters: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  ratingRow: { flexDirection: "row", gap: 6, flex: 1 },
  ratingChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  ratingChipActive: { backgroundColor: "#fef3c7", borderColor: "#f59e0b" },
  ratingChipText: { fontSize: 12, fontWeight: "700", color: "#9ca3af" },
  ratingChipTextActive: { color: "#92400e" },
  verifiedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#10b981",
    backgroundColor: "#f0fdf4",
  },
  verifiedToggleActive: { backgroundColor: "#10b981", borderColor: "#10b981" },
  verifiedToggleText: { fontSize: 12, fontWeight: "700", color: "#10b981" },
  list: { padding: 16, paddingBottom: 140 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  cardTop: { minHeight: 130, position: "relative" },
  cover: { width: "100%", height: "100%" },
  coverFallback: {
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: { position: "absolute", bottom: -20, left: 14 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#fff",
  },
  logoFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  logoInitial: { color: "#fff", fontSize: 18, fontWeight: "900" },
  topActions: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    gap: 6,
  },
  iconBtn: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 999,
    padding: 6,
  },
  verifiedBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#10b981",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  verifiedText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  cardBody: { padding: 14, paddingTop: 26 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  agencyName: { fontSize: 16, fontWeight: "900", color: "#111827", flex: 1 },
  agencyCity: { fontSize: 12, color: "#9ca3af", marginBottom: 8 },
  chipRow: { flexDirection: "row", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  chip: {
    backgroundColor: `${PRIMARY}12`,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 12, color: PRIMARY, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 16, marginBottom: 12 },
  stat: { flexDirection: "row", alignItems: "center", gap: 3 },
  statValue: { fontSize: 12, fontWeight: "900", color: "#374151" },
  statLabel: { fontSize: 12, color: "#9ca3af" },
  actionRow: { flexDirection: "row", gap: 8 },
  followBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 9,
  },
  followBtnActive: { backgroundColor: "#ef4444", borderColor: "#ef4444" },
  followBtnText: { fontSize: 13, fontWeight: "800", color: PRIMARY },
  followBtnTextActive: { color: "#fff" },
  viewBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: `${PRIMARY}12`,
    borderRadius: 10,
    paddingVertical: 9,
  },
  viewBtnText: { fontSize: 13, fontWeight: "800", color: PRIMARY },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: "900", color: "#374151" },
  emptySubText: { fontSize: 13, color: "#9ca3af" },
});
