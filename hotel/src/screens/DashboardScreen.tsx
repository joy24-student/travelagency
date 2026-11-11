import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useHotelRBAC, HOTEL_ROLES_META } from '../context/HotelRBACContext';
import { hotelService, HotelTelemetry } from '../services/hotelService';
import { subscribeToHotelRealtime } from '../services/hotelRealtimeBridge';

export function DashboardScreen({ navigation }: any) {
  const { role, switchRole, roleMeta } = useHotelRBAC();
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [telemetry, setTelemetry] = useState<HotelTelemetry | null>(null);
  const [roomStats, setRoomStats] = useState({ total: 70, available: 18, occupied: 35, maintenance: 5 });

  const loadData = async () => {
    try {
      const [tData, rData] = await Promise.all([
        hotelService.getTelemetry(),
        hotelService.getRoomCategories(),
      ]);
      setTelemetry(tData);
      setRoomStats({
        total: rData.stats.total,
        available: rData.stats.available,
        occupied: rData.stats.occupied,
        maintenance: rData.stats.maintenance,
      });
    } catch (err) {
      console.warn('Dashboard data load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToHotelRealtime(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const gmData = telemetry?.gm || {
    monthlyRevenue: 24850,
    revenueGrowth: 24.5,
    adr: 120,
    revPar: 84,
    occupancyRate: 70,
  };

  const frontDeskData = telemetry?.frontDesk || {
    todayCheckIns: 18,
    todayCheckOuts: 12,
    vipArrivals: 6,
    pendingBookings: 4,
  };

  const hkData = telemetry?.housekeeping || {
    dirtyRooms: 12,
    priorityCleans: 4,
    inspectionsPending: 5,
    cleanRooms: 34,
  };

  const maintData = telemetry?.maintenance || {
    urgentOrders: 2,
    inProgressRepairs: 5,
    preventativeTasks: 8,
    operationalRatio: 96.4,
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0b1326]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4">
        <View>
          <Text className="text-2xl font-bold text-white">Dashboard</Text>
          <Text className="text-[#94a3b8] text-xs">Hotel hospitality operations</Text>
        </View>

        <View className="flex-row items-center space-x-3">
          {/* Persona Switcher Chip */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: `${roleMeta.color}20`,
              borderColor: roleMeta.color,
              borderWidth: 1,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
            }}
            onPress={() => setRoleModalVisible(true)}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', color: roleMeta.color, marginEnd: 4 }}>
              {roleMeta.badge}
            </Text>
            <Ionicons name="chevron-down" size={12} color={roleMeta.color} />
          </TouchableOpacity>

          <TouchableOpacity className="w-9 h-9 bg-white/10 rounded-xl items-center justify-center">
            <MaterialIcons name="notifications-none" size={20} color="white" />
            <View className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#0b1326]" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
      >
        {/* Role-Specific Hero Section */}
        {role === "GENERAL_MANAGER" && (
          <LinearGradient
            colors={['#7c3aed', '#4f46e5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-[32px] p-6 mb-6"
          >
            <View className="flex-row justify-between items-start mb-4">
              <View>
                <Text className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">
                  Total Monthly Revenue
                </Text>
                <Text className="text-white text-3xl font-bold">
                  ${gmData.monthlyRevenue.toLocaleString()}
                </Text>
              </View>
              <View className="bg-white/20 p-2 rounded-xl">
                <MaterialIcons name="trending-up" size={24} color="white" />
              </View>
            </View>
            <View className="flex-row items-center">
              <Text className="text-white text-sm font-medium">+{gmData.revenueGrowth}% </Text>
              <Text className="text-white/60 text-xs">higher than last month (ADR: ${gmData.adr})</Text>
            </View>
          </LinearGradient>
        )}

        {role === "FRONT_DESK" && (
          <LinearGradient
            colors={['#0284c7', '#0369a1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-[32px] p-6 mb-6"
          >
            <View className="flex-row justify-between items-start mb-4">
              <View>
                <Text className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">
                  Today's Guest Traffic
                </Text>
                <Text className="text-white text-3xl font-bold">{frontDeskData.todayCheckIns} Check-Ins</Text>
              </View>
              <View className="bg-white/20 p-2 rounded-xl">
                <MaterialIcons name="hotel" size={24} color="white" />
              </View>
            </View>
            <View className="flex-row items-center">
              <Text className="text-white text-sm font-medium">{frontDeskData.todayCheckOuts} Check-Outs </Text>
              <Text className="text-white/60 text-xs">| {frontDeskData.vipArrivals} VIP Guests Expected</Text>
            </View>
          </LinearGradient>
        )}

        {role === "HOUSEKEEPING" && (
          <LinearGradient
            colors={['#059669', '#047857']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-[32px] p-6 mb-6"
          >
            <View className="flex-row justify-between items-start mb-4">
              <View>
                <Text className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">
                  Housekeeping Queue
                </Text>
                <Text className="text-white text-3xl font-bold">{hkData.dirtyRooms} Rooms Pending</Text>
              </View>
              <View className="bg-white/20 p-2 rounded-xl">
                <MaterialCommunityIcons name="broom" size={24} color="white" />
              </View>
            </View>
            <View className="flex-row items-center">
              <Text className="text-white text-sm font-medium">{hkData.priorityCleans} Priority </Text>
              <Text className="text-white/60 text-xs">| {hkData.cleanRooms} Inspected & Clean</Text>
            </View>
          </LinearGradient>
        )}

        {role === "MAINTENANCE" && (
          <LinearGradient
            colors={['#d97706', '#b45309']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-[32px] p-6 mb-6"
          >
            <View className="flex-row justify-between items-start mb-4">
              <View>
                <Text className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">
                  Active Facility Tickets
                </Text>
                <Text className="text-white text-3xl font-bold">{maintData.inProgressRepairs} Work Orders</Text>
              </View>
              <View className="bg-white/20 p-2 rounded-xl">
                <MaterialIcons name="build" size={24} color="white" />
              </View>
            </View>
            <View className="flex-row items-center">
              <Text className="text-white text-sm font-medium">{maintData.urgentOrders} Urgent </Text>
              <Text className="text-white/60 text-xs">| {maintData.operationalRatio}% Asset Health</Text>
            </View>
          </LinearGradient>
        )}

        {/* Quick Stats Grid */}
        <View className="flex-row flex-wrap justify-between mb-6">
          <View className="w-[48%] bg-[#121827] border border-white/5 rounded-3xl p-5 mb-4">
            <Text className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-widest mb-2">Revenue</Text>
            <Text className="text-white text-xl font-bold mb-1">${gmData.monthlyRevenue.toLocaleString()}</Text>
            <Text className="text-[#a78bfa] text-xs font-bold">+{gmData.revenueGrowth}%</Text>
          </View>
          <View className="w-[48%] bg-[#121827] border border-white/5 rounded-3xl p-5 mb-4">
            <Text className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-widest mb-2">Occupancy</Text>
            <Text className="text-white text-xl font-bold mb-1">{gmData.occupancyRate}%</Text>
            <Text className="text-[#34d399] text-xs font-bold">+8.2%</Text>
          </View>
          <View className="w-[48%] bg-[#121827] border border-white/5 rounded-3xl p-5 mb-4">
            <Text className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-widest mb-2">ADR</Text>
            <Text className="text-white text-xl font-bold mb-1">${gmData.adr}</Text>
            <Text className="text-[#fbbf24] text-xs font-bold">+12.5%</Text>
          </View>
          <View className="w-[48%] bg-[#121827] border border-white/5 rounded-3xl p-5 mb-4">
            <Text className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-widest mb-2">RevPAR</Text>
            <Text className="text-white text-xl font-bold mb-1">${gmData.revPar}</Text>
            <Text className="text-[#6366f1] text-xs font-bold">+15.3%</Text>
          </View>
        </View>

        {/* Room Availability */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-base font-bold">Room Availability</Text>
          <Text className="text-[#818cf8] text-xs font-bold">{roomStats.total} Total Units</Text>
        </View>

        <View className="flex-row justify-between mb-8">
          {[
            { label: 'Total', value: String(roomStats.total), color: '#6366f1' },
            { label: 'Avail', value: String(roomStats.available), color: '#10b981' },
            { label: 'Occu', value: String(roomStats.occupied), color: '#f59e0b' },
            { label: 'Maint', value: String(roomStats.maintenance), color: '#8b5cf6' },
          ].map((item, index) => (
            <View key={index} className="bg-[#121827] rounded-2xl p-4 w-[22%] items-center">
              <View className="w-1 h-4 rounded-full mb-2" style={{ backgroundColor: item.color }} />
              <Text className="text-[#94a3b8] text-[8px] font-bold uppercase mb-1">{item.label}</Text>
              <Text className="text-white text-base font-bold" style={{ color: item.color }}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Performance Summary Chart */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-base font-bold">Performance Summary</Text>
          <MaterialIcons name="more-horiz" size={20} color="#94a3b8" />
        </View>

        <View className="bg-[#121827] border border-white/5 rounded-[32px] p-6 mb-24">
          <View className="flex-row justify-between items-end h-40">
            {[45, 75, 50, 95, 70, 85, 100].map((height, i) => (
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

      {/* Role Switcher Modal */}
      <Modal
        visible={roleModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#ffffff' }}>Hotel Personnel Persona</Text>
                <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Select staff role to test operational views</Text>
              </View>
              <TouchableOpacity onPress={() => setRoleModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {HOTEL_ROLES_META.map((r) => {
              const isSelected = r.id === role;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: isSelected ? r.color : 'rgba(255,255,255,0.08)',
                    backgroundColor: isSelected ? `${r.color}15` : 'rgba(255,255,255,0.03)',
                    marginBottom: 10,
                  }}
                  onPress={() => {
                    switchRole(r.id);
                    setRoleModalVisible(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: r.color }}>{r.label}</Text>
                    {isSelected && (
                      <View style={{ backgroundColor: r.color, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#ffffff' }}>ACTIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{r.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
