const fs = require('fs');
const path = require('path');

function patchFile(filePath, transforms) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { target, replacement, label } of transforms) {
    // Normalize newlines for reliable matching
    const normContent = content.replace(/\r\n/g, '\n');
    const normTarget = target.replace(/\r\n/g, '\n');
    if (!normContent.includes(normTarget)) {
      console.error(`[FAIL] in ${path.basename(filePath)}: Could not find target for "${label}"`);
      process.exit(1);
    }
    const normReplacement = replacement.replace(/\r\n/g, '\n');
    content = normContent.replace(normTarget, normReplacement);
    console.log(`[OK] ${path.basename(filePath)}: ${label}`);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

// 1. HotelsHomesScreen.tsx
const hotelsPath = path.resolve(__dirname, '../src/screens/HotelsHomesScreen.tsx');
patchFile(hotelsPath, [
  {
    target: `import { ListSkeleton, CardSkeleton, ErrorStateCard } from "../components/common";
import { EmptyState } from "../components/ui/EmptyState";`,
    replacement: `import { ListSkeleton, CardSkeleton, ErrorStateCard, ResultsSummaryHeader, ComparisonModal, ComparisonItem } from "../components/common";
import { EmptyState } from "../components/ui/EmptyState";
import { PrecisionSlider } from "../components/ui/PrecisionSlider";
import { formatPrice as utilsFormatPrice } from "../utils/currency";`,
    label: "Imports in HotelsHomesScreen",
  },
  {
    target: `export function formatPrice(amount: number | string, currency = "BDT"): string {
  return formatLocalizedCurrency(amount, currency as any);
}`,
    replacement: `export function formatPrice(amount: number | string, currency?: string): string {
  return utilsFormatPrice(Number(amount) || 0, currency as any);
}`,
    label: "formatPrice in HotelsHomesScreen",
  },
  {
    target: `  // Selected Villa for Booking Bottom Sheet
  const [selectedVilla, setSelectedVilla] = useState<VacationRental | null>(null);`,
    replacement: `  // Selected Villa for Booking Bottom Sheet
  const [selectedVilla, setSelectedVilla] = useState<VacationRental | null>(null);

  // Hotel Comparison State
  const [selectedCompareHotels, setSelectedCompareHotels] = useState<VacationRental[]>([]);
  const [compareModalVisible, setCompareModalVisible] = useState(false);

  const toggleCompareHotel = useCallback((villa: VacationRental) => {
    Haptics.selectionAsync();
    setSelectedCompareHotels((prev) => {
      if (prev.some((h) => h.id === villa.id)) {
        return prev.filter((h) => h.id !== villa.id);
      }
      if (prev.length >= 4) {
        Alert.alert("তুলনা সীমা", "সর্বোচ্চ ৪টি হোটেল একসাথে তুলনা করতে পারবেন।");
        return prev;
      }
      return [...prev, villa];
    });
  }, []);

  const hotelComparisonItems: ComparisonItem[] = useMemo(() => {
    return selectedCompareHotels.map((h) => ({
      id: h.id,
      title: h.name,
      subtitle: \`\${h.location} • \${h.propertyType}\`,
      price: h.pricePerNight,
      priceUnit: "/রাত",
      rating: h.rating,
      reviewsCount: h.reviewsCount,
      specs: [
        { label: "ধরণ", value: h.propertyType },
        { label: "অতিথি", value: \`\${h.maxGuests} জন\` },
        { label: "বেডরুম", value: \`\${h.bedrooms}টি\` },
        { label: "বাথরুম", value: \`\${h.bathrooms}টি\` },
      ],
      features: h.amenities || [],
      policies: [h.freeCancellation ? "ফ্রি বাতিলকরণ সুবিধা" : "বাতিলকরণ প্রযোজ্য নয়"],
    }));
  }, [selectedCompareHotels]);

  // Progressive list pagination
  const [pageLimit, setPageLimit] = useState(8);
  const pagedRentals = useMemo(() => {
    return filteredRentals.slice(0, pageLimit);
  }, [filteredRentals, pageLimit]);

  const handleEndReached = useCallback(() => {
    if (pageLimit < filteredRentals.length) {
      setPageLimit((prev) => Math.min(prev + 6, filteredRentals.length));
    }
  }, [pageLimit, filteredRentals.length]);`,
    label: "Compare and Pagination state in HotelsHomesScreen",
  },
  {
    target: `              <Pressable
                style={styles.reserveBtn}
                className="flex-row items-center bg-blue-600 px-4 py-2.5 rounded-xl active:bg-blue-700 shadow-sm"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedVilla(villa);
                }}
              >
                <Text style={styles.reserveBtnText} className="text-white text-xs font-bold me-1">
                  View & Reserve
                </Text>
                <RTLIcon name="arrow-forward" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>
      );
    },
    [nightsCount, handleMessageHost]`,
    replacement: `              <View className="flex-row items-center">
                <Pressable
                  onPress={() => toggleCompareHotel(villa)}
                  className={\`px-2.5 py-2 rounded-xl border flex-row items-center me-2 \${
                    selectedCompareHotels.some((h) => h.id === villa.id)
                      ? "bg-blue-50 border-blue-600"
                      : "bg-slate-100 border-slate-200"
                  }\`}
                >
                  <Ionicons
                    name={selectedCompareHotels.some((h) => h.id === villa.id) ? "checkbox" : "square-outline"}
                    size={14}
                    color={selectedCompareHotels.some((h) => h.id === villa.id) ? "#2563EB" : "#64748B"}
                  />
                  <Text
                    className={\`text-[11px] font-bold ms-1 \${
                      selectedCompareHotels.some((h) => h.id === villa.id) ? "text-blue-600" : "text-slate-600"
                    }\`}
                  >
                    তুলনা
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.reserveBtn}
                  className="flex-row items-center bg-blue-600 px-4 py-2.5 rounded-xl active:bg-blue-700 shadow-sm"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedVilla(villa);
                  }}
                >
                  <Text style={styles.reserveBtnText} className="text-white text-xs font-bold me-1">
                    View & Reserve
                  </Text>
                  <RTLIcon name="arrow-forward" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      );
    },
    [nightsCount, handleMessageHost, selectedCompareHotels, toggleCompareHotel]`,
    label: "Card compare button in HotelsHomesScreen",
  },
  {
    target: `          {/* 4. Interactive Price Range Slider & Stepper Controls */}
          <View style={styles.filterGroupRow} className="mb-3">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text style={styles.filterGroupTitle} className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Price Range Slider:
              </Text>
              <Text className="text-xs font-extrabold text-blue-600">
                {formatPrice(minPriceSlider)} - {maxPriceSlider >= HOSPITALITY_CONFIG.MAX_BUDGET ? \`\${formatPrice(HOSPITALITY_CONFIG.MAX_BUDGET)}+\` : formatPrice(maxPriceSlider)}
              </Text>
            </View>

            {/* Visual Slider Bar Track */}
            <View className="w-full h-2 bg-slate-200 rounded-full my-2 overflow-hidden">
              <View
                style={{
                  width: \`\${Math.min(100, Math.max(10, (maxPriceSlider / HOSPITALITY_CONFIG.MAX_BUDGET) * 100))}%\`,
                }}
                className="h-full bg-blue-600 rounded-full"
              />
            </View>

            {/* Quick Price Milestone Pills */}
            <View className="flex-row justify-between mb-2">
              {BUDGET_MILESTONES.map((cap) => (
                <Pressable
                  key={cap}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setMaxPriceSlider(cap);
                    setPricePreset("custom");
                    syncStoreFilters({ maxPrice: cap < HOSPITALITY_CONFIG.MAX_BUDGET ? cap : undefined });
                  }}
                  className={\`px-2 py-0.5 rounded \${maxPriceSlider === cap ? "bg-blue-600" : "bg-slate-100"}\`}
                >
                  <Text className={\`text-[10px] font-bold \${maxPriceSlider === cap ? "text-white" : "text-slate-600"}\`}>
                    {formatPrice(cap)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Presets Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
              {PRICE_PRESETS.map((chip) => {
                const isSelected = pricePreset === chip.value;
                return (
                  <Pressable
                    key={chip.label}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    className={\`px-3 py-1.5 rounded-full me-2 border \${
                      isSelected
                        ? "bg-blue-600 border-blue-600"
                        : "bg-slate-50 border-slate-200"
                    }\`}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPricePreset(chip.value);
                      setMinPriceSlider(chip.min);
                      setMaxPriceSlider(chip.max);
                      syncStoreFilters({
                        minPrice: chip.min > 0 ? chip.min : undefined,
                        maxPrice: chip.max < HOSPITALITY_CONFIG.MAX_BUDGET ? chip.max : undefined,
                      });
                    }}
                  >
                    <Text
                      style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}
                      className={\`text-xs font-semibold \${
                        isSelected ? "text-white" : "text-slate-700"
                      }\`}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Interactive Price Stepper Controls */}
            <View className="flex-row items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 mt-2">
              <Pressable
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg active:bg-slate-100"
                onPress={() => {
                  Haptics.selectionAsync();
                  setMaxPriceSlider((prev) => Math.max(minPriceSlider + HOSPITALITY_CONFIG.BUDGET_STEP, prev - HOSPITALITY_CONFIG.BUDGET_STEP));
                  setPricePreset("custom");
                }}
              >
                <Text className="text-xs font-bold text-slate-700">-{formatPrice(HOSPITALITY_CONFIG.BUDGET_STEP)}</Text>
              </Pressable>

              <View className="items-center">
                <Text className="text-xs font-bold text-slate-500">Max Budget Cap</Text>
                <Text className="text-sm font-extrabold text-slate-900">{formatPrice(maxPriceSlider)}/night</Text>
              </View>

              <Pressable
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg active:bg-slate-100"
                onPress={() => {
                  Haptics.selectionAsync();
                  setMaxPriceSlider((prev) => Math.min(HOSPITALITY_CONFIG.MAX_BUDGET, prev + HOSPITALITY_CONFIG.BUDGET_STEP));
                  setPricePreset("custom");
                }}
              >
                <Text className="text-xs font-bold text-slate-700">+{formatPrice(HOSPITALITY_CONFIG.BUDGET_STEP)}</Text>
              </Pressable>
            </View>
          </View>`,
    replacement: `          {/* 4. Interactive Precision Slider & Stepper Controls */}
          <View style={styles.filterGroupRow} className="mb-3">
            <PrecisionSlider
              label="বাজেট সীমা (সর্বোচ্চ প্রতি রাত)"
              value={maxPriceSlider}
              min={HOSPITALITY_CONFIG.MIN_BUDGET}
              max={HOSPITALITY_CONFIG.MAX_BUDGET}
              step={HOSPITALITY_CONFIG.BUDGET_STEP}
              unit="/রাত"
              presets={BUDGET_MILESTONES as any}
              onChange={(val) => {
                setMaxPriceSlider(val);
                setPricePreset("custom");
                syncStoreFilters({
                  maxPrice: val < HOSPITALITY_CONFIG.MAX_BUDGET ? val : undefined,
                });
              }}
            />
          </View>`,
    label: "PrecisionSlider in HotelsHomesScreen",
  },
  {
    target: `        {/* Section Heading */}
        <View style={styles.sectionHeaderRow} className="flex-row items-center justify-between px-4 mt-4 mb-2">
          <Text style={styles.sectionHeading} className="text-base font-extrabold text-slate-900">
            {selectedAmenity === "all"
              ? "Handpicked Luxury Villas"
              : \`\${selectedAmenity} Stays\`}
          </Text>
          <Text className="text-xs font-semibold text-slate-500">
            ({filteredRentals.length} available)
          </Text>
        </View>`,
    replacement: `        {/* Section Heading & Results Summary Header */}
        <View className="px-4 mt-4 mb-2">
          <ResultsSummaryHeader
            count={filteredRentals.length}
            entityName="হোটেল ও রিসোর্ট"
            sortLabel={propertyTypeFilter !== "All Types" ? propertyTypeFilter : "জনপ্রিয়তা"}
            filterCount={
              (searchQuery.trim() ? 1 : 0) +
              (selectedAmenity !== "all" ? 1 : 0) +
              (propertyTypeFilter !== "All Types" ? 1 : 0) +
              (starRatingFilter > 0 ? 1 : 0) +
              (guestRatingFilter > 0 ? 1 : 0) +
              (maxPriceSlider < HOSPITALITY_CONFIG.MAX_BUDGET ? 1 : 0) +
              (freeCancellationOnly ? 1 : 0)
            }
            onClearFilters={handleResetFilters}
          />
        </View>`,
    label: "ResultsSummaryHeader in HotelsHomesScreen",
  },
  {
    target: `      {/* Optimized Virtualized FlatList */}
      <FlatList
        data={filteredRentals}
        renderItem={renderVillaItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        windowSize={5}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        removeClippedSubviews={Platform.OS === "android"}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />`,
    replacement: `      {/* Optimized Virtualized FlatList with Progressive Pagination */}
      <FlatList
        data={pagedRentals}
        renderItem={renderVillaItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        windowSize={5}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        removeClippedSubviews={Platform.OS === "android"}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={
          pageLimit < filteredRentals.length ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#0055F2" />
            </View>
          ) : null
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />`,
    label: "FlatList pagination in HotelsHomesScreen",
  },
  {
    target: `          onStartCall={(prof, type) => {
            router.push({
              pathname: "/screens/call" as any,
              params: { friendId: prof.id, callType: type },
            });
          }}
        />
      )}
    </SafeAreaView>`,
    replacement: `          onStartCall={(prof, type) => {
            router.push({
              pathname: "/screens/call" as any,
              params: { friendId: prof.id, callType: type },
            });
          }}
        />
      )}

      {/* Hotel Compare Floating Bar */}
      {selectedCompareHotels.length > 0 && (
        <View
          style={{
            position: "absolute",
            bottom: 24,
            left: 16,
            right: 16,
            backgroundColor: "#0F172A",
            borderRadius: 16,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
            {selectedCompareHotels.length}টি হোটেল নির্বাচিত
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable onPress={() => setSelectedCompareHotels([])} style={{ marginEnd: 12 }}>
              <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 13 }}>মুছুন</Text>
            </Pressable>
            <Pressable
              onPress={() => setCompareModalVisible(true)}
              style={{
                backgroundColor: "#0055F2",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
                তুলনা দেখুন ({selectedCompareHotels.length})
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Hotel Comparison Modal */}
      <ComparisonModal
        visible={compareModalVisible}
        onClose={() => setCompareModalVisible(false)}
        title="হোটেল ও রিসোর্ট তুলনা"
        items={hotelComparisonItems}
        onSelect={(item) => {
          setCompareModalVisible(false);
          const villa = rentals.find((r) => r.id === item.id);
          if (villa) setSelectedVilla(villa);
        }}
        selectButtonLabel="বুকিং ও বিবরণ দেখুন"
      />
    </SafeAreaView>`,
    label: "Comparison modal and bar in HotelsHomesScreen",
  },
]);

console.log("HotelsHomesScreen successfully updated!");
