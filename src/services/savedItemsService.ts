import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { toast } from "../components/ui/Toast";
import { supabase } from "../utils/supabase";

export interface SavedItem {
  id: string;
  type: "hotel" | "flight" | "train" | "package" | "post" | "other";
  title: string;
  subtitle?: string;
  destination?: string;
  price?: number | string;
  totalPriceWithTax?: number | string;
  image_url?: string;
  rating?: number | string;
  route?: string;
  savedAt: string;
  metadata?: Record<string, any>;
}

const STORAGE_KEY = "@travel:saved_items_v2";

type SavedListener = (items: SavedItem[]) => void;

class SavedItemsService {
  private cache: SavedItem[] = [];
  private isLoaded = false;
  private listeners: Set<SavedListener> = new Set();

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        this.cache = JSON.parse(data);
      } else {
        // Seed default sample saved items if first time
        this.cache = [
          {
            id: "seed-pkg-1",
            type: "package",
            title: "কক্সবাজার ৩ দিন ২ রাত লাক্সারি হলিডে",
            subtitle: "সি ভিউ রুম, সকালের নাস্তা ও এয়ারপোর্ট পিকআপ",
            destination: "Cox's Bazar",
            price: 12500,
            totalPriceWithTax: 13750,
            image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600",
            rating: 4.9,
            route: "/screens/packages",
            savedAt: new Date().toISOString(),
          },
          {
            id: "seed-hotel-1",
            type: "hotel",
            title: "গ্র্যান্ড সুলতান টি রিসোর্ট",
            subtitle: "৫-স্টার লাক্সারি স্টে ও স্পা",
            destination: "Sreemangal, Sylhet",
            price: 18000,
            totalPriceWithTax: 19800,
            image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600",
            rating: 4.8,
            route: "/screens/search-stays",
            savedAt: new Date().toISOString(),
          },
        ];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
      }
      this.isLoaded = true;
      this.notify();
    } catch (e) {
      console.warn("[SavedItemsService] init error:", e);
      this.isLoaded = true;
    }
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener([...this.cache]);
      } catch (err) {
        console.warn("[SavedItemsService] listener error:", err);
      }
    });
  }

  subscribe(listener: SavedListener): () => void {
    this.listeners.add(listener);
    if (this.isLoaded) {
      listener([...this.cache]);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  async getSavedItems(): Promise<SavedItem[]> {
    if (!this.isLoaded) {
      await this.init();
    }
    return [...this.cache];
  }

  isSaved(id: string): boolean {
    return this.cache.some((item) => item.id === id);
  }

  async saveItem(item: Omit<SavedItem, "savedAt">): Promise<void> {
    if (!this.isLoaded) await this.init();

    const exists = this.cache.some((existing) => existing.id === item.id);
    if (!exists) {
      const newItem: SavedItem = {
        ...item,
        savedAt: new Date().toISOString(),
      };
      this.cache = [newItem, ...this.cache];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
      this.notify();
    }
  }

  async removeSavedItem(id: string): Promise<void> {
    if (!this.isLoaded) await this.init();

    this.cache = this.cache.filter((item) => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    this.notify();
  }

  /**
   * Toggles save state for an item, provides haptic feedback,
   * and fires toast notification with "সংরক্ষিত হয়েছে · দেখুন" linking to /screens/saved.
   */
  async toggleSaveItem(
    item: Omit<SavedItem, "savedAt">,
    showFeedback = true
  ): Promise<boolean> {
    if (!this.isLoaded) await this.init();

    const alreadySaved = this.isSaved(item.id);

    if (alreadySaved) {
      await this.removeSavedItem(item.id);
      if (showFeedback) {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
        toast.info("সংরক্ষণ তালিকা থেকে সরানো হয়েছে");
      }
      return false;
    } else {
      await this.saveItem(item);
      if (showFeedback) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        toast.success("সংরক্ষিত হয়েছে", {
          action: {
            label: "দেখুন",
            onPress: () => {
              try {
                router.push("/screens/saved" as any);
              } catch (navErr) {
                console.warn("[SavedItemsService] navigation error:", navErr);
              }
            },
          },
        });
      }
      return true;
    }
  }
}

export const savedItemsService = new SavedItemsService();
