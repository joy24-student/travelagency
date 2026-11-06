import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 20,
  onPageChange,
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <View style={styles.container}>
      <Text style={styles.infoText}>
        Showing <Text style={styles.boldText}>{startItem}-{endItem}</Text> of{" "}
        <Text style={styles.boldText}>{totalItems}</Text> entries
      </Text>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.pageButton, currentPage <= 1 && styles.disabledButton]}
          disabled={currentPage <= 1}
          onPress={() => onPageChange(currentPage - 1)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back"
            size={16}
            color={currentPage <= 1 ? "#94A3B8" : "#1E293B"}
          />
          <Text
            style={[
              styles.buttonText,
              currentPage <= 1 && styles.disabledButtonText,
            ]}
          >
            Prev
          </Text>
        </TouchableOpacity>

        <View style={styles.pageBadge}>
          <Text style={styles.pageBadgeText}>
            Page {currentPage} of {safeTotalPages}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.pageButton,
            currentPage >= safeTotalPages && styles.disabledButton,
          ]}
          disabled={currentPage >= safeTotalPages}
          onPress={() => onPageChange(currentPage + 1)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.buttonText,
              currentPage >= safeTotalPages && styles.disabledButtonText,
            ]}
          >
            Next
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={currentPage >= safeTotalPages ? "#94A3B8" : "#1E293B"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginVertical: 12,
    flexWrap: "wrap",
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    color: "#64748B",
  },
  boldText: {
    fontWeight: "700",
    color: "#0F172A",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    gap: 4,
  },
  disabledButton: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  disabledButtonText: {
    color: "#94A3B8",
  },
  pageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EEF2F6",
  },
  pageBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
});
