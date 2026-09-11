import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

const conversations = [
  {
    id: '1',
    name: 'Robert Fox',
    message: 'Thank you for the quick check-in!',
    time: '10:30 AM',
    unread: 5,
    isVIP: true,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFXcmcQ1W1CNhPZCLA-dpqnwTAf8O54mmzRJKEZcG6UYz_7FKWtQfdYpgmK32-QNUn7Yvj3eVKcFsB0hfBV1PPrakK0HxCi6vtcQXKlHY52xWlzRrk_2V35-Kfn-ujI7ywRYxh4KVOsikcPq8_aOxZDbVtPYTdXbO9wQW-eEYym_zJeNpXvTwxL6IwpUG5GrzNyKn5HabegjXuO-O7yh_WTpgb3OghjTGn5j0H68783TrJ5KP9c6v7nO-iGavew_0nIpzaAJdlXWA',
  },
  {
    id: '2',
    name: 'Jane Cooper',
    message: 'Is breakfast included in my current suite package?',
    time: '09:15 AM',
    unread: 0,
    isVIP: false,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBVdIffrxHKlEoFhCv_eLnbFRdUBhdDwVNm5a-HKpkQGBcB3clKypD3dE46fpvhukD68EP-WwOY9SaLevkoFkTYaFsf5c0_aB8YGnp-G9LH-iyoUulGefYUMA5Ggue9lTeiTTI5HuQQVOTtCn-QYT11oQpceNZ6E0UaPcaSLEkqeCkcbi_nSA9f3nvZiFaw1_AhjzhwqNsNzBYQuAW8MzqZ0IrhXuiiEh917ifhYaoSS8bAyqaVO7ldi7w5nNVr5tqvah9Li0j200',
  },
  {
    id: '3',
    name: 'Wade Warren',
    message: 'The conference room setup was perfect. Thanks!',
    time: 'Yesterday',
    unread: 0,
    isVIP: false,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgTuSmnG8XUMwHl4RAv0Mfvg71Vz3YJnww7AHAXFKVX2njlrQ0mfoMX6vB6iMuHFUvOzyGVE92sRsNnZDh8gyM5G8CrPR7rrKNl9R1sgv2dAGfG-PJB8Ap86f95zStmTSAn0I2sS0_2V-2cvQynfSVqJLsUi1ma94lPmGlWeCBcdu4fWH2cFDa1a2HlBXGLUKTJ3xYtLG3ntHrxYSapxC0TzF6ibJf3PkPN9quq3u2TKe-_CVPIH5cCwcJM55ZxM8Dylz7R_mWUsQ',
  },
  {
    id: '4',
    name: 'Esther Howard',
    message: "I'll be arriving late for check-in around 11 PM.",
    time: 'Yesterday',
    unread: 0,
    isVIP: true,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDF9X9UcD0HfC2sQO1hlGa588_DhDh6PhJFBrpu73NsTph6y2qyYVbc5z6vN9lmUUQbucbYEIeVTZ4P2hbYFk_TSX2BO2WTzqkccbJejVoWbER7xoPq9fyK8Rp18kBORAbfelKu0ud8IoQzNyg0dcqWvQrLNIlFZJItCMwFenJx_sYnS90rf3CCXDHRvpm9pk5yu7Md-R879cLAUjbZoX8X6DSvqH9Q6iCrrdShEYAbVylm4uXouffkI4MA_Z7AWxrSTK0DvLXg1KA',
  },
  {
    id: '5',
    name: 'Guy Hawkins',
    message: 'Could you send extra towels to room 402?',
    time: 'May 28',
    unread: 0,
    isVIP: false,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDh8EaXSfDDnd_miZaXrJ0qBb7sh9mxDou4Fz6qK423o0VMKaCzREQkRcAuLL2kKzOIYI1ubOCCJDJHyNMZLiz1L2H8cQx6KJomDp5_0RduGgFl0rMJuSBYq_Xye-_glQX3CAD2jnMXLXDlTeOu-qJjIVxWBg376HQSrGb68Pg6T38de9UUYzQT2BlJxnL8MCFgOj3yh5d7WYwxwCO0Mx4Qos-ahW4wfkmeMP0BL3lVIKPg37r0X7__8-ICDZBqIrKCsSEThNltMdI',
  },
];

export function MessagesScreen() {
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <SafeAreaView className="flex-1 bg-[#0b1326]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3">
        <TouchableOpacity className="p-2 rounded-full">
          <MaterialIcons name="menu" size={24} color="#c0c1ff" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-[#dae2fd]">Messages</Text>
        <TouchableOpacity className="p-2 rounded-full">
          <MaterialIcons name="search" size={24} color="#c0c1ff" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-2">
        {/* Search Bar */}
        <View className="relative mb-6">
          <View className="absolute left-4 top-1/2 -mt-2.5 z-10">
            <MaterialIcons name="search" size={20} color="#908fa0" />
          </View>
          <TextInput
            className="w-full bg-[#131b2e] border border-[#464554] rounded-xl py-3 pl-12 pr-4 text-[#dae2fd]"
            placeholder="Search messages..."
            placeholderTextColor="#908fa0"
          />
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6">
          {['All', 'Unread', 'VIP', 'Archive'].map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`mr-2 px-6 py-2 rounded-full border ${
                activeFilter === filter
                  ? 'bg-[#c0c1ff] border-[#c0c1ff]'
                  : 'bg-[#222a3d] border-[#464554]/30'
              }`}
            >
              <Text
                className={`font-medium ${
                  activeFilter === filter ? 'text-[#1000a9]' : 'text-[#c7c4d7]'
                }`}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Messages List */}
        <View className="space-y-3 pb-24">
          {conversations.map((item) => (
            <TouchableOpacity
              key={item.id}
              className="bg-[#1e293b]/40 border border-white/10 rounded-2xl p-4 flex-row items-center relative overflow-hidden"
              style={{ elevation: 2 }}
            >
              {item.unread > 0 && (
                <View className="absolute left-0 top-0 bottom-0 w-1 bg-[#c0c1ff]" />
              )}

              <View className="relative">
                <Image
                  source={{ uri: item.avatar }}
                  className={`w-14 h-14 rounded-full border-2 ${
                    item.unread > 0 ? 'border-[#c0c1ff]/20' : 'border-[#908fa0]/10'
                  }`}
                />
                {item.unread > 0 && (
                  <View className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#c0c1ff] rounded-full flex items-center justify-center border-2 border-[#0b1326]">
                    <Text className="text-[10px] font-bold text-[#1000a9]">{item.unread}</Text>
                  </View>
                )}
              </View>

              <View className="flex-1 ml-4">
                <View className="flex-row justify-between items-center mb-1">
                  <View className="flex-row items-center">
                    <Text className="text-base font-semibold text-[#dae2fd] mr-2">
                      {item.name}
                    </Text>
                    {item.isVIP && (
                      <View className="bg-[#ca8100]/20 border border-[#ffb95f]/30 px-1.5 py-0.5 rounded">
                        <Text className="text-[10px] font-bold text-[#ffb95f]">VIP</Text>
                      </View>
                    )}
                  </View>
                  <Text className={`text-xs ${item.unread > 0 ? 'text-[#c0c1ff]' : 'text-[#908fa0]'}`}>
                    {item.time}
                  </Text>
                </View>
                <Text
                  className={`text-sm truncate ${
                    item.unread > 0 ? 'text-[#dae2fd] font-semibold' : 'text-[#c7c4d7]'
                  }`}
                  numberOfLines={1}
                >
                  {item.message}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        className="absolute bottom-24 right-6 w-14 h-14 bg-[#c0c1ff] rounded-full shadow-lg items-center justify-center"
        style={{ elevation: 5 }}
      >
        <MaterialCommunityIcons name="square-edit-outline" size={28} color="#1000a9" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
