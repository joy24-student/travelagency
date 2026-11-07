import React, { useEffect } from "react";
import { router } from "expo-router";
import { CommunitySpecializedScreen } from "../../src/screens/CommunityScreen";
import { screens } from "../../src/data/screens";

const communityScreen = screens.find(
  (s) => s.slug === "travel-community-posts" || s.slug === "community",
) || screens[0];

/**
 * Post Action Route / Creation Portal
 * 
 * In this architecture, the bottom tab bar shows 5 primary tabs:
 * (Home, Messages, Community, My Trips, Account).
 * 
 * The `post` route is the dedicated Action Route for creating and publishing
 * travel moments, stories, and reviews. When accessed directly (e.g. from an
 * external deep link, camera upload button, or /post shortcut), it seamlessly
 * routes to the Community Hub with the Create Post modal automatically engaged.
 */
export default function PostActionRoute() {
  useEffect(() => {
    // Open community feed directly with the Post Composer modal active
    router.replace({
      pathname: "/(tabs)/community",
      params: { composer: "open", createPost: "true" },
    });
  }, []);

  return <CommunitySpecializedScreen screen={communityScreen} />;
}
