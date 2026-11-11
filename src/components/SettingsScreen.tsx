import React from "react";
import { SettingsScreen as MainSettingsScreen } from "../screens/SettingsScreen";

export interface SettingsScreenProps {
  title?: string;
}

export function SettingsScreen(props: SettingsScreenProps) {
  return <MainSettingsScreen />;
}

export default SettingsScreen;
