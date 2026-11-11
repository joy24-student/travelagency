import { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./useAuth";

const SPLASH_SEEN_KEY = "@app:has_seen_splash_anim";

export const useSplashScreen = () => {
  const [isReady, setIsReady] = useState(false);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const { isAuthenticated, loading } = useAuth();
  const hasInitialized = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const checkFirstLaunchAndInit = async () => {
      try {
        const seen = await AsyncStorage.getItem(SPLASH_SEEN_KEY);
        if (!isMounted) return;

        const firstTime = !seen;
        setIsFirstLaunch(firstTime);

        // If not first launch and auth is not blocking, hide splash immediately
        if (!firstTime && !loading) {
          setIsReady(true);
          setIsSplashVisible(false);
          return;
        }

        // On first launch or when loading completes, cap maximum wait to 800ms
        if (!loading) {
          setIsReady(true);
          if (firstTime) {
            await AsyncStorage.setItem(SPLASH_SEEN_KEY, "true").catch(() => {});
            // Keep splash animation visible briefly (max 800ms) only on first launch
            const timer = setTimeout(() => {
              if (isMounted) setIsSplashVisible(false);
            }, 800);
            return () => clearTimeout(timer);
          } else {
            setIsSplashVisible(false);
          }
        }
      } catch (error) {
        console.error("Error initializing splash check:", error);
        if (isMounted) {
          setIsReady(true);
          setIsSplashVisible(false);
        }
      }
    };

    if (!hasInitialized.current || !loading) {
      hasInitialized.current = true;
      checkFirstLaunchAndInit();
    }

    // Safety fallback: Never keep splash screen visible longer than 1000ms
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsReady(true);
        setIsSplashVisible(false);
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, [loading]);

  const hideSplash = () => {
    setIsSplashVisible(false);
  };

  return {
    isSplashVisible,
    hideSplash,
    isReady,
    isFirstLaunch,
    isAuthenticated,
  };
};
