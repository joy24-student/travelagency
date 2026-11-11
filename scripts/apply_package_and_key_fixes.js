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

// 1. PackageScreen.tsx
const pkgPath = path.resolve(__dirname, '../src/screens/PackageScreen.tsx');
patchFile(pkgPath, [
  {
    target: `import { ErrorStateCard, EmptyStateView, StickyHeader } from "../components/common";`,
    replacement: `import { ErrorStateCard, EmptyStateView, StickyHeader, ResultsSummaryHeader, ComparisonModal, ComparisonItem } from "../components/common";`,
    label: "Imports in PackageScreen",
  },
  {
    target: `  // Group size state
  const [travelersCount, setTravelersCount] = useState<number>(2);`,
    replacement: `  // Group size state
  const [travelersCount, setTravelersCount] = useState<number>(2);

  // Comparison State
  const [comparePackageIds, setComparePackageIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const toggleComparePackage = useCallback((pkgId: string) => {
    Haptics.selectionAsync();
    setComparePackageIds((prev) => {
      if (prev.includes(pkgId)) return prev.filter((id) => id !== pkgId);
      if (prev.length >= 4) {
        Alert.alert("তুলনা সীমা", "সর্বোচ্চ ৪টি প্যাকেজ একসাথে তুলনা করতে পারবেন।");
        return prev;
      }
      return [...prev, pkgId];
    });
  }, []);

  const packageComparisonItems: ComparisonItem[] = useMemo(() => {
    return packages
      .filter((p) => comparePackageIds.includes(p.id))
      .map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: \`\${p.durationDays} দিন / \${p.durationNights} রাত • \${p.destination}\`,
        price: p.basePrice,
        priceUnit: "/জন",
        rating: p.rating,
        reviewsCount: p.reviewsCount,
        specs: [
          { label: "গন্তব্য", value: p.destination },
          { label: "হোটেল", value: p.hotel?.name || "পার্টনার হোটেল" },
          { label: "খাবার", value: p.mealsIncluded ? "অন্তর্ভুক্ত" : "ব্যক্তিগত" },
          { label: "সিট বাকি", value: \`\${p.seatsLeft}টি\` },
        ],
        features: p.inclusions || [],
        policies: [p.cancellationPolicy || "শর্ত প্রযোজ্য"],
      }));
  }, [packages, comparePackageIds]);`,
    label: "Comparison state in PackageScreen",
  },
  {
    target: `        {/* Results Counter & Search Filter Bar */}
        <View style={styles.resultsBar}>
          <Text style={styles.resultsCountText}>
            Showing <Text style={{ fontWeight: "800", color: "#111827" }}>{filteredPackages.length}</Text> vacation packages
          </Text>
          <View style={styles.searchPillInput}>
            <Ionicons name="search" size={14} color="#6B7280" />
            <TextInput
              style={styles.inlineSearchInput}
              placeholder="Search resorts or cities..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </View>`,
    replacement: `        {/* Results Summary Header & Search Input */}
        <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 8 }}>
          <ResultsSummaryHeader
            count={filteredPackages.length}
            entityName="ভ্যাকেশন প্যাকেজ"
            sortLabel={activeCategory !== "All Packages" ? activeCategory : "জনপ্রিয়তা"}
            filterCount={
              (activeCategory !== "All Packages" ? 1 : 0) +
              (activeDuration !== "All" ? 1 : 0) +
              (selectedDestination !== "All Destinations" ? 1 : 0) +
              (searchQuery.trim() ? 1 : 0)
            }
            onClearFilters={() => {
              setSelectedDestination("All Destinations");
              setActiveCategory("All Packages");
              setActiveDuration("All");
              setSearchQuery("");
            }}
          />
          <View style={[styles.searchPillInput, { marginTop: 8 }]}>
            <Ionicons name="search" size={14} color="#6B7280" />
            <TextInput
              style={styles.inlineSearchInput}
              placeholder="Search resorts or cities..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </View>`,
    label: "ResultsSummaryHeader in PackageScreen",
  },
  {
    target: `                      <Pressable style={styles.viewDetailBtn} onPress={() => openDrawer(pkg)}>
                        <Text style={styles.viewDetailBtnText}>Reserve</Text>
                        <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                      </Pressable>`,
    replacement: `                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Pressable
                          onPress={() => toggleComparePackage(pkg.id)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 10,
                            backgroundColor: comparePackageIds.includes(pkg.id) ? "#EFF6FF" : "#F3F4F6",
                            borderWidth: 1,
                            borderColor: comparePackageIds.includes(pkg.id) ? "#2563EB" : "#E5E7EB",
                            marginEnd: 8,
                          }}
                        >
                          <Ionicons
                            name={comparePackageIds.includes(pkg.id) ? "checkbox" : "square-outline"}
                            size={14}
                            color={comparePackageIds.includes(pkg.id) ? "#2563EB" : "#6B7280"}
                          />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: comparePackageIds.includes(pkg.id) ? "#2563EB" : "#374151",
                              marginStart: 4,
                            }}
                          >
                            তুলনা
                          </Text>
                        </Pressable>

                        <Pressable style={styles.viewDetailBtn} onPress={() => openDrawer(pkg)}>
                          <Text style={styles.viewDetailBtnText}>Reserve</Text>
                          <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                        </Pressable>
                      </View>`,
    label: "Compare button on PackageCard",
  },
  {
    target: `            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>`,
    replacement: `            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Package Compare Floating Bar */}
      {comparePackageIds.length > 0 && (
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
            {comparePackageIds.length}টি প্যাকেজ নির্বাচিত
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable onPress={() => setComparePackageIds([])} style={{ marginEnd: 12 }}>
              <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 13 }}>মুছুন</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowCompareModal(true)}
              style={{
                backgroundColor: "#7C3AED",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
                তুলনা দেখুন ({comparePackageIds.length})
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Package Comparison Modal */}
      <ComparisonModal
        visible={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        title="ভ্যাকেশন প্যাকেজ তুলনা"
        items={packageComparisonItems}
        onSelect={(item) => {
          setShowCompareModal(false);
          const pkg = packages.find((p) => p.id === item.id);
          if (pkg) openDrawer(pkg);
        }}
        selectButtonLabel="বুকিং ও বিবরণ দেখুন"
      />
    </SafeAreaView>`,
    label: "Comparison modal and bar in PackageScreen",
  },
  {
    target: `            {images.map((imgUrl, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <Pressable
                  key={idx}`,
    replacement: `            {images.map((imgUrl, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <Pressable
                  key={\`zoom-thumb-\${imgUrl}-\${idx}\`}`,
    label: "Stable key zoom-thumb in PackageScreen",
  },
  {
    target: `        {images.map((img, i) => (
          <Pressable key={i} onPress={() => onOpenZoom(i)} style={carouselStyles.slide}>`,
    replacement: `        {images.map((img, i) => (
          <Pressable key={\`slide-\${img}-\${i}\`} onPress={() => onOpenZoom(i)} style={carouselStyles.slide}>`,
    label: "Stable key slide in PackageScreen",
  },
  {
    target: `                        {pkg.inclusions.slice(0, 3).map((inc, i) => (
                          <View key={i} style={styles.inclusionHighContrastTag}>`,
    replacement: `                        {pkg.inclusions.slice(0, 3).map((inc, i) => (
                          <View key={\`inc-\${inc}-\${i}\`} style={styles.inclusionHighContrastTag}>`,
    label: "Stable key inc in PackageScreen",
  },
  {
    target: `                        {pkg.exclusions.slice(0, 2).map((exc, i) => (
                          <View key={i} style={styles.exclusionHighContrastTag}>`,
    replacement: `                        {pkg.exclusions.slice(0, 2).map((exc, i) => (
                          <View key={\`exc-\${exc}-\${i}\`} style={styles.exclusionHighContrastTag}>`,
    label: "Stable key exc in PackageScreen",
  },
  {
    target: `                      {selectedPackage.inclusions.map((item, idx) => (
                        <View key={idx} style={styles.checkItemRow}>`,
    replacement: `                      {selectedPackage.inclusions.map((item, idx) => (
                        <View key={\`pkg-inc-\${item}-\${idx}\`} style={styles.checkItemRow}>`,
    label: "Stable key pkg-inc in PackageScreen",
  },
  {
    target: `                        {selectedPackage.inclusions.map((item, idx) => (
                          <View key={idx} style={styles.inclusionCardTag}>`,
    replacement: `                        {selectedPackage.inclusions.map((item, idx) => (
                          <View key={\`tab-inc-\${item}-\${idx}\`} style={styles.inclusionCardTag}>`,
    label: "Stable key tab-inc in PackageScreen",
  },
  {
    target: `                        {selectedPackage.exclusions.map((item, idx) => (
                          <View key={idx} style={styles.exclusionCardTag}>`,
    replacement: `                        {selectedPackage.exclusions.map((item, idx) => (
                          <View key={\`tab-exc-\${item}-\${idx}\`} style={styles.exclusionCardTag}>`,
    label: "Stable key tab-exc in PackageScreen",
  },
]);

// 2. BookingSystemScreen.tsx
const bookingPath = path.resolve(__dirname, '../src/screens/BookingSystemScreen.tsx');
patchFile(bookingPath, [
  {
    target: `              ) : (
                savedPassengers.map((p, idx) => (
                  <View key={idx} style={styles.savedPassengerCard}>`,
    replacement: `              ) : (
                savedPassengers.map((p, idx) => (
                  <View key={p.id || \`pax-\${p.first_name}-\${p.last_name}-\${idx}\`} style={styles.savedPassengerCard}>`,
    label: "Stable key savedPassengers in BookingSystemScreen",
  },
]);

// 3. CustomerSupportScreen.tsx
const supportPath = path.resolve(__dirname, '../src/screens/CustomerSupportScreen.tsx');
patchFile(supportPath, [
  {
    target: `            {chatMessages.map((msg, idx) => (
              <View
                key={idx}
                style={[`,
    replacement: `            {chatMessages.map((msg, idx) => (
              <View
                key={msg.id || \`msg-\${msg.sender}-\${idx}\`}
                style={[`,
    label: "Stable key chatMessages in CustomerSupportScreen",
  },
]);

// 4. OnboardingScreen.tsx
const onboardingPath = path.resolve(__dirname, '../src/screens/OnboardingScreen.tsx');
patchFile(onboardingPath, [
  {
    target: `            {data.features.map((feature, index) => (
              <React.Fragment key={index}>`,
    replacement: `            {data.features.map((feature, index) => (
              <React.Fragment key={feature.text || \`feat-\${index}\`}>`,
    label: "Stable key features in OnboardingScreen",
  },
  {
    target: `              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.starBox}>`,
    replacement: `              {[1, 2, 3, 4, 5].map((i) => (
                <View key={\`star-\${i}\`} style={styles.starBox}>`,
    label: "Stable key stars in OnboardingScreen",
  },
  {
    target: `          {ONBOARDING_DATA.map((_, index) => (
            <View
              key={index}`,
    replacement: `          {ONBOARDING_DATA.map((_, index) => (
            <View
              key={\`step-dot-\${index}\`}`,
    label: "Stable key dots in OnboardingScreen",
  },
]);

// 5. ServiceChatScreen.tsx
const chatPath = path.resolve(__dirname, '../src/screens/ServiceChatScreen.tsx');
patchFile(chatPath, [
  {
    target: `            {[
              { name: "Grand Beach Resort & Spa", city: "Cox's Bazar", price: "$120/night" },
              { name: "The Westin Dhaka", city: "Gulshan, Dhaka", price: "$180/night" },
              { name: "Pan Pacific Sonargaon", city: "Dhaka Central", price: "$150/night" },
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}`,
    replacement: `            {[
              { name: "Grand Beach Resort & Spa", city: "Cox's Bazar", price: "$120/night" },
              { name: "The Westin Dhaka", city: "Gulshan, Dhaka", price: "$180/night" },
              { name: "Pan Pacific Sonargaon", city: "Dhaka Central", price: "$150/night" },
            ].map((item, idx) => (
              <TouchableOpacity
                key={item.name}`,
    label: "Stable key hotels in ServiceChatScreen",
  },
]);

// 6. admission-bus.tsx
const busPath = path.resolve(__dirname, '../app/screens/admission-bus.tsx');
patchFile(busPath, [
  {
    target: `              {ADVISORY_LIST.map((item, idx) => {
                const isExpanded = expandedAdvisory === idx;
                return (
                  <TouchableOpacity
                    key={idx}`,
    replacement: `              {ADVISORY_LIST.map((item, idx) => {
                const isExpanded = expandedAdvisory === idx;
                return (
                  <TouchableOpacity
                    key={item.id || item.title || \`advisory-\${idx}\`}`,
    label: "Stable key ADVISORY_LIST in admission-bus",
  },
]);

// 7. local-marketplace.tsx
const marketPath = path.resolve(__dirname, '../app/screens/local-marketplace.tsx');
patchFile(marketPath, [
  {
    target: `                    {detailProduct.galleryImages.map((img, idx) => (
                      <TouchableOpacity
                        key={idx}`,
    replacement: `                    {detailProduct.galleryImages.map((img, idx) => (
                      <TouchableOpacity
                        key={\`thumb-\${img}-\${idx}\`}`,
    label: "Stable key galleryImages in local-marketplace",
  },
]);

console.log("All packages and key index patches completed!");
