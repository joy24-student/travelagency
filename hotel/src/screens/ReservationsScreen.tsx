import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const reservations = [
  {
    id: '1',
    name: 'Robert Fox',
    bookingId: '#R-88211',
    isVIP: true,
    status: 'Confirmed',
    dates: '26 May – 28 May, 2 Nights',
    roomType: 'Deluxe Room',
    guests: '2 Adults • 1 Child',
    price: '$240',
    isPaid: true,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCiKeGZeqZjG6-WQw-37Fj3cl5AYgqQb4V_U0ZjifpLyzViEDj0pmCIlT78xh701Feo21ofnO7_ZRmlB2sIhGoae2u0Crm2VmCexQgCJEq5_suO9kVQxFpmqbFWMhhMh49XV__VeNHy99knsrKFnBv6lekerz5YY12v4JslLQN_4fzHVx8-FpffjFksIUg7dZ0A8nBZyVsLZalqrOCSywsn5SFDGObFppUwku7dW4DzSg6pMJEd9kgA2tGptBlAHwTDiGvHLIqnoFM',
  },
  {
    id: '2',
    name: 'Jane Cooper',
    bookingId: '#R-88212',
    isVIP: false,
    status: 'Upcoming',
    dates: '30 May – 02 Jun, 3 Nights',
    roomType: 'Family Suite',
    guests: '4 Adults • 2 Children',
    price: '$560',
    isPaid: false,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAyeJyBFVdSEv0nEIMsF_cIgC03ERCgtMP9ccIYvFBup5X5LcgplayAfBHFCdZhEuiANFpfbFfIaQrfme-zneGk0jKm9VJf9fYdjebFXg4OjWVf9Lw1G6BXwxONg132Vm4YruQxCkqvZa5-13U04_Bj6baqiT-63xSMqWirZATxN2BoZ8MkH2GtEZqyBXAus9mW21IgMHoLBmGWIKH6afX__mWJFndpV1_CiTsc7FUqot5cVumVBylBKa4BR6ISk4Va5Y9L2mUxro0',
  },
  {
    id: '3',
    name: 'Wade Warren',
    bookingId: '#R-88213',
    isVIP: false,
    status: 'Pending',
    dates: '30 May – 31 May, 1 Night',
    roomType: 'Executive Room',
    guests: '1 Adult • 0 Child',
    price: '$160',
    isPaid: false,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKerq_ZNpaKyPzLlRfN4CGGf-TXlwzA2VMlvrw90kz4K9xTbyrBlEmJK3yGfCAs3uxFtUAI1UBQMFZjw4csoYLC0bQRyTIKssUc4S749N4lBUz97iZub7EFOAN3ZRlmRxTeZAlUw4_b_iNDVRb0Ln-ZFh9MgZgGihw7Vp_u0cQIMODQM5tU8-iGTxD3M-qzifyBoPjFsKoL2qO2VXTfWqnGEmTqcwDogPMKRYBeikoE6NtfhbyYapNfdsIILavuRgt_a64FtCS864',
  },
];

export function ReservationsScreen() {
  const [activeTab, setActiveTab] = useState('Upcoming');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'Upcoming': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'Pending': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0d1117]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity className="mr-4">
            <MaterialIcons name="menu" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-white tracking-wide">Reservations</Text>
        </View>
        <View className="flex-row items-center space-x-4">
          <TouchableOpacity>
            <MaterialIcons name="search" size={22} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity>
            <MaterialIcons name="filter-list" size={22} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-5 py-4 flex-row"
          contentContainerStyle={{ paddingRight: 20 }}
        >
          {['All', 'Upcoming', 'Checked In', 'Checked Out', 'Cancelled'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`mr-2 px-4 py-1.5 rounded-full border ${
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

        {/* List Section - Today */}
        <View className="px-5 mb-6">
          <Text className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wider">
            Today, 30 May 2024
          </Text>

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
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center">
                        <Text className="font-bold text-[15px] text-white mr-1.5">{item.name}</Text>
                        {item.isVIP && (
                          <View className="bg-yellow-500/20 px-1.5 py-0.5 rounded">
                            <Text className="text-yellow-500 text-[9px] font-bold">VIP</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-gray-500 text-xs mt-0.5">Booking ID: {item.bookingId}</Text>
                    </View>
                  </View>
                  <View className={`px-3 py-1 rounded-full border ${getStatusColor(item.status)}`}>
                    <Text className={`text-[10px] font-bold ${getStatusColor(item.status).split(' ')[0]}`}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View className="mt-3 ml-[60px] flex-row justify-between items-end">
                  <View>
                    <Text className="text-[11px] text-gray-400">{item.dates}</Text>
                    <Text className="text-[13px] font-medium text-gray-200 mt-0.5">{item.roomType}</Text>
                    <Text className="text-[11px] text-gray-500">{item.guests}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[15px] font-bold text-white">{item.price}</Text>
                    <Text className={`text-[10px] font-medium ${item.isPaid ? 'text-green-500' : 'text-gray-500'}`}>
                      {item.isPaid ? 'Paid' : 'Pay at Hotel'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tomorrow Section */}
        <View className="px-5 mb-24">
          <Text className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wider">
            Tomorrow, 31 May 2024
          </Text>
          <TouchableOpacity className="bg-[#161b22] rounded-2xl p-4 border border-gray-800 shadow-sm">
             <View className="flex-row justify-between items-start">
                <View className="flex-row">
                  <View className="w-12 h-12 rounded-full bg-indigo-500/20 items-center justify-center border-2 border-indigo-500/30">
                    <Text className="text-indigo-400 font-bold">EH</Text>
                  </View>
                  <View className="ml-3">
                    <Text className="font-bold text-[15px] text-white">Esther Howard</Text>
                    <Text className="text-gray-500 text-xs mt-0.5">Booking ID: #R-88214</Text>
                  </View>
                </View>
                <View className="px-3 py-1 rounded-full border bg-green-500/10 border-green-500/20">
                  <Text className="text-green-500 text-[10px] font-bold">Confirmed</Text>
                </View>
             </View>
             <View className="mt-3 ml-[60px] flex-row justify-between items-end">
                <View>
                  <Text className="text-[11px] text-gray-400">31 May – 02 Jun, 2 Nights</Text>
                  <Text className="text-[13px] font-medium text-gray-200 mt-0.5">Standard Room</Text>
                  <Text className="text-[11px] text-gray-500">2 Adults</Text>
                </View>
                <View className="items-end">
                  <Text className="text-[15px] font-bold text-white">$220</Text>
                  <Text className="text-[10px] text-green-500 font-medium">Paid</Text>
                </View>
             </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
