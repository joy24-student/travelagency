import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export function ChatScreen() {
  const [message, setMessage] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-[#0b1326]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="bg-[#0b1326] flex-row justify-between items-center px-4 py-2 border-b border-white/5 shadow-lg">
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity className="p-2">
            <MaterialIcons name="arrow-back" size={24} color="#c0c1ff" />
          </TouchableOpacity>
          <View className="flex-row items-center space-x-2">
            <View className="relative">
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsWGUZ3CbsOqq45cVvXtyw-CjZX919pZ1Re8daDhrUVJABLtcLIca99VL5plpFw3vLU2d8JGT8UNs1cRPEKQxeQeWzJ6y3XQtntEz2T957pchLaRGMr4XDOb9QiCe-gMbDlZ_ZbM0xALZO0v09xsyOtVG1SSRS7agRqgj_COZ8RNP0t1-tD6F54S7KwSlLBgN1bi3GiKRaW9mWbFvXG7yuBcXr-xK9BRZ4uWTqiRVqs_29u_jqNyOs4ee_QgahOCGwhdwc1AqI298' }}
                className="w-10 h-10 rounded-full border-2 border-[#4edea3]/30"
              />
              <View className="absolute bottom-0 right-0 w-3 h-3 bg-[#4edea3] rounded-full border-2 border-[#0b1326]" />
            </View>
            <View>
              <View className="flex-row items-center space-x-1">
                <Text className="text-white font-semibold">Robert Fox</Text>
                <View className="bg-[#ca8100]/20 border border-[#ffb95f]/30 px-1.5 py-0.5 rounded">
                  <Text className="text-[#ffb95f] text-[8px] font-bold">VIP</Text>
                </View>
              </View>
              <Text className="text-[#908fa0] text-[10px]">Room 302 • Check-out May 31</Text>
            </View>
          </View>
        </View>
        <View className="flex-row items-center space-x-2">
          <TouchableOpacity className="p-2">
            <MaterialIcons name="search" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity className="bg-[#8083ff] p-2 rounded-full">
            <MaterialIcons name="call" size={20} color="#0d0096" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
          {/* Date Separator */}
          <View className="flex-row items-center space-x-4 mb-6">
            <View className="flex-1 h-[1px] bg-white/10" />
            <View className="bg-slate-800/70 border border-white/10 px-4 py-1 rounded-full">
              <Text className="text-[#908fa0] text-[10px] font-bold tracking-widest uppercase">Today, 30 May 2024</Text>
            </View>
            <View className="flex-1 h-[1px] bg-white/10" />
          </View>

          {/* Guest Message */}
          <View className="flex-col items-start max-w-[85%] mb-6">
            <View className="bg-slate-800/70 border border-white/5 p-4 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl">
              <Text className="text-[#dae2fd] text-sm">
                Thank you for the quick check-in! Is it possible to get extra towels sent to room 302?
              </Text>
            </View>
            <Text className="text-[#908fa0] text-[10px] mt-1 ml-1">10:24 AM • Sent</Text>
          </View>

          {/* Staff Reply */}
          <View className="flex-col items-end self-end max-w-[85%] mb-6">
            <View className="bg-[#8083ff] p-4 rounded-tl-2xl rounded-bl-2xl rounded-br-2xl shadow-lg shadow-[#8083ff]/20">
              <Text className="text-[#0d0096] text-sm font-medium">
                You're very welcome, Mr. Fox! I've sent a request to housekeeping. They'll be at your door in 5 minutes.
              </Text>
            </View>
            <View className="flex-row items-center space-x-1 mt-1 mr-1">
              <Text className="text-[#908fa0] text-[10px]">10:26 AM • Read</Text>
              <MaterialIcons name="done-all" size={14} color="#4edea3" />
            </View>
          </View>

          {/* Guest Message Short */}
          <View className="flex-col items-start max-w-[85%] mb-6">
            <View className="bg-slate-800/70 border border-white/5 p-4 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl">
              <Text className="text-[#dae2fd] text-sm">Perfect, thanks!</Text>
            </View>
            <Text className="text-[#908fa0] text-[10px] mt-1 ml-1">10:27 AM</Text>
          </View>

          {/* Typing Indicator */}
          <View className="flex-row items-center space-x-3 opacity-80 mb-6">
            <View className="flex-row space-x-1 bg-[#222a3d] px-3 py-2 rounded-full">
              <View className="w-1.5 h-1.5 bg-[#908fa0] rounded-full" />
              <View className="w-1.5 h-1.5 bg-[#908fa0] rounded-full" />
              <View className="w-1.5 h-1.5 bg-[#908fa0] rounded-full" />
            </View>
            <Text className="text-[#908fa0] text-xs italic">Robert Fox is typing...</Text>
          </View>
        </ScrollView>

        {/* Input Area */}
        <View className="p-4 bg-[#171f33]/80 backdrop-blur-xl border-t border-white/5">
          {/* Action Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
            <TouchableOpacity className="bg-slate-800/70 border border-[#8083ff]/20 px-4 py-2 rounded-full flex-row items-center space-x-2 mr-2">
              <MaterialIcons name="dry-cleaning" size={16} color="#c0c1ff" />
              <Text className="text-[#c0c1ff] text-xs font-medium">Send Towels</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-slate-800/70 border border-[#4edea3]/20 px-4 py-2 rounded-full flex-row items-center space-x-2 mr-2">
              <MaterialIcons name="restaurant" size={16} color="#4edea3" />
              <Text className="text-[#4edea3] text-xs font-medium">Room Service</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-slate-800/70 border border-white/20 px-4 py-2 rounded-full flex-row items-center space-x-2 mr-2">
              <MaterialIcons name="cleaning-services" size={16} color="#dae2fd" />
              <Text className="text-[#dae2fd] text-xs font-medium">Housekeeping</Text>
            </TouchableOpacity>
          </ScrollView>

          <View className="flex-row items-end space-x-2">
            <TouchableOpacity className="p-2 mb-1">
              <MaterialIcons name="add" size={24} color="#908fa0" />
            </TouchableOpacity>
            <View className="flex-1">
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Type a message..."
                placeholderTextColor="#908fa0"
                multiline
                className="bg-[#0b1326] border border-white/10 rounded-2xl py-3 px-4 text-white text-sm min-h-[44]"
              />
            </View>
            <TouchableOpacity
              className={`p-3 rounded-full shadow-lg ${message ? 'bg-[#8083ff]' : 'bg-[#8083ff]'}`}
            >
              <MaterialIcons name={message ? 'send' : 'mic'} size={24} color="#0d0096" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
