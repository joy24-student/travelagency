import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const getStrength = () => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 10) return 2;
    return 3;
  };

  const strength = getStrength();

  return (
    <SafeAreaView className="flex-1 bg-[#0b1326]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-4 h-16 flex-row items-center">
        <TouchableOpacity className="p-2 rounded-full bg-white/5">
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
        <View className="mb-8">
          <Text className="text-2xl font-bold text-white mb-2">Reset Password</Text>
          <Text className="text-[#94a3b8] text-sm">Create a new strong password for your account</Text>
        </View>

        <View className="bg-slate-800/70 border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          {/* Decorative Glow */}
          <View className="absolute -top-12 -right-12 w-24 h-24 bg-[#8083ff]/10 rounded-full" />

          {/* New Password Field */}
          <View className="mb-6">
            <Text className="text-[#c7c4d7] text-xs font-medium ml-1 mb-2">New Password</Text>
            <View className="relative">
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Min. 8 characters"
                placeholderTextColor="#464554"
                className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -mt-3"
              >
                <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Strength Meter */}
            <View className="mt-3">
               <View className="flex-row justify-between items-center mb-1 px-1">
                  <Text className="text-[10px] text-gray-500 uppercase font-bold">Strength</Text>
                  <Text className={`text-[10px] font-bold ${strength === 3 ? 'text-green-400' : strength === 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {strength === 3 ? 'STRONG' : strength === 2 ? 'GOOD' : strength === 1 ? 'WEAK' : 'ENTER PASSWORD'}
                  </Text>
               </View>
               <View className="flex-row space-x-1">
                  {[1, 2, 3].map((i) => (
                    <View
                      key={i}
                      className={`h-1 flex-1 rounded-full ${i <= strength ? (strength === 3 ? 'bg-green-500' : strength === 2 ? 'bg-yellow-500' : 'bg-red-500') : 'bg-white/5'}`}
                    />
                  ))}
               </View>
            </View>
          </View>

          {/* Confirm Password Field */}
          <View className="mb-8">
            <Text className="text-[#c7c4d7] text-xs font-medium ml-1 mb-2">Confirm Password</Text>
            <View className="relative">
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                placeholder="Repeat your new password"
                placeholderTextColor="#464554"
                className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -mt-3"
              >
                <MaterialIcons name={showConfirmPassword ? "visibility-off" : "visibility"} size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity className="w-full h-14 rounded-xl overflow-hidden">
            <LinearGradient
              colors={['#8083ff', '#494bd6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="flex-1 flex-row items-center justify-center space-x-2"
            >
              <Text className="text-white font-bold text-base">Reset Password</Text>
              <MaterialIcons name="lock-reset" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Security Tip */}
        <View className="mt-8 bg-white/5 border border-white/5 rounded-2xl p-4 flex-row space-x-3 items-start">
          <MaterialIcons name="info" size={20} color="#ffb95f" />
          <Text className="flex-1 text-[#94a3b8] text-[10px] leading-relaxed">
            Your new password must be at least 8 characters long and should include a combination of letters, numbers, and special symbols for maximum security.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
