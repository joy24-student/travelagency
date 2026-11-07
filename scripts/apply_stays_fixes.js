const fs = require('fs');
const path = require('path');

function patchFile(filePath, transforms) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { target, replacement, label } of transforms) {
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

// 2. SearchStaysScreen.tsx
const staysPath = path.resolve(__dirname, '../src/screens/SearchStaysScreen.tsx');
patchFile(staysPath, [
  {
    target: `import { ListSkeleton } from "../components/common";
import { EmptyState } from "../components/ui/EmptyState";`,
    replacement: `import { ListSkeleton, ResultsSummaryHeader } from "../components/common";
import { EmptyState } from "../components/ui/EmptyState";
import { PrecisionSlider } from "../components/ui/PrecisionSlider";
import { formatPrice as utilsFormatPrice } from "../utils/currency";`,
    label: "Imports in SearchStaysScreen",
  },
  {
    target: `export function formatPrice(
  amount: number | string,
  currencySymbol: string = HOSPITALITY_CONFIG.DEFAULT_CURRENCY_SYMBOL
): string {
  const numeric = typeof amount === "string" ? parseFloat(amount) || 0 : amount;
  return \`\${currencySymbol}\${Math.round(numeric).toLocaleString()}\`;
}`,
    replacement: `export function formatPrice(
  amount: number | string,
  _currencySymbol: string = HOSPITALITY_CONFIG.DEFAULT_CURRENCY_SYMBOL
): string {
  const numeric = typeof amount === "string" ? parseFloat(amount) || 0 : amount;
  return utilsFormatPrice(numeric);
}`,
    label: "formatPrice in SearchStaysScreen",
  },
  {
    target: `  // Dynamic Price Breakdown Calculations (Factoring Child Age Supplements)
  const roomRate = activeSelectedRoom`,
    replacement: `  // Progressive list pagination
  const [pageLimit, setPageLimit] = useState(8);
  const pagedHotels = useMemo(() => {
    return filteredHotels.slice(0, pageLimit);
  }, [filteredHotels, pageLimit]);

  const handleEndReached = useCallback(() => {
    if (pageLimit < filteredHotels.length) {
      setPageLimit((prev) => Math.min(prev + 6, filteredHotels.length));
    }
  }, [pageLimit, filteredHotels.length]);

  // Dynamic Price Breakdown Calculations (Factoring Child Age Supplements)
  const roomRate = activeSelectedRoom`,
    label: "Pagination state in SearchStaysScreen",
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
    label: "PrecisionSlider in SearchStaysScreen",
  },
  {
    target: `        {/* Section Header */}
        <View style={styles.sectionHeaderRow} className="flex-row items-center justify-between px-4 mt-4 mb-2">
          <Text style={styles.sectionHeading} className="text-base font-extrabold text-slate-900">
            {searchQuery ? \`Stays in "\${searchQuery}"\` : "Featured Stays & Resorts"}
          </Text>
          <Text style={styles.sectionCountText} className="text-xs font-semibold text-slate-500">
            ({filteredHotels.length} available)
          </Text>
        </View>`,
    replacement: `        {/* Section Header & Results Summary Header */}
        <View className="px-4 mt-4 mb-2">
          <ResultsSummaryHeader
            count={filteredHotels.length}
            entityName="হোটেল ও স্টে"
            sortLabel={propertyTypeFilter !== "All Types" ? propertyTypeFilter : "জনপ্রিয়তা"}
            filterCount={
              (searchQuery.trim() ? 1 : 0) +
              (selectedVibe !== "All Stays" ? 1 : 0) +
              (propertyTypeFilter !== "All Types" ? 1 : 0) +
              (starRatingFilter > 0 ? 1 : 0) +
              (guestRatingFilter > 0 ? 1 : 0) +
              (maxPriceSlider < HOSPITALITY_CONFIG.MAX_BUDGET ? 1 : 0) +
              (freeCancellationOnly ? 1 : 0)
            }
            onClearFilters={handleResetFilters}
          />
        </View>`,
    label: "ResultsSummaryHeader in SearchStaysScreen",
  },
  {
    target: `        <FlatList
          data={filteredHotels}
          renderItem={renderHotelItem}
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
    replacement: `        <FlatList
          data={pagedHotels}
          renderItem={renderHotelItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          windowSize={5}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          removeClippedSubviews={Platform.OS === "android"}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={
            pageLimit < filteredHotels.length ? (
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
    label: "FlatList pagination in SearchStaysScreen",
  },
  {
    target: `                        <View className="flex-row">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Ionicons key={i} name="star" size={16} color="#F59E0B" />
                          ))}
                        </View>`,
    replacement: `                        <View className="flex-row">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Ionicons key={\`star-\${i}\`} name="star" size={16} color="#F59E0B" />
                          ))}
                        </View>`,
    label: "Star rating stable key in SearchStaysScreen",
  },
]);

console.log("SearchStaysScreen successfully updated!");
