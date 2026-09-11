import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export function HousekeepingScreen() {
  const OverviewCard = ({ label, value, color, borderColor }: any) => (
    <View className={`bg-[#1e293b]/40 border-l-4 rounded-xl p-2 h-16 justify-between flex-1 mx-0.5`} style={{ borderLeftColor: borderColor }}>
      <Text className={`text-[9px] font-medium ${color}`}>{label}</Text>
      <Text className="text-xl font-bold text-white">{value}</Text>
    </View>
  );

  const TaskItem = ({ room, type, status, time, statusColor, statusBg, icon, iconBg, iconColor }: any) => (
    <TouchableOpacity className="bg-[#1e293b]/40 border border-white/5 rounded-2xl p-4 flex-row items-center space-x-4 mb-3">
      <View className={`w-10 h-10 ${iconBg} rounded-xl items-center justify-center`}>
        <MaterialIcons name={icon} size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="text-xs font-bold text-white">{room}</Text>
            <Text className="text-[10px] text-slate-400">{type}</Text>
          </View>
          <View className="items-end space-y-1">
            <View className={`px-2 py-0.5 rounded ${statusBg} flex-row items-center`}>
              <Text className={`text-[9px] font-bold ${statusColor}`}>{status}</Text>
              <MaterialIcons name="keyboard-arrow-down" size={10} color={statusColor} />
            </View>
            <Text className="text-[9px] text-slate-500">{time}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#020617]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-6 py-4 flex-row justify-between items-center">
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity className="p-2 bg-slate-800/50 rounded-lg">
            <MaterialIcons name="arrow-back" size={20} color="#cbd5e1" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white">Housekeeping</Text>
        </View>
        <TouchableOpacity className="relative">
          <View className="p-2 bg-slate-800/50 rounded-lg">
            <MaterialIcons name="notifications-none" size={20} color="#cbd5e1" />
          </View>
          <View className="absolute -top-1 -right-1 bg-red-500 text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-[#020617]">
            <Text className="text-white text-[8px] font-bold">3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Today Overview */}
        <View className="mt-4">
          <View className="flex-row justify-between items-end mb-4">
            <Text className="text-sm font-semibold text-white">Today Overview</Text>
            <Text className="text-[10px] text-slate-400">01 June, 2024</Text>
          </View>
          <View className="flex-row justify-between">
            <OverviewCard label="Total Rooms" value="70" color="text-blue-400" borderColor="#3b82f6" />
            <OverviewCard label="Cleaned" value="32" color="text-emerald-400" borderColor="#10b981" />
            <OverviewCard label="In Progress" value="18" color="text-orange-400" borderColor="#f59e0b" />
            <OverviewCard label="Pending" value="20" color="text-purple-400" borderColor="#8b5cf6" />
          </View>
        </View>

        {/* Cleaning Tasks */}
        <View className="mt-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-sm font-semibold text-white">Cleaning Tasks</Text>
            <TouchableOpacity>
              <Text className="text-[11px] text-indigo-400 font-medium">View All</Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-3 pb-24">
            <TaskItem
              room="101 Deluxe Room" type="Stayover" status="Cleaned" time="09:30 AM"
              statusColor="text-emerald-400" statusBg="bg-emerald-500/10"
              icon="apartment" iconBg="bg-blue-500/10" iconColor="#3b82f6"
            />
            <TaskItem
              room="102 Standard Room" type="Check-out" status="In Progress" time="10:15 AM"
              statusColor="text-orange-400" statusBg="bg-orange-500/10"
              icon="bed" iconBg="bg-purple-500/10" iconColor="#a855f7"
            />
            <TaskItem
              room="103 Suite Room" type="Stayover" status="Pending" time="11:00 AM"
              statusColor="text-purple-400" statusBg="bg-purple-500/10"
              icon="access-time" iconBg="bg-orange-500/10" iconColor="#f97316"
            />
            <TaskItem
              room="104 Family Room" type="Check-out" status="Pending" time="11:30 AM"
              statusColor="text-purple-400" statusBg="bg-purple-500/10"
              icon="people" iconBg="bg-orange-500/10" iconColor="#f97316"
            />
             <TaskItem
              room="105 Executive Room" type="Stayover" status="Cleaned" time="09:45 AM"
              statusColor="text-emerald-400" statusBg="bg-emerald-500/10"
              icon="check" iconBg="bg-green-500/10" iconColor="#10b981"
            />
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity className="absolute bottom-24 right-6 w-12 h-12 bg-indigo-600 rounded-2xl items-center justify-center shadow-lg">
        <MaterialIcons name="add" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
