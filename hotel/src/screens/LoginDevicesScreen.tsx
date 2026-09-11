import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

export function LoginDevicesScreen() {
  const DeviceItem = ({ name, location, time, icon, isCurrent }: any) => (
    <View className="bg-slate-800/40 border border-white/5 p-4 rounded-2xl mb-4 flex-row items-center justify-between">
      <View className="flex-row items-center space-x-4">
        <View className="w-12 h-12 bg-white/5 rounded-xl items-center justify-center">
          <MaterialIcons name={icon} size={24} color={isCurrent ? "#c0c1ff" : "#94a3b8"} />
        </View>
        <View>
          <View className="flex-row items-center space-x-2">
            <Text className="text-white font-bold text-sm">{name}</Text>
            {isCurrent && (
              <View className="bg-emerald-500/20 px-2 py-0.5 rounded">
                <Text className="text-emerald-400 text-[8px] font-bold uppercase">Current</Text>
              </View>
            )}
          </View>
          <Text className="text-[#94a3b8] text-[10px]">{location} • {time}</Text>
        </View>
      </View>
      {!isCurrent && (
        <TouchableOpacity className="p-2">
          <MaterialIcons name="logout" size={20} color="#f87171" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#0b1326]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center space-x-4">
        <TouchableOpacity className="p-1">
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Login Devices</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
        <View className="mb-8">
          <Text className="text-[#94a3b8] text-sm leading-relaxed">
            Review and manage all devices currently logged into your account.
          </Text>
        </View>

        <View className="mb-8">
          <Text className="text-[#c7c4d7] text-xs font-bold uppercase tracking-widest mb-4">Active Devices</Text>
          <DeviceItem
            name="iPhone 13 Pro" location="Dhaka, Bangladesh" time="Active now"
            icon="smartphone" isCurrent={true}
          />
          <DeviceItem
            name="MacBook Pro 16" location="Dhaka, Bangladesh" time="Last active: 2h ago"
            icon="laptop" isCurrent={false}
          />
          <DeviceItem
            name="Chrome on Windows" location="London, UK" time="Last active: May 28"
            icon="desktop-windows" isCurrent={false}
          />
        </View>

        <TouchableOpacity className="bg-red-500/10 border border-red-500/20 py-4 rounded-2xl items-center mb-24">
          <Text className="text-red-400 font-bold">Logout from all other devices</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
