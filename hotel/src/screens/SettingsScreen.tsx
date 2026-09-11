import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  StatusBar,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

export function SettingsScreen() {
  const [is2FAEnabled, setIs2FAEnabled] = useState(true);

  const SettingItem = ({
    icon,
    label,
    subtitle,
    onPress,
    iconBgColor,
    iconColor,
    showArrow = true,
    rightElement,
  }: any) => (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center p-4 border-b border-[#1e293b] active:bg-slate-800"
    >
      <View
        className={`w-10 h-10 rounded-xl ${iconBgColor} items-center justify-center mr-4`}
      >
        <MaterialIcons name={icon} size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-white">{label}</Text>
        {subtitle && (
          <Text className="text-[10px] text-[#94a3b8]">{subtitle}</Text>
        )}
      </View>
      {rightElement ? (
        rightElement
      ) : (
        showArrow && (
          <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
        )
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#0b1121]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-5 py-4 flex-row items-center">
        <TouchableOpacity className="p-1 mr-4">
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Settings</Text>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Hotel Settings Section */}
        <View className="mb-6">
          <Text className="text-[#94a3b8] text-xs font-semibold uppercase tracking-wider mb-3">
            Hotel Settings
          </Text>
          <View className="bg-[#141c31] rounded-2xl overflow-hidden">
            <SettingItem
              icon="business"
              label="Hotel Profile"
              subtitle="Edit your hotel information"
              iconBgColor="bg-blue-500/20"
              iconColor="#3b82f6"
            />
            <SettingItem
              icon="policy"
              label="Policies & Rules"
              subtitle="Manage hotel policies"
              iconBgColor="bg-purple-500/20"
              iconColor="#a855f7"
            />
            <SettingItem
              icon="pool"
              label="Amenities & Facilities"
              subtitle="Manage amenities"
              iconBgColor="bg-indigo-500/20"
              iconColor="#6366f1"
            />
            <SettingItem
              icon="payment"
              label="Payment Settings"
              subtitle="Manage payment methods"
              iconBgColor="bg-blue-600/20"
              iconColor="#60a5fa"
            />
            <SettingItem
              icon="notifications"
              label="Notification Settings"
              subtitle="Manage notifications"
              iconBgColor="bg-pink-500/20"
              iconColor="#ec4899"
            />
          </View>
        </View>

        {/* Account & Security Section */}
        <View className="mb-6">
          <Text className="text-[#94a3b8] text-xs font-semibold uppercase tracking-wider mb-3">
            Account & Security
          </Text>
          <View className="bg-[#141c31] rounded-2xl overflow-hidden">
            <SettingItem
              icon="lock"
              label="Change Password"
              iconBgColor="bg-slate-700/50"
              iconColor="white"
            />
            <SettingItem
              icon="security"
              label="Two-Factor Authentication"
              iconBgColor="bg-slate-700/50"
              iconColor="white"
              showArrow={false}
              rightElement={
                <Switch
                  value={is2FAEnabled}
                  onValueChange={setIs2FAEnabled}
                  trackColor={{ true: '#7c3aed', false: '#334155' }}
                  thumbColor="white"
                />
              }
            />
            <SettingItem
              icon="devices"
              label="Login Devices"
              iconBgColor="bg-slate-700/50"
              iconColor="white"
            />
            <SettingItem
              icon="backup"
              label="Backup & Restore"
              iconBgColor="bg-slate-700/50"
              iconColor="white"
            />
          </View>
        </View>

        {/* Support Section */}
        <View className="mb-6">
          <Text className="text-[#94a3b8] text-xs font-semibold uppercase tracking-wider mb-3">
            Support
          </Text>
          <View className="bg-[#141c31] rounded-2xl overflow-hidden">
            <SettingItem
              icon="help-outline"
              label="Help Center"
              iconBgColor="bg-slate-700/50"
              iconColor="white"
            />
            <SettingItem
              icon="chat-bubble-outline"
              label="Contact Support"
              iconBgColor="bg-slate-700/50"
              iconColor="white"
            />
          </View>
        </View>

        {/* App Version */}
        <View className="text-center py-6 mb-24">
          <Text className="text-[10px] text-[#94a3b8] uppercase tracking-widest font-semibold opacity-60 text-center">
            LuxeStay Management System v2.4.0
          </Text>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute right-6 bottom-24 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        style={{
          backgroundColor: '#7c3aed',
          shadowColor: '#7c3aed',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
        }}
      >
        <MaterialIcons name="add" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
