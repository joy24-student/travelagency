import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export function GuestDetailsScreen() {
  const InfoRow = ({ label, value, icon, isCopyable, isPaid }: any) => (
    <View className={`flex-row justify-between items-center py-4 ${!isPaid && 'border-b border-gray-800'}`}>
      <Text className="text-gray-400 text-sm">{label}</Text>
      <View className="flex-row items-center space-x-2">
        <View className="items-end">
          {typeof value === 'string' ? (
            <Text className={`font-semibold text-sm ${isPaid ? 'text-green-400' : 'text-white'}`}>{value}</Text>
          ) : (
            value
          )}
        </View>
        {icon && <MaterialIcons name={icon} size={16} color="#818cf8" />}
        {isPaid && <MaterialIcons name="check-circle" size={16} color="#4ade80" />}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#0f111a]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <TouchableOpacity className="p-2 bg-gray-800/40 rounded-full">
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">Guest Details</Text>
        <TouchableOpacity className="p-2 bg-gray-800/40 rounded-full">
          <MaterialIcons name="share" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Guest Profile Card */}
        <LinearGradient
          colors={['#1e2540', '#2a3461']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-[32px] p-6 mt-2 overflow-hidden"
        >
          <View className="flex-row items-center space-x-4">
            <View className="w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-400">
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsWGUZ3CbsOqq45cVvXtyw-CjZX919pZ1Re8daDhrUVJABLtcLIca99VL5plpFw3vLU2d8JGT8UNs1cRPEKQxeQeWzJ6y3XQtntEz2T957pchLaRGMr4XDOb9QiCe-gMbDlZ_ZbM0xALZO0v09xsyOtVG1SSRS7agRqgj_COZ8RNP0t1-tD6F54S7KwSlLBgN1bi3GiKRaW9mWbFvXG7yuBcXr-xK9BRZ4uWTqiRVqs_29u_jqNyOs4ee_QgahOCGwhdwc1AqI298' }}
                className="w-full h-full"
              />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center space-x-2">
                <Text className="text-2xl font-bold text-white">Robert Fox</Text>
                <View className="bg-yellow-500/20 px-2 py-0.5 rounded-full flex-row items-center">
                  <MaterialIcons name="star" size={10} color="#fbbf24" />
                  <Text className="text-yellow-400 text-[10px] font-bold ml-1">VIP</Text>
                </View>
              </View>
              <View className="mt-2 space-y-1">
                <View className="flex-row items-center space-x-2">
                  <MaterialIcons name="phone" size={14} color="#818cf8" />
                  <Text className="text-gray-300 text-xs">+1 202 555 0175</Text>
                </View>
                <View className="flex-row items-center space-x-2">
                  <MaterialIcons name="email" size={14} color="#818cf8" />
                  <Text className="text-gray-300 text-xs">robertfox@email.com</Text>
                </View>
                <View className="flex-row items-center space-x-2">
                  <MaterialIcons name="public" size={14} color="#818cf8" />
                  <Text className="text-gray-300 text-xs">United States</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Stats */}
        <View className="flex-row space-x-3 mt-6">
          <View className="flex-1 bg-gray-800/40 border border-gray-700/50 rounded-2xl p-3 items-center">
            <Text className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Bookings</Text>
            <Text className="text-xl font-bold text-white">12</Text>
          </View>
          <View className="flex-1 bg-gray-800/40 border border-gray-700/50 rounded-2xl p-3 items-center">
            <Text className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Spent</Text>
            <Text className="text-xl font-bold text-white">$4,850</Text>
          </View>
          <View className="flex-1 bg-gray-800/40 border border-gray-700/50 rounded-2xl p-3 items-center">
            <Text className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Points</Text>
            <Text className="text-xl font-bold text-white">2,450</Text>
          </View>
        </View>

        {/* Section Tabs */}
        <View className="mt-8 flex-row border-b border-gray-800">
          <TouchableOpacity className="border-b-2 border-indigo-400 pb-2 mr-6">
            <Text className="text-indigo-400 font-bold">Booking Details</Text>
          </TouchableOpacity>
          <TouchableOpacity className="pb-2 mr-6">
            <Text className="text-gray-400 font-medium">Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity className="pb-2 mr-6">
            <Text className="text-gray-400 font-medium">History</Text>
          </TouchableOpacity>
        </View>

        {/* Booking Info List */}
        <View className="mt-6">
          <InfoRow label="Booking ID" value="#R-88211" icon="content-copy" />
          <InfoRow label="Check-in" value={
            <View className="items-end">
              <Text className="font-semibold text-white">26 May 2024</Text>
              <Text className="text-xs text-gray-500">10:00 AM</Text>
            </View>
          } />
          <InfoRow label="Check-out" value={
            <View className="items-end">
              <Text className="font-semibold text-white">28 May 2024</Text>
              <Text className="text-xs text-gray-500">12:00 PM</Text>
            </View>
          } />
          <InfoRow label="Room Type" value="Deluxe Room" icon="apartment" />
          <InfoRow label="Guests" value="2 Adults • 1 Child" />
          <InfoRow label="Payment Status" value="Paid" isPaid />

          <View className="flex-row justify-between items-center pt-4 mt-2 border-t border-gray-800">
            <Text className="text-base text-gray-300">Total Amount</Text>
            <Text className="text-xl font-bold text-green-400">$240.00</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="mt-8 space-y-4 mb-24">
          <TouchableOpacity className="w-full bg-indigo-600 py-4 rounded-2xl items-center shadow-lg shadow-indigo-600/20">
            <Text className="text-white font-bold text-base">Message Guest</Text>
          </TouchableOpacity>
          <View className="flex-row space-x-3">
            <TouchableOpacity className="flex-1 py-4 bg-gray-800/40 border border-gray-700/50 rounded-2xl items-center">
              <MaterialIcons name="phone" size={24} color="#4ade80" />
              <Text className="text-[10px] font-medium text-white mt-1">Call Guest</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 py-4 bg-gray-800/40 border border-gray-700/50 rounded-2xl items-center">
              <MaterialIcons name="edit" size={24} color="#818cf8" />
              <Text className="text-[10px] font-medium text-white mt-1">Modify</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 py-4 bg-gray-800/40 border border-gray-700/50 rounded-2xl items-center">
              <MaterialIcons name="cancel" size={24} color="#f87171" />
              <Text className="text-[10px] font-medium text-white mt-1">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
