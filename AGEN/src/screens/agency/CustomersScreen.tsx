/**
 * Customers Screen
 * Customer CRM with segmentation and analytics
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../App";
import { CustomersStackParamList } from "../../App";
import { Card, SectionHeader, Badge, StatCard } from "../ui/UIComponents";

interface Customer {
  id: string;
  name: string;
  bookings: number;
  spent: number;
  vip: boolean;
  avatar: string;
}

type Props = NativeStackScreenProps<CustomersStackParamList, "CustomersList">;

export default function CustomersScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const customers: Customer[] = [
    {
      id: "1",
      name: "Cameron Williamson",
      bookings: 12,
      spent: 18540,
      vip: true,
      avatar: "👨‍💼",
    },
    {
      id: "2",
      name: "Savannah Nguyen",
      bookings: 8,
      spent: 12430,
      vip: true,
      avatar: "👩‍💼",
    },
    {
      id: "3",
      name: "Robert Fox",
      bookings: 5,
      spent: 8200,
      vip: false,
      avatar: "👨‍💻",
    },
    {
      id: "4",
      name: "Jenny Wilson",
      bookings: 3,
      spent: 4500,
      vip: false,
      avatar: "👩‍🦰",
    },
  ];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customers</Text>
        </View>
        <TouchableOpacity>
          <MaterialCommunityIcons
            name="tune-vertical"
            size={24}
            color={COLORS.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Search */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={COLORS.textTertiary}
          />
          <Text style={styles.searchPlaceholder}>Search customers...</Text>
          <TouchableOpacity>
            <MaterialCommunityIcons
              name="tune-vertical"
              size={20}
              color={COLORS.secondary}
            />
          </TouchableOpacity>
        </View>

        {/* Customer Overview */}
        <View style={styles.section}>
          <LinearGradient
            colors={["#6B46C1", "#9333EA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.overviewCard}
          >
            <View style={styles.overviewContent}>
              <View>
                <Text style={styles.overviewLabel}>Total Customers</Text>
                <Text style={styles.overviewValue}>3,246</Text>
                <Text style={styles.overviewTrend}>↑ 16.8%</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View>
                <Text style={styles.overviewLabel}>VIP Customers</Text>
                <Text style={styles.overviewValue}>512</Text>
                <Text style={styles.overviewTrend}>↑ 14.3%</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Top Customers */}
        <View style={styles.section}>
          <SectionHeader title="Top Customers" action="View All" />
          {customers.map((customer) => (
            <Card key={customer.id}>
              <TouchableOpacity
                style={styles.customerItem}
                onPress={() =>
                  navigation.navigate("CustomerDetails", {
                    customerId: customer.id,
                  })
                }
                activeOpacity={0.7}
              >
                <View style={styles.customerAvatar}>
                  <Text style={styles.avatarEmoji}>{customer.avatar}</Text>
                </View>
                <View style={styles.customerInfo}>
                  <View style={styles.customerHeader}>
                    <Text style={styles.customerName}>{customer.name}</Text>
                    {customer.vip && (
                      <Badge label="VIP" status="active" size="small" />
                    )}
                  </View>
                  <Text style={styles.customerStats}>
                    {customer.bookings} Bookings • $
                    {customer.spent.toLocaleString()}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.textTertiary}
                />
              </TouchableOpacity>
            </Card>
          ))}
        </View>

        {/* Customer Segments */}
        <View style={styles.section}>
          <SectionHeader title="Customer Segments" />
          <View style={styles.segmentsGrid}>
            <Card>
              <View style={styles.segmentBox}>
                <MaterialCommunityIcons
                  name="crown"
                  size={24}
                  color={COLORS.warning}
                />
                <Text style={styles.segmentLabel}>VIP</Text>
                <Text style={styles.segmentValue}>512</Text>
              </View>
            </Card>
            <Card>
              <View style={styles.segmentBox}>
                <MaterialCommunityIcons
                  name="star"
                  size={24}
                  color={COLORS.secondary}
                />
                <Text style={styles.segmentLabel}>Regular</Text>
                <Text style={styles.segmentValue}>2,145</Text>
              </View>
            </Card>
            <Card>
              <View style={styles.segmentBox}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={24}
                  color={COLORS.textTertiary}
                />
                <Text style={styles.segmentLabel}>Inactive</Text>
                <Text style={styles.segmentValue}>589</Text>
              </View>
            </Card>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },

  content: {
    flex: 1,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },

  searchPlaceholder: {
    flex: 1,
    color: COLORS.textTertiary,
    fontSize: 14,
  },

  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  overviewCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  overviewContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
  },

  overviewLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "600",
  },

  overviewValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    marginTop: 4,
  },

  overviewTrend: {
    fontSize: 12,
    color: "#A3E635",
    fontWeight: "600",
    marginTop: 4,
  },

  overviewDivider: {
    width: 1,
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },

  customerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarEmoji: {
    fontSize: 24,
  },

  customerInfo: {
    flex: 1,
  },

  customerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  customerName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },

  customerStats: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },

  segmentsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  segmentBox: {
    alignItems: "center",
    paddingVertical: 16,
  },

  segmentLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: "600",
    marginTop: 8,
  },

  segmentValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 4,
  },
});
