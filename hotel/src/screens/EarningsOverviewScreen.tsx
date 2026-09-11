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

export function EarningsOverviewScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#0f111a]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="p-4 flex-row items-center justify-between">
        <View className="flex-row items-center space-x-4">
          <TouchableOpacity className="p-2 bg-white/5 rounded-full">
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-white">Earnings Overview</Text>
        </View>
        <TouchableOpacity className="p-2 bg-white/5 rounded-full">
          <MaterialIcons name="calendar-today" size={22} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Time Selector */}
        <TouchableOpacity className="mb-6 bg-[#1a1c2e] p-3 rounded-xl border border-white/5 flex-row justify-between items-center">
          <Text className="text-sm font-medium text-white">This Month</Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {/* Total Earnings Card */}
        <View className="bg-[#1a1c2e] p-5 rounded-[32px] mb-6 border border-white/5">
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-sm text-[#94a3b8] mb-1">Total Earnings</Text>
              <Text className="text-3xl font-bold text-white">$24,850</Text>
              <View className="flex-row items-center mt-1">
                <MaterialIcons name="trending-up" size={14} color="#22c55e" />
                <Text className="text-xs text-[#22c55e] font-bold ml-1">24.5% </Text>
                <Text className="text-[#94a3b8] text-[10px]">vs last month</Text>
              </View>
            </View>
            <TouchableOpacity className="px-3 py-1 bg-white/10 rounded-lg">
              <Text className="text-white text-xs font-medium">Details</Text>
            </TouchableOpacity>
          </View>

          {/* Simple Chart Visualization */}
          <View className="h-32 w-full mt-4 justify-end">
             <View className="flex-row items-end justify-between h-24">
                {[30, 45, 35, 60, 50, 80, 70, 90, 85].map((h, i) => (
                   <View key={i} className="w-1.5 bg-[#7c3aed]/20 rounded-full h-full justify-end">
                      <View className="w-full bg-[#7c3aed] rounded-full" style={{ height: `${h}%` }} />
                   </View>
                ))}
             </View>
             <View className="flex-row justify-between mt-2">
                <Text className="text-[10px] text-gray-500 font-medium">1 May</Text>
                <Text className="text-[10px] text-gray-500 font-medium">15 May</Text>
                <Text className="text-[10px] text-gray-500 font-medium">29 May</Text>
             </View>
          </View>
        </View>

        {/* Earnings Breakdown */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-semibold text-white">Earnings Breakdown</Text>
            <TouchableOpacity>
              <Text className="text-indigo-400 text-sm">View All</Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            <BreakdownItem icon="king-bed" label="Room Revenue" value="$18,250" trend="+18.6%" color="#818cf8" iconBg="bg-indigo-500/20" />
            <BreakdownItem icon="restaurant" label="Restaurant Revenue" value="$4,850" trend="+12.4%" color="#fb923c" iconBg="bg-orange-500/20" />
            <BreakdownItem icon="spa" label="Other Services" value="$1,750" trend="+8.7%" color="#2dd4bf" iconBg="bg-teal-500/20" />
          </View>
        </View>

        {/* Recent Transactions */}
        <View className="mb-24">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-semibold text-white">Recent Transactions</Text>
            <TouchableOpacity>
              <Text className="text-indigo-400 text-sm">View All</Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            <TransactionItem id="#R-88211" title="Booking #R-88211" date="26 May 2024, 10:30 AM" amount="+ $240.00" status="Completed" />
            <TransactionItem id="Bill-12" title="Restaurant Bill" date="26 May 2024, 01:15 PM" amount="+ $85.00" status="Completed" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BreakdownItem({ icon, label, value, trend, color, iconBg }: any) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center space-x-3">
        <View className={`w-10 h-10 rounded-xl ${iconBg} items-center justify-center`}>
          <MaterialIcons name={icon} size={20} color={color} />
        </View>
        <Text className="text-sm font-medium text-white">{label}</Text>
      </View>
      <View className="items-end">
        <Text className="text-sm font-bold text-white">{value}</Text>
        <Text className="text-[10px] text-green-500">↑ {trend}</Text>
      </View>
    </View>
  );
}

function TransactionItem({ title, date, amount, status }: any) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center space-x-3">
        <View className="w-10 h-10 rounded-xl bg-indigo-500/20 items-center justify-center">
          <MaterialIcons name="receipt-long" size={20} color="#818cf8" />
        </View>
        <View>
          <Text className="text-sm font-medium text-white">{title}</Text>
          <Text className="text-[10px] text-[#94a3b8]">{date}</Text>
        </View>
      </View>
      <View className="items-end">
        <Text className="text-sm font-bold text-white">{amount}</Text>
        <View className="px-2 py-0.5 bg-green-500/20 rounded-full mt-1">
          <Text className="text-[10px] text-green-400">{status}</Text>
        </View>
      </View>
    </View>
  );
}
