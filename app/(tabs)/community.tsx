import { CommunitySpecializedScreen } from "../../src/screens/CommunityScreen";
import { screens } from "../../src/data/screens";

export default function CommunityTab() {
  const screen = screens.find((item) => item.slug === "community") ?? screens[0];
  return <CommunitySpecializedScreen screen={screen} />;
}
