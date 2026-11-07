import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { hotelService, HotelRoomCategory } from '../services/hotelService';

export function RoomManagementScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 70,
    available: 18,
    occupied: 35,
    maintenance: 5,
    outOfOrder: 2,
  });
  const [categories, setCategories] = useState<HotelRoomCategory[]>([]);

  const loadData = async () => {
    try {
      const data = await hotelService.getRoomCategories();
      setStats(data.stats);
      setCategories(data.categories);
    } catch (err) {
      console.warn('Error loading room management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

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

  const availPct = stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0;
  const occuPct = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;
  const maintPct = stats.total > 0 ? Math.round((stats.maintenance / stats.total) * 100) : 0;
  const outPct = stats.total > 0 ? Math.round((stats.outOfOrder / stats.total) * 100) : 0;

  return (
    <SafeAreaView className="flex-1 bg-[#0d1117]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-4">
        <View className="flex-row items-center">
          <TouchableOpacity className="p-1">
            <MaterialIcons name="menu" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white ms-4">Rooms</Text>
        </View>
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity className="p-1" onPress={onRefresh}>
            <MaterialIcons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {/* Stats Summary */}
        <View className="flex-row justify-between mt-4">
          <StatItem label="Total" value={String(stats.total)} color="text-white" />
          <StatItem label="Avail" value={String(stats.available)} color="text-green-500" />
          <StatItem label="Occu" value={String(stats.occupied)} color="text-orange-500" />
          <StatItem label="Maint" value={String(stats.maintenance)} color="text-yellow-500" />
          <StatItem label="Out" value={String(stats.outOfOrder)} color="text-gray-400" />
        </View>

        {/* Room Categories */}
        <View className="mt-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-base font-semibold text-white">Room Categories</Text>
            <Text className="text-xs text-indigo-400 font-semibold">{categories.length} Types</Text>
          </View>
          <View className="flex-row space-x-3">
            {categories.map((cat) => (
              <CategoryItem
                key={cat.id}
                label={cat.label}
                count={cat.count}
                icon={cat.icon}
                bgColor={cat.bgColor}
                iconColor={cat.iconColor}
              />
            ))}
          </View>
        </View>

        {/* Room Status List */}
        <View className="mt-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-base font-semibold text-white">Room Status</Text>
          </View>
          <StatusProgress label="Available" value={stats.available} percentage={availPct} color="#22c55e" icon="check-circle" iconBg="bg-green-500/20" />
          <StatusProgress label="Occupied" value={stats.occupied} percentage={occuPct} color="#f97316" icon="person" iconBg="bg-orange-500/20" />
          <StatusProgress label="Maintenance" value={stats.maintenance} percentage={maintPct} color="#a855f7" icon="build" iconBg="bg-purple-500/20" />
          <StatusProgress label="Out of Order" value={stats.outOfOrder} percentage={outPct} color="#ef4444" icon="block" iconBg="bg-red-500/20" />
        </View>

        {/* Floor Overview */}
        <View className="mt-8 mb-24">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-base font-semibold text-white">Floor Overview</Text>
          </View>
          {[
            { floor: '1st Floor', code: '1F', rooms: '18 / 24', percentage: 75, color: '#818cf8' },
            { floor: '2nd Floor', code: '2F', rooms: '22 / 24', percentage: 91, color: '#a855f7' },
            { floor: '3rd Floor - Suites', code: '3F', rooms: '18 / 22', percentage: 82, color: '#4ade80' },
          ].map((item, idx) => (
            <View key={idx} className="flex-row items-center space-x-3 mb-4">
              <View className="w-8 h-8 rounded-lg bg-gray-800 items-center justify-center">
                <Text className="text-[10px] font-bold" style={{ color: item.color }}>{item.code}</Text>
              </View>
              <View className="flex-1">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs text-gray-300">{item.floor}</Text>
                  <Text className="text-[10px] text-gray-500">
                    {item.rooms} Rooms <Text className="text-white font-bold ms-2">{item.percentage}%</Text>
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
