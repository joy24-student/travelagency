import React, { useState, useRef, useMemo, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Dimensions,
  FlatList,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CategorizedImage } from "../../data/hotelCatalog";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface HotelGalleryModalProps {
  visible: boolean;
  onClose: () => void;
  hotelName: string;
  images: (string | CategorizedImage)[];
  initialCategory?: string;
  initialIndex?: number;
}

const CATEGORY_TABS = [
  { id: "all", labelBn: "সব ছবি", labelEn: "All" },
  { id: "room", labelBn: "রুম", labelEn: "Rooms" },
  { id: "bathroom", labelBn: "বাথরুম", labelEn: "Bathroom" },
  { id: "exterior", labelBn: "বাইরের দৃশ্য", labelEn: "Exterior" },
  { id: "view", labelBn: "ভিউ ও পরিবেশ", labelEn: "View" },
  { id: "dining", labelBn: "ডাইনিং ও সুবিধা", labelEn: "Dining" },
] as const;

export const HotelGalleryModal: React.FC<HotelGalleryModalProps> = ({
  visible,
  onClose,
  hotelName,
  images,
  initialCategory = "all",
  initialIndex = 0,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  // Normalize images to structured list
  const normalizedImages: CategorizedImage[] = useMemo(() => {
    if (!images || images.length === 0) return [];
    return images.map((img, idx) => {
      if (typeof img === "string") {
        let cat: "room" | "bathroom" | "exterior" | "dining" | "view" = "room";
        if (idx === 0) cat = "exterior";
        else if (idx === 1) cat = "room";
        else if (idx === 2) cat = "bathroom";
        else if (idx === 3) cat = "dining";
        else cat = "view";

        return {
          url: img,
          category: cat,
          caption: `${hotelName} - Photo ${idx + 1}`,
          caption_bn: `${hotelName} - ছবি ${toBengaliNumber(idx + 1)}`,
        };
      }
      return img;
    });
  }, [images, hotelName]);

  // Filter by category
  const filteredImages = useMemo(() => {
    if (selectedCategory === "all") return normalizedImages;
    const matched = normalizedImages.filter((img) => img.category === selectedCategory);
    return matched.length > 0 ? matched : normalizedImages;
  }, [normalizedImages, selectedCategory]);

  const activeImage = filteredImages[currentIndex] || filteredImages[0];

  const handleTabChange = useCallback((catId: string) => {
    Haptics.selectionAsync();
    setSelectedCategory(catId);
    setCurrentIndex(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  const onMomentumScrollEnd = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIdx = Math.round(offsetX / SCREEN_WIDTH);
    if (newIdx !== currentIndex && newIdx >= 0) {
      setCurrentIndex(newIdx);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [currentIndex]);

  const jumpToThumbnail = useCallback((idx: number) => {
    Haptics.selectionAsync();
    setCurrentIndex(idx);
    flatListRef.current?.scrollToIndex({ index: idx, animated: true });
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Top Header with Close and "৩ / ১২" Counter */}
        <SafeAreaView style={styles.safeHeaderArea}>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.closeBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>

            {/* Counter Pill ("৩ / ১২") */}
            <View style={styles.counterPill}>
              <Text style={styles.counterText}>
                {toBengaliNumber(currentIndex + 1)} / {toBengaliNumber(filteredImages.length)}
              </Text>
            </View>

            <View style={{ width: 40 }} />
          </View>

          {/* Hotel Name Heading */}
          <Text style={styles.hotelHeading} numberOfLines={1}>
            {hotelName}
          </Text>

          {/* Category Tabs (রুম, বাথরুম, বাইরের দৃশ্য, etc.) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
            style={styles.tabsWrapper}
          >
            {CATEGORY_TABS.map((tab) => {
              const count =
                tab.id === "all"
                  ? normalizedImages.length
                  : normalizedImages.filter((img) => img.category === tab.id).length;
              if (tab.id !== "all" && count === 0) return null;

              const isSelected = selectedCategory === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  style={[styles.tabChip, isSelected && styles.tabChipActive]}
                  onPress={() => handleTabChange(tab.id)}
                >
                  <Text style={[styles.tabChipText, isSelected && styles.tabChipTextActive]}>
                    {tab.labelBn} ({toBengaliNumber(count)})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>

        {/* Full-Screen Swipeable Gallery with Pinch-to-Zoom */}
        <FlatList
          ref={flatListRef}
          data={filteredImages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `${item.url}-${index}`}
          onMomentumScrollEnd={onMomentumScrollEnd}
          getItemLayout={(_data, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          renderItem={({ item }) => (
            <View style={styles.slideContainer}>
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                centerContent
                contentContainerStyle={styles.zoomContentContainer}
              >
                <Image
                  source={{ uri: item.url }}
                  style={styles.fullscreenImage}
                  resizeMode="contain"
                />
              </ScrollView>
            </View>
          )}
        />

        {/* Caption & Bottom Thumbnail Strip */}
        <SafeAreaView style={styles.safeFooterArea}>
          {activeImage && (
            <View style={styles.captionBox}>
              <Text style={styles.captionCategory}>
                {getCategoryLabelBn(activeImage.category)}
              </Text>
              <Text style={styles.captionText} numberOfLines={2}>
                {activeImage.caption_bn || activeImage.caption}
              </Text>
            </View>
          )}

          {/* Thumbnail Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailStrip}
          >
            {filteredImages.map((img, idx) => {
              const isSelected = currentIndex === idx;
              return (
                <Pressable
                  key={`thumb-${img.url}-${idx}`}
                  style={[styles.thumbWrapper, isSelected && styles.thumbWrapperActive]}
                  onPress={() => jumpToThumbnail(idx)}
                >
                  <Image source={{ uri: img.url }} style={styles.thumbImage} />
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export function toBengaliNumber(num: number): string {
  const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num).replace(/[0-9]/g, (w) => bnDigits[+w]);
}

function getCategoryLabelBn(cat: string): string {
  switch (cat) {
    case "room":
      return "রুম ও বেডরুম";
    case "bathroom":
      return "বাথরুম ও জাকুজি";
    case "exterior":
      return "বাইরের মনোরম দৃশ্য";
    case "view":
      return "ব্যালকনি ও প্রাকৃতিক ভিউ";
    case "dining":
      return "ডাইনিং ও রেস্তোরাঁ";
    default:
      return "হোটেল ফটো";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  safeHeaderArea: {
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 20 : 0,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  counterPill: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  hotelHeading: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tabsWrapper: {
    paddingBottom: 8,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  tabChipActive: {
    backgroundColor: "#0055F2",
    borderColor: "#3B82F6",
  },
  tabChipText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  tabChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomContentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
  },
  safeFooterArea: {
    backgroundColor: "rgba(0,0,0,0.88)",
    paddingBottom: 10,
  },
  captionBox: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  captionCategory: {
    color: "#60A5FA",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  captionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  thumbnailStrip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  thumbWrapper: {
    width: 54,
    height: 54,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    opacity: 0.55,
  },
  thumbWrapperActive: {
    borderColor: "#3B82F6",
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
});
