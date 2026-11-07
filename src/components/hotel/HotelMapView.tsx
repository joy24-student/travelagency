import React, { useState, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import * as Haptics from "expo-haptics";
import { CatalogHotel } from "../../data/hotelCatalog";
import { toBengaliNumber } from "./HotelGalleryModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface HotelMapViewProps {
  hotels: CatalogHotel[];
  selectedHotelId?: string | null;
  onSelectHotel: (hotel: CatalogHotel) => void;
  onOpenHotelRooms: (hotel: CatalogHotel) => void;
  currencySymbol?: string;
}

const REGION_CENTERS: { [city: string]: { lat: number; lng: number; zoom: number } } = {
  All: { lat: 23.685, lng: 90.3563, zoom: 7 },
  "Cox's Bazar": { lat: 21.35, lng: 92.01, zoom: 11 },
  Dhaka: { lat: 23.78, lng: 90.40, zoom: 12 },
  "Sajek Valley": { lat: 23.382, lng: 92.2938, zoom: 12 },
  Sylhet: { lat: 24.935, lng: 91.8687, zoom: 12 },
  Sreemangal: { lat: 24.321, lng: 91.734, zoom: 12 },
};

export const HotelMapView: React.FC<HotelMapViewProps> = ({
  hotels,
  selectedHotelId,
  onSelectHotel,
  onOpenHotelRooms,
  currencySymbol = "৳",
}) => {
  const [activeHotelId, setActiveHotelId] = useState<string | null>(
    selectedHotelId || (hotels[0]?.id ?? null)
  );
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const webViewRef = useRef<WebView>(null);

  const activeHotel = useMemo(() => {
    return hotels.find((h) => h.id === activeHotelId) || hotels[0] || null;
  }, [hotels, activeHotelId]);

  // Handle messages from Leaflet map
  const handleMapMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "HOTEL_CLICKED") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setActiveHotelId(data.hotelId);
          const matched = hotels.find((h) => h.id === data.hotelId);
          if (matched) {
            onSelectHotel(matched);
          }
        }
      } catch (e) {
        console.warn("[HotelMapView] Message error:", e);
      }
    },
    [hotels, onSelectHotel]
  );

  // Region switcher
  const handleFlyToRegion = useCallback((regionName: string) => {
    Haptics.selectionAsync();
    setSelectedRegion(regionName);
    const target = REGION_CENTERS[regionName] || REGION_CENTERS.All;
    const script = `
      if (window.map) {
        window.map.flyTo([${target.lat}, ${target.lng}], ${target.zoom}, { duration: 1.2 });
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(script);
  }, []);

  // HTML content for Leaflet Map with Price Pins and MarkerCluster
  const leafletHtml = useMemo(() => {
    const hotelMarkersData = hotels.map((h) => ({
      id: h.id,
      name: h.name,
      city: h.city,
      price: h.base_price,
      lat: h.latitude || 21.42,
      lng: h.longitude || 91.98,
      rating: h.average_rating || h.star_rating || 4.8,
      image: h.image_url || (h.images && h.images[0]) || "",
      landmarks: h.landmarks_summary_bn || h.landmarks_summary_en || "",
    }));

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
        <style>
          html, body, #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: #E2E8F0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          /* Custom Price Bubble Pin */
          .price-pin {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0055F2;
            color: #FFFFFF;
            padding: 5px 9px;
            border-radius: 14px;
            font-size: 12px;
            font-weight: 800;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0, 85, 242, 0.45);
            border: 2px solid #FFFFFF;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          .price-pin:hover, .price-pin.active {
            background: #0F172A;
            transform: scale(1.15);
            box-shadow: 0 6px 16px rgba(15, 23, 42, 0.5);
            z-index: 1000 !important;
          }
          .price-pin::after {
            content: '';
            position: absolute;
            bottom: -6px;
            left: 50%;
            transform: translateX(-50%);
            border-width: 6px 5px 0 5px;
            border-style: solid;
            border-color: #0055F2 transparent transparent transparent;
          }
          .price-pin.active::after {
            border-color: #0F172A transparent transparent transparent;
          }
          /* Cluster Styling */
          .custom-cluster {
            background: #0055F2;
            color: #FFFFFF;
            border-radius: 50%;
            font-weight: 900;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0, 85, 242, 0.4);
            border: 3px solid rgba(255, 255, 255, 0.9);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const hotelsData = ${JSON.stringify(hotelMarkersData)};
          const currency = "${currencySymbol}";

          const map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([23.685, 90.3563], 7);
          window.map = map;

          // OpenStreetMap Tiles (Clean CartoDB Positron style)
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
          }).addTo(map);

          // Marker Cluster Group
          const markersCluster = L.markerClusterGroup({
            maxClusterRadius: 50,
            iconCreateFunction: function(cluster) {
              const count = cluster.getChildCount();
              return L.divIcon({
                html: '<div class="custom-cluster" style="width:38px;height:38px;font-size:13px;">' + count + '</div>',
                className: '',
                iconSize: [38, 38]
              });
            }
          });

          const markerMap = {};

          hotelsData.forEach(function(hotel) {
            const formattedPrice = currency + Number(hotel.price).toLocaleString();
            const iconHtml = '<div id="pin-' + hotel.id + '" class="price-pin">' + formattedPrice + '</div>';
            
            const customIcon = L.divIcon({
              className: 'price-pin-container',
              html: iconHtml,
              iconSize: [68, 28],
              iconAnchor: [34, 30]
            });

            const marker = L.marker([hotel.lat, hotel.lng], { icon: customIcon });
            
            marker.on('click', function() {
              // Highlight pin
              document.querySelectorAll('.price-pin').forEach(p => p.classList.remove('active'));
              const el = document.getElementById('pin-' + hotel.id);
              if (el) el.classList.add('active');

              // Send back to React Native
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'HOTEL_CLICKED',
                  hotelId: hotel.id
                }));
              }
            });

            markersCluster.addLayer(marker);
            markerMap[hotel.id] = marker;
          });

          map.addLayer(markersCluster);

          // Fit bounds if hotels present
          if (hotelsData.length > 0) {
            const bounds = L.latLngBounds(hotelsData.map(h => [h.lat, h.lng]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
          }
        </script>
      </body>
      </html>
    `;
  }, [hotels, currencySymbol]);

  return (
    <View style={styles.container}>
      {/* Top Region Filters */}
      <View style={styles.regionSelectorBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.regionScroll}
        >
          {Object.keys(REGION_CENTERS).map((region) => {
            const isSelected = selectedRegion === region;
            const count =
              region === "All"
                ? hotels.length
                : hotels.filter((h) => h.city.toLowerCase().includes(region.toLowerCase())).length;

            return (
              <Pressable
                key={region}
                style={[styles.regionChip, isSelected && styles.regionChipActive]}
                onPress={() => handleFlyToRegion(region)}
              >
                <Text style={[styles.regionChipText, isSelected && styles.regionChipTextActive]}>
                  {region === "All" ? "সব এলাকা" : region} ({toBengaliNumber(count)})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* The Leaflet Map WebView */}
      <View style={styles.mapWrapper}>
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html: leafletHtml }}
          onMessage={handleMapMessage}
          style={styles.webView}
          scrollEnabled={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>

      {/* Floating Bottom Hotel Preview Card */}
      {activeHotel && (
        <View style={styles.floatingCardWrapper}>
          <Pressable
            style={styles.previewCard}
            onPress={() => onOpenHotelRooms(activeHotel)}
          >
            <Image
              source={{ uri: activeHotel.image_url || activeHotel.images?.[0] }}
              style={styles.previewImage}
            />

            <View style={styles.previewInfoCol}>
              <View style={styles.previewTitleRow}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {activeHotel.name}
                </Text>
                <View style={styles.previewRatingBadge}>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                  <Text style={styles.previewRatingText}>
                    {activeHotel.average_rating || activeHotel.star_rating || "4.8"}★
                  </Text>
                </View>
              </View>

              <Text style={styles.previewLocation} numberOfLines={1}>
                📍 {activeHotel.city}, {activeHotel.country || "Bangladesh"}
              </Text>

              {/* Landmark Distance Highlight */}
              {(activeHotel.landmarks_summary_bn || activeHotel.landmarks_summary_en) && (
                <View style={styles.previewLandmarkBox}>
                  <Text style={styles.previewLandmarkText} numberOfLines={1}>
                    🌊 {activeHotel.landmarks_summary_bn || activeHotel.landmarks_summary_en}
                  </Text>
                </View>
              )}

              {/* Bottom Price & Action Button */}
              <View style={styles.previewBottomRow}>
                <View>
                  <Text style={styles.previewPriceLabel}>প্রতি রাত শুরু</Text>
                  <Text style={styles.previewPrice}>
                    {currencySymbol}{Number(activeHotel.base_price).toLocaleString()}
                  </Text>
                </View>

                <Pressable
                  style={styles.previewActionBtn}
                  onPress={() => onOpenHotelRooms(activeHotel)}
                >
                  <Text style={styles.previewActionBtnText}>রুম ও বিস্তারিত</Text>
                  <Ionicons name="arrow-forward" size={12} color="#FFFFFF" style={{ marginStart: 3 }} />
                </Pressable>
              </View>
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    position: "relative",
  },
  regionSelectorBar: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  regionScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  regionChip: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 4px rgba(15, 23, 42, 0.1)" } : {}),
  },
  regionChipActive: {
    backgroundColor: "#0055F2",
    borderColor: "#0055F2",
  },
  regionChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  regionChipTextActive: {
    color: "#FFFFFF",
  },
  mapWrapper: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  floatingCardWrapper: {
    position: "absolute",
    bottom: 84, // elevated so it sits nicely above the List/Map toggle
    left: 14,
    right: 14,
    zIndex: 20,
  },
  previewCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 6px 12px rgba(15, 23, 42, 0.15)" } : {}),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  previewImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  previewInfoCol: {
    flex: 1,
    marginStart: 10,
    justifyContent: "space-between",
  },
  previewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
    flex: 1,
    marginEnd: 4,
  },
  previewRatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewRatingText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B45309",
    marginStart: 2,
  },
  previewLocation: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  previewLandmarkBox: {
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginTop: 3,
  },
  previewLandmarkText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0369A1",
  },
  previewBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  previewPriceLabel: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "600",
  },
  previewPrice: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0055F2",
  },
  previewActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0055F2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  previewActionBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
});
