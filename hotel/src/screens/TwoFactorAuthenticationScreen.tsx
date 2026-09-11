import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export function TwoFactorAuthenticationScreen() {
  const [isEnabled, setIsEnabled] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-[#0b1326]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center space-x-4 border-b border-white/5">
        <TouchableOpacity className="p-1">
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">2FA</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-8" showsVerticalScrollIndicator={false}>
        <View className="items-center mb-10">
          <View className="w-20 h-20 rounded-3xl bg-[#8083ff]/10 items-center justify-center mb-6 border border-[#8083ff]/20 shadow-lg shadow-[#8083ff]/20">
            <MaterialIcons name="security" size={44} color="#c0c1ff" />
          </View>
          <Text className="text-2xl font-bold text-white text-center mb-3">Two-Factor Authentication</Text>
          <Text className="text-[#94a3b8] text-center px-4 leading-relaxed">
            Add an extra layer of security to your account by requiring a verification code when you sign in.
          </Text>
        </View>

        <View className="bg-slate-800/40 border border-white/10 rounded-[32px] p-6 mb-8 shadow-xl">
           <View className="flex-row items-center justify-between">
              <View>
                 <Text className="text-white font-bold text-base">Authentication App</Text>
                 <Text className="text-[#94a3b8] text-xs mt-1">Recommended</Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={setIsEnabled}
                trackColor={{ true: '#8083ff', false: '#334155' }}
                thumbColor="white"
              />
           </View>

           {isEnabled && (
             <View className="mt-8 pt-8 border-t border-white/5">
                <Text className="text-[#c7c4d7] text-xs font-bold uppercase tracking-widest mb-4">Setup details</Text>
                <View className="bg-[#060e20] p-4 rounded-2xl flex-row items-center justify-between mb-4">
                   <Text className="text-white font-mono text-sm">H56K - 99LK - P012 - QQX8</Text>
                   <TouchableOpacity>
                      <MaterialIcons name="content-copy" size={20} color="#c0c1ff" />
                   </TouchableOpacity>
                </View>
                <Text className="text-[#94a3b8] text-[10px] text-center leading-relaxed">
                   Copy this secret key to your authentication app (like Google Authenticator or Authy) to link your account.
                </Text>
             </View>
           )}
        </View>

        <View className="space-y-4 mb-24">
           <TouchableOpacity className="bg-white/5 border border-white/10 p-4 rounded-2xl flex-row items-center space-x-4">
              <View className="w-10 h-10 bg-emerald-500/10 rounded-xl items-center justify-center">
                 <MaterialIcons name="backup" size={20} color="#4edea3" />
              </View>
              <View className="flex-1">
                 <Text className="text-white font-bold text-sm">Recovery Codes</Text>
                 <Text className="text-[#94a3b8] text-[10px]">Generate emergency access codes</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
           </TouchableOpacity>

           <TouchableOpacity className="bg-white/5 border border-white/10 p-4 rounded-2xl flex-row items-center space-x-4">
              <View className="w-10 h-10 bg-orange-500/10 rounded-xl items-center justify-center">
                 <MaterialIcons name="phone-android" size={20} color="#fb923c" />
              </View>
              <View className="flex-1">
                 <Text className="text-white font-bold text-sm">SMS Verification</Text>
                 <Text className="text-[#94a3b8] text-[10px]">Use your phone number as a backup</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
           </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
