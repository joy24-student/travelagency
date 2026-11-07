import React from "react";
import { Platform,
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CurrencyDisplay from "../CurrencyDisplay";
import { useLanguage } from "../../context/LanguageContext";

export interface CompareItem {
  id: string;
  title: string;
  subtitle?: string;
  type: "flight" | "hotel" | "package" | "train" | "general";
  price: number;
  rating?: number;
  reviewsCount?: number;
  imageUrl?: string;
  specs: {
    label: string;
    value: string;
  }[];
  cancellationPolicy?: string;
  onSelect?: () => void;
}

export type ComparisonItem = CompareItem;

export interface ComparisonModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  items: CompareItem[];
  onRemoveItem?: (id: string) => void;
  onClearAll?: () => void;
  onBookItem?: (item: CompareItem) => void;
  onSelect?: (item: CompareItem) => void;
  selectButtonLabel?: string;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  visible,
  onClose,
  title,
  items,
  onRemoveItem = () => {},
  onClearAll = () => {},
  onBookItem,
  onSelect,
  selectButtonLabel,
}) => {
  const { language } = useLanguage();
  const isBn = language === "bn";

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.shell}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close comparison"
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color="#0f172a" />
            </Pressable>
            <View>
              <Text style={styles.headerTitle}>
                {title || (isBn ? "পাশাপাশি তুলনা" : "Side-by-Side Comparison")}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isBn
                  ? `${items.length}টি আইটেমের তুলনা চলছে`
                  : `Comparing ${items.length} options`}
              </Text>
            </View>
          </View>

          {items.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear all items"
              onPress={onClearAll}
              style={styles.clearBtn}
            >
              <Text style={styles.clearBtnText}>{isBn ? "সব মুছুন" : "Clear All"}</Text>
            </Pressable>
          )}
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="git-compare-outline" size={56} color="#94a3b8" />
            <Text style={styles.emptyTitle}>
              {isBn ? "কোনো আইটেম নির্বাচিত নেই" : "No Items Selected for Comparison"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isBn
                ? "তালিকা থেকে ২ বা ৩টি ফ্লাইট, হোটেল বা প্যাকেজের 'তুলনা' বাটনে ট্যাপ করুন।"
                : "Select 2 or 3 items from search results to see a side-by-side breakdown."}
            </Text>
            <Pressable style={styles.backSearchBtn} onPress={onClose}>
              <Text style={styles.backSearchBtnText}>
                {isBn ? "ফলাফলে ফিরে যান" : "Back to Results"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
            <View style={styles.table}>
              {/* Columns for each item */}
              {items.map((item, idx) => (
                <View key={`comp-${item.id || idx}`} style={styles.column}>
                  {/* Remove Button */}
                  <Pressable
                    style={styles.removeChip}
                    onPress={() => onRemoveItem(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.title}`}
                  >
                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                    <Text style={styles.removeChipText}>{isBn ? "সরান" : "Remove"}</Text>
                  </Pressable>

                  {/* Thumbnail */}
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} />
                  ) : (
                    <View style={styles.placeholderThumbnail}>
                      <Ionicons
                        name={
                          item.type === "flight"
                            ? "airplane"
                            : item.type === "hotel"
                            ? "bed"
                            : item.type === "train"
                            ? "train"
                            : "briefcase"
                        }
                        size={28}
                        color="#2563eb"
                      />
                    </View>
                  )}

                  {/* Title & Subtitle */}
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text style={styles.itemSubtitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}

                  {/* Price Row */}
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>{isBn ? "মূল্য:" : "Price:"}</Text>
                    <CurrencyDisplay
                      amount={item.price}
                      style={styles.priceValue}
                    />
                  </View>

                  {/* Rating Row */}
                  {item.rating !== undefined && (
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color="#f59e0b" />
                      <Text style={styles.ratingText}>
                        {item.rating.toFixed(1)}{" "}
                        {item.reviewsCount ? `(${item.reviewsCount})` : ""}
                      </Text>
                    </View>
                  )}

                  {/* Divider */}
                  <View style={styles.divider} />

                  {/* Feature Specs */}
                  <View style={styles.specsList}>
                    {item.specs.map((spec, sIdx) => (
                      <View key={`spec-${sIdx}`} style={styles.specBox}>
                        <Text style={styles.specLabel}>{spec.label}</Text>
                        <Text style={styles.specValue}>{spec.value}</Text>
                      </View>
                    ))}

                    {/* Cancellation Policy */}
                    {item.cancellationPolicy ? (
                      <View style={styles.specBox}>
                        <Text style={styles.specLabel}>
                          {isBn ? "বাতিল নীতি" : "Cancellation"}
                        </Text>
                        <Text style={styles.specPolicyText}>
                          {item.cancellationPolicy}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Booking Action */}
                  <Pressable
                    style={styles.bookBtn}
                    onPress={() => {
                      if (onBookItem) {
                        onBookItem(item);
                      } else if (item.onSelect) {
                        item.onSelect();
                      }
                      onClose();
                    }}
                  >
                    <Text style={styles.bookBtnText}>
                      {isBn ? "বুক করুন" : "Book Now"}
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color="#ffffff" />
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#fee2e2",
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ef4444",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },
  backSearchBtn: {
    marginTop: 20,
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backSearchBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  tableScroll: {
    flex: 1,
  },
  table: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  column: {
    width: 260,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 8px rgba(15, 23, 42, 0.05)" } : {}),
  },
  removeChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  removeChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ef4444",
  },
  thumbnail: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    marginBottom: 10,
  },
  placeholderThumbnail: {
    width: "100%",
    height: 100,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 20,
  },
  itemSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1d4ed8",
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1d4ed8",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 10,
  },
  specsList: {
    gap: 8,
    marginBottom: 14,
  },
  specBox: {
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  specLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  specValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginTop: 2,
  },
  specPolicyText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
    marginTop: 2,
  },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: "auto",
  },
  bookBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
});

export default ComparisonModal;
