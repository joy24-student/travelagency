import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { hotelService, HotelReservation } from '../services/hotelService';

export function ReservationsScreen() {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [reservations, setReservations] = useState<HotelReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReservations = useCallback(async () => {
    try {
      const data = await hotelService.getReservations(activeTab, searchQuery);
      setReservations(data);
    } catch (err) {
      console.warn('Failed to load reservations:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReservations();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
      case 'Checked In':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'Upcoming':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'Pending':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'Cancelled':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0d1117]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity className="me-4">
            <MaterialIcons name="menu" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-white tracking-wide">Reservations</Text>
        </View>
        <View className="flex-row items-center space-x-4">
          <TouchableOpacity onPress={() => setSearchVisible((prev) => !prev)}>
            <MaterialIcons name={searchVisible ? 'close' : 'search'} size={22} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRefresh}>
            <MaterialIcons name="refresh" size={22} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Expandable Search Input */}
      {searchVisible && (
        <View className="px-5 pb-3">
          <View className="flex-row items-center bg-[#161b22] border border-gray-700 rounded-xl px-3 py-2">
            <MaterialIcons name="search" size={20} color="#94a3b8" />
            <TextInput
              placeholder="Search by guest name, ref #, or room..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ms-2 text-white text-sm"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="clear" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
      >
        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-5 py-4 flex-row"
          contentContainerStyle={{ paddingEnd: 20 }}
        >
          {['All', 'Upcoming', 'Checked In', 'Checked Out', 'Pending', 'Cancelled'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`me-2 px-4 py-1.5 rounded-full border ${
                activeTab === tab
                  ? 'bg-[#4f46e5] border-[#4f46e5]'
                  : 'bg-gray-800 border-gray-700'
              }`}
            >
              <Text className={`text-xs font-medium ${activeTab === tab ? 'text-white' : 'text-gray-300'}`}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* List Section */}
        <View className="px-5 mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {activeTab} Bookings ({reservations.length})
            </Text>
          </View>

          {loading ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="small" color="#4f46e5" />
            </View>
          ) : reservations.length === 0 ? (
            <View className="bg-[#161b22] rounded-2xl p-8 items-center border border-gray-800 mt-2">
              <MaterialIcons name="event-busy" size={40} color="#64748b" />
              <Text className="text-white font-semibold text-base mt-3">No Reservations Found</Text>
              <Text className="text-gray-400 text-xs text-center mt-1">
                No guest bookings match the current filter criteria.
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {reservations.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  className="bg-[#161b22] rounded-2xl p-4 border border-gray-800 shadow-sm"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-row flex-1">
                      <Image
                        source={{ uri: item.avatar }}
                        className="w-12 h-12 rounded-full border-2 border-indigo-500/30"
                      />
                      <View className="ms-3 flex-1 justify-center">
                        <View className="flex-row items-center">
                          <Text className="text-sm font-semibold text-white me-2">{item.name}</Text>
                          {item.isVIP && (
                            <View className="bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded">
                              <Text className="text-[9px] font-bold text-yellow-500">VIP</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-gray-400 mt-0.5">{item.bookingId}</Text>
                      </View>
                    </View>

                    <View className={`px-2.5 py-1 rounded-full border ${getStatusColor(item.status)}`}>
                      <Text className={`text-[10px] font-semibold ${getStatusColor(item.status).split(' ')[0]}`}>
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  <View className="h-[1px] bg-gray-800/80 my-3" />

                  <View className="flex-row justify-between items-center text-xs">
                    <View>
                      <View className="flex-row items-center mb-1">
                        <MaterialIcons name="event" size={14} color="#94a3b8" />
                        <Text className="text-xs text-gray-300 ms-1.5">{item.dates}</Text>
                      </View>
                      <View className="flex-row items-center">
                        <MaterialIcons name="meeting-room" size={14} color="#94a3b8" />
                        <Text className="text-xs text-gray-400 ms-1.5">
                          {item.roomType} • {item.guests}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      <Text className="text-sm font-bold text-white">{item.price}</Text>
                      <Text className={`text-[10px] mt-0.5 ${item.isPaid ? 'text-green-500' : 'text-orange-400'}`}>
                        {item.isPaid ? 'Paid in full' : 'Payment at check-in'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
