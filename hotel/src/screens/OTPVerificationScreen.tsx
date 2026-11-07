import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export function OTPVerificationScreen({ navigation }: any) {
  const [timer, setTimer] = useState(59);
  const [code, setCode] = useState('');
  const inputRef = useRef<TextInput>(null);
  const length = 6; // Standard 6-digit verification

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = () => {
    if (code.length < 4) return;
    navigation?.navigate?.('dashboard');
  };

  const codeChars = code.split('');

  return (
    <SafeAreaView className="flex-1 bg-[#0b0e14]" edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between" }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StatusBar barStyle="light-content" />

          {/* Header */}
          <View className="flex-row items-center px-4 h-16 border-b border-white/5">
            <TouchableOpacity
              onPress={() => navigation?.goBack?.()}
              className="w-10 h-10 items-center justify-center rounded-full bg-white/5"
            >
              <MaterialIcons name="arrow-back" size={24} color="#c7c4d7" />
            </TouchableOpacity>
            <View className="flex-1 items-center pe-10">
              <Text className="text-2xl font-bold text-[#c0c1ff] tracking-tight">Lumina</Text>
            </View>
          </View>

          <View className="flex-1 justify-center px-6 py-6">
            {/* Glass Card */}
            <View className="bg-slate-800/40 border border-white/10 rounded-[32px] p-8 items-center shadow-2xl">
              {/* Icon Indicator */}
              <View className="w-16 h-16 rounded-2xl bg-[#8083ff]/20 items-center justify-center mb-6 border border-[#8083ff]/20">
                <MaterialIcons name="lock-open" size={36} color="#c0c1ff" />
              </View>

              <Text className="text-2xl font-bold text-[#dae2fd] mb-2 text-center">Verify OTP</Text>
              <Text className="text-[#c7c4d7] text-center mb-8 max-w-[280px]">
                Enter the verification code sent to{'\n'}
                <Text className="text-[#c0c1ff] font-medium">admin@luminahotels.com</Text>
              </Text>

              {/* OTP Inputs with SMS Auto-read and Paste support */}
              <Pressable
                onPress={() => inputRef.current?.focus()}
                className="w-full relative items-center justify-center mb-8"
              >
                <TextInput
                  ref={inputRef}
                  value={code}
                  onChangeText={(val) => setCode(val.replace(/[^0-9]/g, '').slice(0, length))}
                  maxLength={length}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  accessibilityLabel="OTP Verification Code"
                  returnKeyType="done"
                  onSubmitEditing={handleVerify}
                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', zIndex: 10 }}
                />

                <View className="flex-row justify-center space-x-3">
                  {Array.from({ length }).map((_, i) => {
                    const char = codeChars[i] || '';
                    const isFilled = Boolean(char);
                    return (
                      <View
                        key={i}
                        className={`w-12 h-16 bg-[#060e20] items-center justify-center rounded-xl border ${
                          isFilled ? 'border-[#c0c1ff]' : 'border-white/10'
                        }`}
                      >
                        <Text className="text-white text-2xl text-center font-bold">
                          {char}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Pressable>

              {/* Primary Action */}
              <TouchableOpacity
                onPress={handleVerify}
                className="w-full h-14 rounded-xl overflow-hidden mb-6"
              >
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
                  <TouchableOpacity disabled={timer > 0} onPress={() => setTimer(59)}>
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
            <View className="mt-8 flex-row items-center justify-center space-x-2 bg-slate-800/30 px-4 py-2 rounded-full self-center border border-white/5">
              <MaterialIcons name="verified-user" size={14} color="#4edea3" />
              <Text className="text-[#c7c4d7] text-[10px]">Secure AES-256 encrypted verification</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
