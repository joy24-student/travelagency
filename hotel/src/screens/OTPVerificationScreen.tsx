import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export function OTPVerificationScreen() {
  const [timer, setTimer] = useState(59);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#0b0e14]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="flex-row items-center px-4 h-16 border-b border-white/5">
        <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-white/5">
          <MaterialIcons name="arrow-back" size={24} color="#c7c4d7" />
        </TouchableOpacity>
        <View className="flex-1 items-center pr-10">
          <Text className="text-2xl font-bold text-[#c0c1ff] tracking-tight">Lumina</Text>
        </View>
      </View>

      <View className="flex-1 justify-center px-6">
        {/* Glass Card */}
        <View className="bg-slate-800/40 border border-white/10 rounded-[32px] p-8 items-center shadow-2xl">
          {/* Icon Indicator */}
          <View className="w-16 h-16 rounded-2xl bg-[#8083ff]/20 items-center justify-center mb-6 border border-[#8083ff]/20">
            <MaterialIcons name="lock-open" size={36} color="#c0c1ff" />
          </View>

          <h1 className="text-2xl font-bold text-[#dae2fd] mb-2 text-center">Verify OTP</h1>
          <Text className="text-[#c7c4d7] text-center mb-10 max-w-[280px]">
            Enter the 4-digit code sent to{'\n'}
            <Text className="text-[#c0c1ff] font-medium">admin@luminahotels.com</Text>
          </Text>

          {/* OTP Inputs */}
          <View className="flex-row space-x-4 mb-10">
            {[1, 2, 3, 4].map((i) => (
              <TextInput
                key={i}
                maxLength={1}
                keyboardType="number-pad"
                className="w-16 h-20 bg-[#060e20] text-white text-3xl text-center font-bold rounded-xl border border-white/10 focus:border-[#c0c1ff]"
              />
            ))}
          </View>

          {/* Primary Action */}
          <TouchableOpacity className="w-full h-14 rounded-xl overflow-hidden mb-6">
            <LinearGradient
              colors={['#8083ff', '#494bd6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="flex-1 flex-row items-center justify-center space-x-2"
            >
              <Text className="text-white font-bold text-base">Verify & Proceed</Text>
              <MaterialIcons name="arrow-forward" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Resend Logic */}
          <View className="items-center">
            <Text className="text-[#c7c4d7] text-xs mb-2">Didn't receive the code?</Text>
            <View className="flex-row items-center space-x-2">
              <TouchableOpacity disabled={timer > 0}>
                <Text className={`text-[#c0c1ff] text-sm font-medium ${timer > 0 ? 'opacity-50' : 'underline'}`}>
                  Resend Code
                </Text>
              </TouchableOpacity>
              {timer > 0 && (
                <View className="bg-[#4edea3]/10 px-2 py-0.5 rounded-full">
                  <Text className="text-[#4edea3] text-[10px] font-bold">
                    00:{timer < 10 ? `0${timer}` : timer}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Security Badge */}
        <View className="mt-12 flex-row items-center justify-center space-x-2 bg-slate-800/30 px-4 py-2 rounded-full self-center border border-white/5">
          <MaterialIcons name="verified-user" size={14} color="#4edea3" />
          <Text className="text-[#c7c4d7] text-[10px]">Secure AES-256 encrypted verification</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
