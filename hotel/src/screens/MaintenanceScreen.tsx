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

export function MaintenanceScreen() {
  const OverviewCard = ({ label, value, color, bgColor, borderColor }: any) => (
    <View className={`flex-1 p-3 rounded-xl items-center border ${bgColor} ${borderColor} mx-0.5`}>
      <Text className={`text-xs ${color} mb-1`}>{label}</Text>
      <Text className={`text-2xl font-bold ${color === 'text-slate-400' ? 'text-white' : color}`}>{value}</Text>
    </View>
  );

  const RequestItem = ({ id, title, subtitle, info, status, statusColor, statusBg, time, icon, iconColor, iconBg }: any) => (
    <View className="bg-slate-800/40 border border-white/5 p-4 rounded-2xl mb-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-row space-x-4 flex-1">
          <View className={`w-10 h-10 rounded-xl ${iconBg} items-center justify-center`}>
            <MaterialIcons name={icon} size={20} color={iconColor} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-white">{id}</Text>
            <Text className="text-xs text-slate-400 mt-1">{title}</Text>
            <Text className="text-[10px] text-slate-500 mt-1">{subtitle} • {info}</Text>
          </View>
        </View>
        <View className="items-end space-y-2">
          <View className={`px-3 py-1 rounded-full ${statusBg}`}>
            <Text className={`text-[10px] font-medium ${statusColor}`}>{status}</Text>
          </View>
          <Text className="text-[10px] text-slate-500">{time}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#020817]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="pt-4 px-6 pb-4">
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center space-x-3">
            <TouchableOpacity>
              <MaterialIcons name="menu" size={24} color="#94a3b8" />
            </TouchableOpacity>
            <Text className="text-xl font-semibold text-white">Maintenance</Text>
          </View>
          <TouchableOpacity className="relative">
            <MaterialIcons name="notifications-none" size={24} color="#94a3b8" />
            <View className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full items-center justify-center">
              <Text className="text-white text-[10px] font-bold">2</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-medium text-white">Overview</Text>
          <TouchableOpacity className="flex-row items-center bg-slate-800/50 px-2 py-1 rounded-md">
            <Text className="text-slate-400 text-sm">This Month</Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Overview Grid */}
        <View className="flex-row justify-between">
          <OverviewCard label="Total" value="28" color="text-slate-400" bgColor="bg-slate-800/40" borderColor="border-blue-500/30" />
          <OverviewCard label="Done" value="16" color="text-green-400" bgColor="bg-green-500/10" borderColor="border-green-500/30" />
          <OverviewCard label="Progress" value="08" color="text-orange-400" bgColor="bg-orange-500/10" borderColor="border-orange-500/30" />
          <OverviewCard label="Pending" value="04" color="text-red-400" bgColor="bg-red-500/10" borderColor="border-red-500/30" />
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pb-24" showsVerticalScrollIndicator={false}>
        <View className="flex-row justify-between items-center mb-4 mt-2">
          <Text className="font-medium text-white">Maintenance Requests</Text>
          <TouchableOpacity>
            <Text className="text-indigo-400 text-sm font-medium">View All</Text>
          </TouchableOpacity>
        </View>

        <View className="pb-24">
          <RequestItem
            id="#MT-1024" title="AC not cooling in Room 205" subtitle="Room 205" info="Guest Reported"
            status="Pending" statusColor="text-orange-400" statusBg="bg-orange-500/20"
            time="10:30 AM" icon="ac-unit" iconColor="#fb923c" iconBg="bg-orange-500/20"
          />
          <RequestItem
            id="#MT-1023" title="Water leakage in bathroom" subtitle="Room 301" info="Housekeeping"
            status="In Progress" statusColor="text-blue-400" statusBg="bg-blue-500/20"
            time="09:15 AM" icon="water-drop" iconColor="#60a5fa" iconBg="bg-indigo-500/20"
          />
          <RequestItem
            id="#MT-1022" title="TV not working" subtitle="Room 102" info="Guest Reported"
            status="Completed" statusColor="text-green-400" statusBg="bg-green-500/20"
            time="Yesterday" icon="tv" iconColor="#4ade80" iconBg="bg-green-500/20"
          />
          <RequestItem
            id="#MT-1021" title="Light flickering" subtitle="Corridor 2" info="Staff Reported"
            status="Completed" statusColor="text-green-400" statusBg="bg-green-500/20"
            time="2 Days Ago" icon="lightbulb" iconColor="#4ade80" iconBg="bg-green-500/20"
          />
          <RequestItem
            id="#MT-1020" title="Door lock issue" subtitle="Room 404" info="Guest Reported"
            status="Pending" statusColor="text-orange-400" statusBg="bg-orange-500/20"
            time="2 Days Ago" icon="lock" iconColor="#fb923c" iconBg="bg-orange-500/20"
          />
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity className="absolute bottom-24 right-6 w-14 h-14 bg-indigo-600 rounded-full items-center justify-center shadow-lg active:scale-95">
        <MaterialIcons name="add" size={32} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
