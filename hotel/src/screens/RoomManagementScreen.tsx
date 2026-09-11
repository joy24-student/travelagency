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

export function RoomManagementScreen() {
  const StatItem = ({ label, value, color }: any) => (
    <View className="bg-[#1c2128] p-2 rounded-xl text-center border border-[#30363d] flex-1 mx-0.5">
      <Text className="text-[10px] text-gray-400 mb-1" numberOfLines={1}>{label}</Text>
      <Text className={`text-lg font-bold ${color}`}>{value}</Text>
    </View>
  );

  const CategoryItem = ({ label, count, icon, bgColor, iconColor }: any) => (
    <View className="flex-1 items-center">
      <View className={`w-full aspect-square ${bgColor} border border-white/5 rounded-2xl items-center justify-center mb-2`}>
        <MaterialIcons name={icon} size={24} color={iconColor} />
      </View>
      <Text className="text-[11px] font-medium text-white">{label}</Text>
      <Text className="text-[10px] text-gray-500">{count} Rooms</Text>
    </View>
  );

  const StatusProgress = ({ label, value, percentage, color, icon, iconBg }: any) => (
    <View className="flex-row items-center space-x-3 mb-4">
      <View className={`w-8 h-8 rounded-lg ${iconBg} items-center justify-center`}>
        <MaterialIcons name={icon} size={18} color={color} />
      </View>
      <View className="flex-1">
        <View className="flex-row justify-between mb-1">
          <Text className="text-xs text-gray-300">{label}</Text>
          <Text className="text-xs text-gray-400">
            <Text className="text-white font-bold">{value}</Text> ({percentage}%)
          </Text>
        </View>
        <View className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
          <View className="h-full" style={{ width: `${percentage}%`, backgroundColor: color }} />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#0d1117]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-4">
        <View className="flex-row items-center">
          <TouchableOpacity className="p-1">
            <MaterialIcons name="menu" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white ml-4">Rooms</Text>
        </View>
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity className="p-1">
            <MaterialIcons name="search" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity className="p-1 bg-indigo-600 rounded-lg">
            <MaterialIcons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Stats Summary */}
        <View className="flex-row justify-between mt-4">
          <StatItem label="Total" value="70" color="text-white" />
          <StatItem label="Avail" value="18" color="text-green-500" />
          <StatItem label="Occu" value="35" color="text-orange-500" />
          <StatItem label="Maint" value="5" color="text-yellow-500" />
          <StatItem label="Out" value="2" color="text-gray-400" />
        </View>

        {/* Room Categories */}
        <View className="mt-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-base font-semibold text-white">Room Categories</Text>
            <TouchableOpacity>
              <Text className="text-sm text-indigo-400">View All</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row space-x-3">
            <CategoryItem label="Standard" count="32" icon="king-bed" bgColor="bg-indigo-900/30" iconColor="#818cf8" />
            <CategoryItem label="Deluxe" count="18" icon="apartment" bgColor="bg-blue-900/30" iconColor="#60a5fa" />
            <CategoryItem label="Suite" count="12" icon="auto-awesome" bgColor="bg-orange-900/30" iconColor="#fb923c" />
            <CategoryItem label="Executive" count="8" icon="verified" bgColor="bg-green-900/30" iconColor="#4ade80" />
          </View>
        </View>

        {/* Room Status List */}
        <View className="mt-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-base font-semibold text-white">Room Status</Text>
            <TouchableOpacity>
              <Text className="text-sm text-indigo-400">View All</Text>
            </TouchableOpacity>
          </View>
          <StatusProgress label="Available" value="18" percentage={26} color="#22c55e" icon="check-circle" iconBg="bg-green-500/20" />
          <StatusProgress label="Occupied" value="35" percentage={50} color="#f97316" icon="person" iconBg="bg-orange-500/20" />
          <StatusProgress label="Reserved" value="10" percentage={14} color="#eab308" icon="event" iconBg="bg-yellow-500/20" />
          <StatusProgress label="Maintenance" value="5" percentage={7} color="#a855f7" icon="build" iconBg="bg-purple-500/20" />
        </View>

        {/* Floor Overview */}
        <View className="mt-8 mb-24">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-base font-semibold text-white">Floor Overview</Text>
            <TouchableOpacity>
              <Text className="text-sm text-indigo-400">View All</Text>
            </TouchableOpacity>
          </View>
          {[
            { floor: '1st Floor', code: '2B', rooms: '12 / 16', percentage: 75, color: '#818cf8' },
            { floor: '2nd Floor', code: '3B', rooms: '14 / 16', percentage: 88, color: '#a855f7' },
            { floor: '3rd Floor', code: '3S', rooms: '16 / 16', percentage: 100, color: '#4ade80' },
          ].map((item, idx) => (
            <View key={idx} className="flex-row items-center space-x-3 mb-4">
              <View className="w-8 h-8 rounded-lg bg-gray-800 items-center justify-center">
                <Text className="text-[10px] font-bold" style={{ color: item.color }}>{item.code}</Text>
              </View>
              <View className="flex-1">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs text-gray-300">{item.floor}</Text>
                  <Text className="text-[10px] text-gray-500">
                    {item.rooms} Rooms <Text className="text-white font-bold ml-2">{item.percentage}%</Text>
                  </Text>
                </View>
                <View className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                  <View className="h-full bg-green-500" style={{ width: `${item.percentage}%` }} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
