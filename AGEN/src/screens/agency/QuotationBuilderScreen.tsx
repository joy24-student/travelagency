/**
 * QuotationBuilderScreen.tsx
 * White-Label Travel Quotation & Itinerary Generator for Travel Agencies
 * Enables agents to create branded quotes with custom markups, client details,
 * multiple service items (Flights, Hotels, Visas), and export/share via PDF or WhatsApp.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";

const THEME = {
  bg: "#0B1326",
  card: "#171F33",
  cardAlt: "#1C253B",
  primary: "#4F46E5",
  accent: "#06B6D4",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  border: "rgba(255, 255, 255, 0.1)",
};

interface QuoteItem {
  id: string;
  category: "Flight" | "Hotel" | "Visa" | "Transfer" | "Tour";
  description: string;
  costPrice: number;
  markup: number;
}

export default function QuotationBuilderScreen({ navigation }: any) {
  const { user } = useAuth();
  const agencyName = user?.agencyName || "Green Holidays & Travel Ltd.";

  // Client Details
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [destination, setDestination] = useState("Dubai, UAE");
  const [travelDates, setTravelDates] = useState("15 Dec 2026 - 22 Dec 2026");

  // Quotation Items
  const [items, setItems] = useState<QuoteItem[]>([
    {
      id: "1",
      category: "Flight",
      description: "Return Air Ticket: Dhaka - Dubai (Biman Bangladesh)",
      costPrice: 48500,
      markup: 4000,
    },
    {
      id: "2",
      category: "Hotel",
      description: "5 Nights at Grand Hyatt Dubai (Deluxe Room with Breakfast)",
      costPrice: 42000,
      markup: 4500,
    },
    {
      id: "3",
      category: "Visa",
      description: "30 Days UAE Tourist Visa with Insurance",
      costPrice: 9500,
      markup: 1500,
    },
  ]);

  // New Item State
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemCost, setNewItemCost] = useState("");
  const [newItemMarkup, setNewItemMarkup] = useState("");

  const handleAddItem = () => {
    if (!newItemDesc.trim() || !newItemCost) {
      Alert.alert("Missing Information", "Please enter description and cost price.");
      return;
    }
    const cost = parseFloat(newItemCost) || 0;
    const markup = parseFloat(newItemMarkup) || 0;

    const newItem: QuoteItem = {
      id: Date.now().toString(),
      category: "Tour",
      description: newItemDesc,
      costPrice: cost,
      markup: markup,
    };

    setItems([...items, newItem]);
    setNewItemDesc("");
    setNewItemCost("");
    setNewItemMarkup("");
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const totalCost = items.reduce((sum, item) => sum + item.costPrice, 0);
  const totalMarkup = items.reduce((sum, item) => sum + item.markup, 0);
  const grandTotal = totalCost + totalMarkup;

  const handleShareQuote = async () => {
    if (!clientName.trim()) {
      Alert.alert("Required", "Please enter client name.");
      return;
    }
    const quoteText = `
*QUOTATION FROM ${agencyName.toUpperCase()}*
Ref: QT-${Math.floor(1000 + Math.random() * 9000)}
Client: ${clientName}
Destination: ${destination}
Dates: ${travelDates}
----------------------------------------
${items
  .map(
    (item, idx) =>
      `${idx + 1}. [${item.category}] ${item.description}\n   Price: ৳${(
        item.costPrice + item.markup
      ).toLocaleString()}`
  )
  .join("\n\n")}
----------------------------------------
*TOTAL AMOUNT: ৳${grandTotal.toLocaleString()}*
(All taxes & service charges included)

Thank you for choosing ${agencyName}!
Contact: ${user?.email || "agency@shopnojatra.com"}
    `.trim();

    try {
      await Share.share({
        message: quoteText,
        title: `Travel Quotation for ${clientName}`,
      });
    } catch (e) {
      console.warn("Share failed:", e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={THEME.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Branded Quotation Builder</Text>
          <Text style={styles.headerSub}>Generate Client Quotes with Custom Margins</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Client Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="account-tie" size={20} color={THEME.accent} />
            <Text style={styles.cardTitle}>Client & Trip Details</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Client / Traveler Name *</Text>
            <TextInput
              value={clientName}
              onChangeText={setClientName}
              placeholder="e.g. Tanvir Ahmed (Beximco Corp)"
              placeholderTextColor={THEME.textMuted}
              style={styles.textInput}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Destination</Text>
              <TextInput
                value={destination}
                onChangeText={setDestination}
                placeholder="Dubai, UAE"
                placeholderTextColor={THEME.textMuted}
                style={styles.textInput}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Phone / WhatsApp</Text>
              <TextInput
                value={clientPhone}
                onChangeText={setClientPhone}
                placeholder="+880 1..."
                placeholderTextColor={THEME.textMuted}
                keyboardType="phone-pad"
                style={styles.textInput}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Travel Dates / Duration</Text>
            <TextInput
              value={travelDates}
              onChangeText={setTravelDates}
              placeholder="e.g. 15 Dec 2026 - 22 Dec 2026"
              placeholderTextColor={THEME.textMuted}
              style={styles.textInput}
            />
          </View>
        </View>

        {/* Quotation Line Items */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="format-list-checks" size={20} color={THEME.primary} />
            <Text style={styles.cardTitle}>Quotation Items & Services</Text>
          </View>

          {items.map((item) => {
            const clientPrice = item.costPrice + item.markup;
            return (
              <View key={item.id} style={styles.itemBox}>
                <View style={styles.itemTopRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryTxt}>{item.category}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
                    <Feather name="trash-2" size={16} color={THEME.danger} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.itemDesc}>{item.description}</Text>

                <View style={styles.itemPricingRow}>
                  <Text style={styles.itemCost}>Net Cost: ৳{item.costPrice.toLocaleString()}</Text>
                  <Text style={styles.itemMarkup}>+৳{item.markup.toLocaleString()} Markup</Text>
                  <Text style={styles.itemClientPrice}>Client: ৳{clientPrice.toLocaleString()}</Text>
                </View>
              </View>
            );
          })}

          {/* Add New Line Item Form */}
          <View style={styles.addItemForm}>
            <Text style={styles.subheading}>+ Add Service Item</Text>
            <TextInput
              value={newItemDesc}
              onChangeText={setNewItemDesc}
              placeholder="e.g. Airport Private Luxury Transfer"
              placeholderTextColor={THEME.textMuted}
              style={[styles.textInput, { marginBottom: 8 }]}
            />
            <View style={styles.inputRow}>
              <TextInput
                value={newItemCost}
                onChangeText={setNewItemCost}
                placeholder="Net Cost (BDT)"
                placeholderTextColor={THEME.textMuted}
                keyboardType="numeric"
                style={[styles.textInput, { flex: 1, marginRight: 8 }]}
              />
              <TextInput
                value={newItemMarkup}
                onChangeText={setNewItemMarkup}
                placeholder="Markup (BDT)"
                placeholderTextColor={THEME.textMuted}
                keyboardType="numeric"
                style={[styles.textInput, { flex: 1, marginRight: 8 }]}
              />
              <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}>
                <Text style={styles.addBtnTxt}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Grand Total Summary Box */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Net Cost:</Text>
            <Text style={styles.summaryVal}>৳{totalCost.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Agency Total Profit / Markup:</Text>
            <Text style={[styles.summaryVal, { color: THEME.success }]}>
              +৳{totalMarkup.toLocaleString()}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.grandTotalLabel}>Client Quotation Total:</Text>
            <Text style={styles.grandTotalVal}>৳{grandTotal.toLocaleString()}</Text>
          </View>
        </View>

        {/* Action Button: Share / Export */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShareQuote}>
          <LinearGradient colors={["#10B981", "#059669"]} style={styles.gradientBtn}>
            <Ionicons name="share-social-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.shareBtnTxt}>Share Branded Quotation</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    marginRight: 14,
    padding: 6,
    borderRadius: 8,
    backgroundColor: THEME.card,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.text,
  },
  headerSub: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.text,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputLabel: {
    fontSize: 12,
    color: THEME.textMuted,
    marginBottom: 4,
    fontWeight: "600",
  },
  textInput: {
    backgroundColor: THEME.cardAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: THEME.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  itemBox: {
    backgroundColor: THEME.cardAlt,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: "rgba(79, 70, 229, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryTxt: {
    fontSize: 10,
    fontWeight: "700",
    color: THEME.primary,
  },
  itemDesc: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.text,
    marginBottom: 8,
  },
  itemPricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemCost: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  itemMarkup: {
    fontSize: 11,
    color: THEME.accent,
    fontWeight: "600",
  },
  itemClientPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.text,
  },
  addItemForm: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  subheading: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.accent,
    marginBottom: 8,
  },
  addBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnTxt: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },
  summaryCard: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: THEME.textMuted,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.text,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 10,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.text,
  },
  grandTotalVal: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.success,
  },
  shareBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 20,
  },
  gradientBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  shareBtnTxt: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
