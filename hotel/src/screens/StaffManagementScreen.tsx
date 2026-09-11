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
import { MaterialIcons } from '@expo/vector-icons';

export function StaffManagementScreen() {
  const DepartmentItem = ({ icon, label, count, color, bgColor }: any) => (
    <View className="flex-1 items-center">
      <View className={`w-12 h-12 ${bgColor} rounded-xl items-center justify-center mb-1`}>
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
      <Text className="text-[9px] text-gray-400 text-center" numberOfLines={1}>{label}</Text>
      <Text className="text-xs font-bold text-white">{count}</Text>
    </View>
  );

  const StaffItem = ({ name, role, phone, status, avatar }: any) => (
    <View className="flex-row items-center justify-between mb-4">
      <View className="flex-row items-center space-x-3">
        <Image
          source={{ uri: avatar }}
          className="w-10 h-10 rounded-full"
        />
        <View>
          <Text className="text-sm font-semibold text-white">{name}</Text>
          <Text className="text-[10px] text-gray-400">{role}</Text>
          <Text className="text-[10px] text-gray-400">{phone}</Text>
        </View>
      </View>
      <View className={`px-2 py-0.5 rounded ${status === 'Active' ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
        <Text className={`text-[10px] font-bold ${status === 'Active' ? 'text-green-500' : 'text-yellow-500'}`}>{status}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#0a0f1d]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-6 py-4 flex-row justify-between items-center">
        <View className="flex-row items-center space-x-4">
          <TouchableOpacity>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">Staff Management</Text>
        </View>
        <TouchableOpacity className="relative">
          <MaterialIcons name="notifications-none" size={24} color="#94a3b8" />
          <View className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full items-center justify-center">
            <Text className="text-white text-[10px] font-bold">3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Operational Overview Card */}
        <View className="bg-[#141b2d] rounded-2xl p-5 mb-6 flex-row justify-between items-center">
          <View className="space-y-4">
            <View>
              <Text className="text-gray-400 text-sm">Total Staff</Text>
              <Text className="text-3xl font-bold text-white">45</Text>
            </View>
            <View className="flex-row space-x-8">
              <View>
                <Text className="text-gray-400 text-xs">Active Staff</Text>
                <Text className="text-lg font-semibold text-white">38</Text>
              </View>
              <View>
                <Text className="text-gray-400 text-xs">On Leave</Text>
                <Text className="text-lg font-semibold text-white">7</Text>
              </View>
            </View>
          </View>

          <View className="items-center justify-center">
             <View className="w-20 h-20 rounded-full border-4 border-[#1e293b] items-center justify-center">
                <View className="absolute w-20 h-20 rounded-full border-4 border-cyan-500" style={{ borderBottomColor: 'transparent', borderLeftColor: 'transparent' }} />
                <Text className="text-lg font-bold text-white">84%</Text>
                <Text className="text-[10px] text-gray-400">Active</Text>
             </View>
          </View>
        </View>

        {/* Departments */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-base text-white">Departments</Text>
            <TouchableOpacity>
              <Text className="text-indigo-400 text-xs font-semibold">View All</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row space-x-2">
            <DepartmentItem icon="people" label="Front Desk" count="12" color="#a855f7" bgColor="bg-purple-500/20" />
            <DepartmentItem icon="cleaning-services" label="Housekeep" count="15" color="#4ade80" bgColor="bg-green-500/20" />
            <DepartmentItem icon="build" label="Mainten..." count="6" color="#60a5fa" bgColor="bg-blue-500/20" />
            <DepartmentItem icon="restaurant" label="F&B Svc" count="8" color="#fb923c" bgColor="bg-orange-500/20" />
            <DepartmentItem icon="security" label="Security" count="4" color="#22d3ee" bgColor="bg-cyan-500/20" />
          </View>
        </View>

        {/* Recent Staff */}
        <View className="mb-24">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-base text-white">Recent Staff</Text>
            <View className="flex-row space-x-4 items-center">
              <TouchableOpacity>
                <MaterialIcons name="search" size={18} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Text className="text-indigo-400 text-xs font-semibold">View All</Text>
              </TouchableOpacity>
            </View>
          </View>

          <StaffItem
            name="John Doe" role="Front Desk Manager" phone="+880 1723 456789" status="Active"
            avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuAN4PBm5Rcr3rdZ4BdSnM8sXGXgRk0uqLYCAXqzrExSAhP6zvZ7nd7ufULV0Bc66H4sWUCtWUydTkuavlp7TjTTPUnE-nEOjKtfxPTP1agzxn29TyZK7baL4SmLOua5psRvLHwGxUNngsAuu2IlmB7LkMZVoXlekxubk3VUVlGHrRyYpW6x8Eqg1DoHb3OZySOK1rji-R8Sv9ciaJPRP7IEp_4E4tcguxRFZJx0zwGvXCPuPoNfF-7w1HzvGGhmEqEAIog4zYCMmNA"
          />
          <StaffItem
            name="Sarah Wilson" role="Housekeeping Staff" phone="+880 1823 456789" status="Active"
            avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuBA8_tyqgU3upx9070FVylu7ikGZhcd4qyd_WoRMQLxCT0a390urdY1BhMRxXiS_hQi14C3f4ZCoouCk9zI-FRSXGkG9hL3ckKqQJSTm-Klwr1fxg1H7Z2DkVi4R_CflpasLERmSImxWS58XMf3dzJ6rVw6JMhGq0Rdld6GDbyfMm0BrJ0GNdhVfI151fXjveEe-bfCBnUt3S1TPlnULkoxygRGXHBZE5J7kZzkq6jsCyoKjvwslqEG1ZRwt5nNfmS8U9OxCs_YGjY"
          />
          <StaffItem
            name="Michael Brown" role="Maintenance Staff" phone="+880 1912 456789" status="On Duty"
            avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuBEPXGgXJJDOFmxnYKE-7BWikjkhgRABH7ZOz7C3zBv9uQuXVFseU7bS09zCU-_KgCUMTQ8bizeT26UL1V9tHl6eToyRzKmb7RC0AkSBX3XK2TvF09PLQnFORfUgLk997OuMTxWypWtL4-C9X5XWJwtGKU2ITat1ewQWdL6UG5z0giVqolHsG-uXYpA71xNGWg4nPq7DebZ_qdS8YeY5F--cwFXiFvgGGWjmi6s0MFscWN1Rb6_oQN_9AGfwWXjMz5j_L5AQPiKhO4"
          />
          <StaffItem
            name="David Lee" role="F&B Manager" phone="+880 1634 567890" status="Active"
            avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuDNPNA6gKx_MclHmE-92djXScodPR81gS1Ch1xJfT_Kbe-3tV0V7sLRDmPQGSzAJdJyGl5hUUV37uIasiZZJxbVr0O_Z94ZKnF97dg0X5I7ssaqhxzXpz60N-kJYNUwmGIX_xW1GAzGAsLp3FhPYb-El2NWt_5K6NMwnJAKeXZxNVVChnXk35CokzLaU5bSDn3aYu0VfFuDZDXnJg56iImCfx3IQB2HDy7zF_u6l17GwW6CJ33U5uY-YtLanMAKkQWv_ajzyfMAyuA"
          />
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity className="absolute bottom-24 right-6 w-12 h-12 bg-indigo-600 rounded-full items-center justify-center shadow-lg border-4 border-[#0a0f1d]">
        <MaterialIcons name="add" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
