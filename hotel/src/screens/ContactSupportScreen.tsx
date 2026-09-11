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

export function ContactSupportScreen() {
  const ChannelButton = ({ icon, title, subtitle, color, bgColor }: any) => (
    <TouchableOpacity className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 flex-row items-center space-x-4 flex-1">
      <View className={`w-12 h-12 ${bgColor} rounded-xl items-center justify-center`}>
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
      <View>
        <Text className="text-white font-bold text-sm">{title}</Text>
        <Text className="text-[#94a3b8] text-[10px]">{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#0b1326]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-4 h-16 flex-row items-center justify-between border-b border-white/5 bg-[#0b1326]">
        <View className="flex-row items-center space-x-4">
          <TouchableOpacity className="p-2">
            <MaterialIcons name="arrow-back" size={24} color="#c0c1ff" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-[#c0c1ff]">Contact Support</Text>
        </View>
        <View className="w-10 h-10 rounded-full overflow-hidden border border-[#c0c1ff]/20">
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDa8AcaKXDnrADKytQQz9HUfpPhYMjHv8BNnxx5c3_EN9Ws2iHnQYlmPPHEjCHbR791Y7tGwxKkfwmb6aoO54XXYxyEKNXIBedLlnJnFe0mutJmDgcGPz52E1oiUd6I_lIZTrflKN5gatC94ulnCEr3tgKenL9SSTXTfDRBuUb_Bxz4a8Y06nCLHHMcXSsMtvM76e4EE_MCqT60Rp_B09Pw3E2IFDqz8IeAkq__SxWKdWQFpNRLZGCyjCb8dp5CglYPZ9NNWXPa5ho' }}
            className="w-full h-full"
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View className="bg-slate-800/70 border border-white/10 rounded-3xl p-6 mb-6 overflow-hidden">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1">
              <View className="bg-[#00a572]/20 px-3 py-1 rounded-full self-start mb-3">
                <Text className="text-[#4edea3] text-[10px] font-bold uppercase tracking-wider">Enterprise Partner</Text>
              </View>
              <Text className="text-2xl font-bold text-[#c0c1ff] mb-2">24/7 Enterprise Support</Text>
              <Text className="text-[#94a3b8] text-xs leading-relaxed">Our dedicated hospitality specialists are available around the clock.</Text>
            </View>
            <View className="bg-[#2d3449] p-4 rounded-2xl items-center border border-white/5 min-w-[100px]">
               <Text className="text-[#4edea3] text-[8px] font-bold uppercase mb-1">Response</Text>
               <Text className="text-[#4edea3] text-2xl font-bold">{'< 5m'}</Text>
               <View className="flex-row space-x-1 mt-2">
                  <View className="w-1 h-1 bg-[#4edea3] rounded-full" />
                  <View className="w-1 h-1 bg-[#4edea3]/60 rounded-full" />
                  <View className="w-1 h-1 bg-[#4edea3]/30 rounded-full" />
               </View>
            </View>
          </View>
        </View>

        {/* Ticket Dashboard */}
        <View className="flex-row space-x-3 mb-6">
          <View className="flex-1 bg-slate-800/40 border border-white/5 p-4 rounded-2xl items-center">
             <Text className="text-2xl font-bold text-[#c0c1ff]">2</Text>
             <Text className="text-[10px] text-[#94a3b8]">Open</Text>
          </View>
          <View className="flex-1 bg-slate-800/40 border border-white/5 p-4 rounded-2xl items-center opacity-60">
             <Text className="text-2xl font-bold text-[#c7c4d7]">0</Text>
             <Text className="text-[10px] text-[#94a3b8]">Pending</Text>
          </View>
          <View className="flex-1 bg-slate-800/40 border border-white/5 p-4 rounded-2xl items-center">
             <Text className="text-2xl font-bold text-[#4edea3]">15</Text>
             <Text className="text-[10px] text-[#94a3b8]">Resolved</Text>
          </View>
        </View>

        {/* Support Channels */}
        <View className="mb-8">
          <Text className="text-white font-bold text-lg ml-1 mb-4">Support Channels</Text>
          <View className="space-y-3">
             <View className="flex-row space-x-3">
               <ChannelButton icon="forum" title="Live Chat" subtitle="Instant messaging" color="#c0c1ff" bgColor="bg-primary/10" />
               <ChannelButton icon="chat" title="WhatsApp" subtitle="Text & voice" color="#4edea3" bgColor="bg-secondary/10" />
             </View>
             <View className="flex-row space-x-3">
               <ChannelButton icon="call" title="Phone Call" subtitle="Priority hotline" color="#ffb95f" bgColor="bg-tertiary/10" />
               <ChannelButton icon="mail" title="Email" subtitle="Detailed tickets" color="#8083ff" bgColor="bg-primary-container/10" />
             </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="mb-24">
          <Text className="text-white font-bold text-lg ml-1 mb-4">Recent Activity</Text>
          <View className="bg-slate-800/40 border border-white/5 rounded-2xl overflow-hidden">
             {[
               { id: '#9021', title: 'API integration issues', status: 'In Progress', time: '12 mins ago', color: '#c0c1ff' },
               { id: '#8845', title: 'Bulk guest import', status: 'Resolved', time: 'Yesterday', color: '#4edea3' },
             ].map((item, idx) => (
               <TouchableOpacity key={idx} className={`p-4 flex-row items-center justify-between ${idx !== 1 && 'border-b border-white/5'}`}>
                 <View className="flex-row items-center space-x-4">
                    <View className="w-1.5 h-10 rounded-full" style={{ backgroundColor: item.color }} />
                    <View>
                       <Text className="text-white font-bold text-sm">Ticket {item.id} - {item.status}</Text>
                       <Text className="text-[#94a3b8] text-[10px]">{item.title}</Text>
                    </View>
                 </View>
                 <View className="items-end">
                    <Text className="text-white font-bold text-[10px] uppercase">Updated</Text>
                    <Text className="text-[#94a3b8] text-[10px]">{item.time}</Text>
                 </View>
               </TouchableOpacity>
             ))}
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity className="absolute bottom-24 right-6 w-14 h-14 bg-[#c0c1ff] rounded-full items-center justify-center shadow-lg">
        <MaterialIcons name="add" size={32} color="#1000a9" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
