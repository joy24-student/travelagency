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

export function ReportsAnalyticsScreen() {
  const KPICard = ({ label, value, trend }: any) => (
    <View className="bg-white/5 border border-white/10 rounded-xl p-3 flex-1 mx-0.5">
      <Text className="text-[10px] text-gray-400 mb-1">{label}</Text>
      <Text className="text-lg font-bold text-white">{value}</Text>
      <View className="flex-row items-center mt-1">
        <MaterialIcons name="arrow-upward" size={12} color="#4ade80" />
        <Text className="text-[10px] text-emerald-400 ml-0.5">{trend}</Text>
      </View>
    </View>
  );

  const RevenueSource = ({ label, value, percentage, color }: any) => (
    <View className="flex-row items-center space-x-4 mb-5">
      <Text className="text-xs text-gray-400 w-28">{label}</Text>
      <View className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <View className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }} />
      </View>
      <View className="flex-row space-x-4 w-20 justify-end">
        <Text className="text-xs font-medium text-white">{value}</Text>
        <Text className="text-xs text-gray-500">{percentage}%</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#0b0e14]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-6 py-2 flex-row justify-between items-center">
        <View className="flex-row items-center space-x-4">
          <TouchableOpacity className="p-1">
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white">Reports & Analytics</Text>
        </View>
        <TouchableOpacity className="p-2 bg-gray-600/20 rounded-lg">
          <MaterialIcons name="more-vert" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
        {/* Time Selector */}
        <View className="mb-6">
          <TouchableOpacity className="inline-flex flex-row items-center bg-slate-800/50 px-3 py-1.5 rounded-lg border border-white/5 self-start">
            <Text className="text-sm font-medium text-gray-300 mr-2">This Month</Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* KPI Grid */}
        <View className="flex-row justify-between mb-6">
          <KPICard label="Revenue" value="$24,850" trend="18.6%" />
          <KPICard label="Occupancy" value="72%" trend="8.2%" />
          <KPICard label="ADR" value="$120" trend="12.5%" />
        </View>

        <View className="w-1/3 mb-8">
           <KPICard label="RevPAR" value="$86" trend="15.3%" />
        </View>

        {/* Revenue Trend Chart */}
        <View className="mb-10">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-md font-semibold text-white">Revenue Trend</Text>
            <TouchableOpacity>
              <Text className="text-blue-500 text-xs font-medium">View Full Report</Text>
            </TouchableOpacity>
          </View>

          <View className="h-48 w-full mt-4 bg-white/5 rounded-3xl p-4 justify-end">
             {/* Simplified Chart Implementation */}
             <View className="flex-row items-end justify-between h-32 px-2">
                {[40, 60, 45, 80, 55, 90, 75, 100].map((h, i) => (
                   <View key={i} className="w-2 bg-[#a855f7]/20 rounded-full h-full justify-end">
                      <LinearGradient
                        colors={['#a855f7', '#d8b4fe']}
                        className="w-full rounded-full"
                        style={{ height: `${h}%` }}
                      />
                   </View>
                ))}
             </View>
             <View className="flex-row justify-between mt-4">
                {['1 May', '8 May', '15 May', '22 May', '29 May'].map((d) => (
                  <Text key={d} className="text-[#9ca3af] text-[10px]">{d}</Text>
                ))}
             </View>
          </View>
        </View>

        {/* Top Revenue Sources */}
        <View className="mb-24">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-md font-semibold text-white">Top Revenue Sources</Text>
            <TouchableOpacity>
              <Text className="text-blue-500 text-xs font-medium">View All</Text>
            </TouchableOpacity>
          </View>

          <RevenueSource label="Direct Bookings" value="$12,450" percentage={50} color="#6366f1" />
          <RevenueSource label="OTA Bookings" value="$8,250" percentage={33} color="#a855f7" />
          <RevenueSource label="Walk-in" value="$2,850" percentage={11} color="#ec4899" />
          <RevenueSource label="Corporate" value="$1,300" percentage={6} color="#f97316" />
        </View>
      </ScrollView>

      {/* System Performance Banner */}
      <View className="absolute bottom-20 left-6 right-6">
        <View className="bg-emerald-950/20 border border-emerald-500/20 px-4 py-3 flex-row items-center justify-between rounded-xl">
          <View className="flex-row items-center space-x-3">
            <View className="w-2 h-2 bg-emerald-400 rounded-full" />
            <Text className="text-xs font-medium text-emerald-400">System Performance: Optimal</Text>
          </View>
          <MaterialIcons name="trending-up" size={16} color="#4ade80" />
        </View>
      </View>

      {/* FAB */}
      <TouchableOpacity className="absolute bottom-32 right-6 w-12 h-12 bg-indigo-600 rounded-full items-center justify-center shadow-lg">
        <MaterialIcons name="add" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
