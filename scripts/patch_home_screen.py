import os

file_path = os.path.normpath("src/screens/HomeScreen.tsx")
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Import
needle_import = 'import { PromoExclusiveModal } from "../components/PromoExclusiveModal";'
replacement_import = (
    'import { PromoExclusiveModal } from "../components/PromoExclusiveModal";\n'
    'import { FeatureDiscoveryModal } from "../components/FeatureDiscoveryModal";'
)
code = code.replace(needle_import, replacement_import, 1)

# 2. First-time login guide effect
needle_state = '  const [showAllServicesModal, setShowAllServicesModal] = useState(false);'
replacement_state = (
    '  const [showAllServicesModal, setShowAllServicesModal] = useState(false);\n\n'
    '  // Present the 40+ Feature Discovery Guide once for new users after login\n'
    '  useEffect(() => {\n'
    '    AsyncStorage.getItem("@app:has_seen_first_time_tour").then((val) => {\n'
    '      if (!val) {\n'
    '        setTimeout(() => {\n'
    '          setShowAllServicesModal(true);\n'
    '          AsyncStorage.setItem("@app:has_seen_first_time_tour", "true");\n'
    '        }, 1500);\n'
    '      }\n'
    '    });\n'
    '  }, []);'
)
code = code.replace(needle_state, replacement_state, 1)

# 3. Add Feature Guide Banner below servicesContainer
needle_banner = '        {/* ================================================================== */}\n        {/* 3. Unified Search Card with 1-Tap Fill (Problem 2)                 */}'
if needle_banner not in code:
    needle_banner = '        {/* ================================================================== */}\r\n        {/* 3. Unified Search Card with 1-Tap Fill (Problem 2)                 */}'

replacement_banner = (
    '        {/* ================================================================== */}\n'
    '        {/* 2b. 40+ Features Interactive Guide & Directory Banner              */}\n'
    '        {/* ================================================================== */}\n'
    '        <Pressable\n'
    '          style={styles.featureGuideBanner}\n'
    '          onPress={() => {\n'
    '            try {\n'
    '              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);\n'
    '            } catch {}\n'
    '            setShowAllServicesModal(true);\n'
    '          }}\n'
    '        >\n'
    '          <LinearGradient\n'
    '            colors={["#1E3A8A", "#2563EB", "#3B82F6"]}\n'
    '            start={{ x: 0, y: 0 }}\n'
    '            end={{ x: 1, y: 1 }}\n'
    '            style={styles.featureGuideGradient}\n'
    '          >\n'
    '            <View style={styles.featureGuideIconCircle}>\n'
    '              <Ionicons name="apps" size={20} color="#FFFFFF" />\n'
    '            </View>\n'
    '            <View style={{ flex: 1 }}>\n'
    '              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>\n'
    '                <Text style={styles.featureGuideTitle}>৪০+ ফিচার ডিরেক্টরি ও গাইড</Text>\n'
    '                <View style={styles.featureCountBadge}>\n'
    '                  <Text style={styles.featureCountText}>40+ Tools</Text>\n'
    '                </View>\n'
    '              </View>\n'
    '              <Text style={styles.featureGuideSubtitle}>\n'
    '                সকল ভ্রমণ টুলস, এআই ও জরুরি সার্ভিস এক নজরে ঘুরে দেখুন\n'
    '              </Text>\n'
    '            </View>\n'
    '            <View style={styles.featureGuideArrow}>\n'
    '              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />\n'
    '            </View>\n'
    '          </LinearGradient>\n'
    '        </Pressable>\n\n'
    + needle_banner
)
code = code.replace(needle_banner, replacement_banner, 1)

# 4. Modal render
needle_modal = (
    '      {/* Promo Modal */}\n'
    '      <PromoExclusiveModal\n'
    '        visible={showPromoModal}\n'
    '        onClose={() => setShowPromoModal(false)}\n'
    '        onClaimAll={() => setShowPromoModal(false)}\n'
    '      />'
)
if needle_modal not in code:
    needle_modal = (
        '      {/* Promo Modal */}\r\n'
        '      <PromoExclusiveModal\n'
        '        visible={showPromoModal}\n'
        '        onClose={() => setShowPromoModal(false)}\n'
        '        onClaimAll={() => setShowPromoModal(false)}\n'
        '      />'
    )

replacement_modal = (
    needle_modal + '\n\n'
    '      {/* 40+ Feature Discovery Directory & Tour Guide Modal */}\n'
    '      <FeatureDiscoveryModal\n'
    '        visible={showAllServicesModal}\n'
    '        onClose={() => setShowAllServicesModal(false)}\n'
    '      />'
)
code = code.replace(needle_modal, replacement_modal, 1)

# 5. Add styles
needle_styles = '  shell: {'
replacement_styles = (
    '  featureGuideBanner: {\n'
    '    marginHorizontal: 16,\n'
    '    marginTop: 12,\n'
    '    marginBottom: 6,\n'
    '    borderRadius: 16,\n'
    '    overflow: "hidden",\n'
    '    shadowColor: "#0055F2",\n'
    '    shadowOffset: { width: 0, height: 4 },\n'
    '    shadowOpacity: 0.2,\n'
    '    shadowRadius: 8,\n'
    '    elevation: 4,\n'
    '  },\n'
    '  featureGuideGradient: {\n'
    '    flexDirection: "row",\n'
    '    alignItems: "center",\n'
    '    paddingHorizontal: 14,\n'
    '    paddingVertical: 12,\n'
    '    gap: 12,\n'
    '  },\n'
    '  featureGuideIconCircle: {\n'
    '    width: 40,\n'
    '    height: 40,\n'
    '    borderRadius: 20,\n'
    '    backgroundColor: "rgba(255,255,255,0.2)",\n'
    '    alignItems: "center",\n'
    '    justifyContent: "center",\n'
    '  },\n'
    '  featureGuideTitle: {\n'
    '    fontSize: 14,\n'
    '    fontWeight: "800",\n'
    '    color: "#FFFFFF",\n'
    '  },\n'
    '  featureCountBadge: {\n'
    '    backgroundColor: "#FACC15",\n'
    '    paddingHorizontal: 6,\n'
    '    paddingVertical: 1,\n'
    '    borderRadius: 4,\n'
    '  },\n'
    '  featureCountText: {\n'
    '    fontSize: 10,\n'
    '    fontWeight: "800",\n'
    '    color: "#0F172A",\n'
    '  },\n'
    '  featureGuideSubtitle: {\n'
    '    fontSize: 11,\n'
    '    color: "#E0F2FE",\n'
    '    marginTop: 2,\n'
    '    lineHeight: 15,\n'
    '  },\n'
    '  featureGuideArrow: {\n'
    '    width: 28,\n'
    '    height: 28,\n'
    '    borderRadius: 14,\n'
    '    backgroundColor: "rgba(255,255,255,0.25)",\n'
    '    alignItems: "center",\n'
    '    justifyContent: "center",\n'
    '  },\n'
    '  shell: {'
)
code = code.replace(needle_styles, replacement_styles, 1)

with open(file_path, "r+", encoding="utf-8") as f:
    f.seek(0)
    f.write(code)
    f.truncate()

print("HomeScreen.tsx patched successfully!")
