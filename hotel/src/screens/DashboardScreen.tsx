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
import { LinearGradient } from 'expo-linear-gradient';

export function DashboardScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#0b1326]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4">
        <View>
          <Text className="text-2xl font-bold text-white">Dashboard</Text>
          <Text className="text-[#94a3b8] text-xs">Hotel performance insights</Text>
        </View>
        <TouchableOpacity className="w-10 h-10 bg-white/10 rounded-xl items-center justify-center">
          <MaterialIcons name="notifications-none" size={22} color="white" />
          <View className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#0b1326]" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Total Earnings Hero Card */}
        <LinearGradient
          colors={['#7c3aed', '#4f46e5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-[32px] p-6 mb-6"
        >
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">
                Total Earnings
              </Text>
              <Text className="text-white text-3xl font-bold">$24,850</Text>
            </View>
            <View className="bg-white/20 p-2 rounded-xl">
              <MaterialIcons name="trending-up" size={24} color="white" />
            </View>
          </View>
          <View className="flex-row items-center">
            <Text className="text-white text-sm font-medium">+24.5% </Text>
            <Text className="text-white/60 text-xs">higher than last month</Text>
          </View>
        </LinearGradient>

        {/* Quick Stats Grid */}
        <View className="flex-row flex-wrap justify-between mb-6">
          <View className="w-[48%] bg-[#121827] border border-white/5 rounded-3xl p-5 mb-4">
            <Text className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-widest mb-2">Revenue</Text>
            <Text className="text-white text-xl font-bold mb-1">$24,850</Text>
            <Text className="text-[#a78bfa] text-xs font-bold">+24.5%</Text>
          </View>
          <View className="w-[48%] bg-[#121827] border border-white/5 rounded-3xl p-5 mb-4">
            <Text className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-widest mb-2">Occupancy</Text>
            <Text className="text-white text-xl font-bold mb-1">72%</Text>
            <Text className="text-[#34d399] text-xs font-bold">+8.2%</Text>
          </View>
          <View className="w-[48%] bg-[#121827] border border-white/5 rounded-3xl p-5 mb-4">
            <Text className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-widest mb-2">ADR</Text>
            <Text className="text-white text-xl font-bold mb-1">$120</Text>
            <Text className="text-[#fbbf24] text-xs font-bold">+12.5%</Text>
          </View>
          <View className="w-[48%] bg-[#121827] border border-white/5 rounded-3xl p-5 mb-4">
            <Text className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-widest mb-2">RevPAR</Text>
            <Text className="text-white text-xl font-bold mb-1">$86</Text>
            <Text className="text-[#6366f1] text-xs font-bold">+15.3%</Text>
          </View>
        </View>

        {/* Room Availability */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-base font-bold">Room Availability</Text>
          <TouchableOpacity>
            <Text className="text-[#818cf8] text-xs font-bold">View All</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between mb-8">
          {[
            { label: 'Total', value: '70', color: '#6366f1' },
            { label: 'Avail', value: '18', color: '#10b981' },
            { label: 'Occu', value: '35', color: '#f59e0b' },
            { label: 'Maint', value: '5', color: '#8b5cf6' },
          ].map((item, index) => (
            <View key={index} className="bg-[#121827] rounded-2xl p-4 w-[22%] items-center">
              <View className="w-1 h-4 rounded-full mb-2" style={{ backgroundColor: item.color }} />
              <Text className="text-[#94a3b8] text-[8px] font-bold uppercase mb-1">{item.label}</Text>
              <Text className="text-white text-base font-bold" style={{ color: item.color }}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Performance Summary Chart Placeholder */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-base font-bold">Performance Summary</Text>
          <MaterialIcons name="more-horiz" size={20} color="#94a3b8" />
        </View>

        <View className="bg-[#121827] border border-white/5 rounded-[32px] p-6 mb-24">
          <View className="flex-row justify-between items-end h-40">
            {[40, 70, 45, 90, 65, 80, 100].map((height, i) => (
              <View key={i} className="w-2 bg-[#7c3aed]/20 rounded-full h-full justify-end">
                <LinearGradient
                  colors={['#7c3aed', '#a78bfa']}
                  style={{ height: `${height}%`, width: '100%', borderRadius: 4 }}
                />
              </View>
            ))}
          </View>
          <View className="flex-row justify-between mt-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <Text key={day} className="text-[#94a3b8] text-[10px] font-medium">{day}</Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
