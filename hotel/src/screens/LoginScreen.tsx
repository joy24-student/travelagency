import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

export function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      navigation.navigate('dashboard');
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-[#020617]">
      <View
        className="absolute w-[400] h-[400] rounded-full bg-[#8083ff]/10 blur-[100px]"
        style={{ top: -100, right: -100 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 pt-20">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-12 h-12 bg-white/5 items-center justify-center rounded-2xl border border-white/10 mb-10"
          >
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <Text className="text-white text-4xl font-bold mb-2">Welcome Back</Text>
          <Text className="text-[#94a3b8] text-base mb-10">Sign in to your Lumina account</Text>

          <View className="space-y-6">
            <View>
              <Text className="text-[#c7c4d7] text-xs font-bold uppercase tracking-widest mb-3 ml-1">Email Address</Text>
              <BlurView intensity={10} tint="dark" className="rounded-2xl border border-white/10 overflow-hidden">
                <TextInput
                  placeholder="Enter your email"
                  placeholderTextColor="#464554"
                  onChangeText={(text) => setEmail(text)}
                  value={email}
                  autoCapitalize={'none'}
                  className="px-5 py-4 text-white text-base"
                />
              </BlurView>
            </View>

            <View>
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-[#c7c4d7] text-xs font-bold uppercase tracking-widest ml-1">Password</Text>
                <TouchableOpacity onPress={() => navigation.navigate('resetPassword')}>
                  <Text className="text-[#8083ff] text-xs font-bold uppercase">Forgot?</Text>
                </TouchableOpacity>
              </View>
              <BlurView intensity={10} tint="dark" className="rounded-2xl border border-white/10 overflow-hidden">
                <TextInput
                  placeholder="Enter your password"
                  placeholderTextColor="#464554"
                  onChangeText={(text) => setPassword(text)}
                  value={password}
                  secureTextEntry={true}
                  autoCapitalize={'none'}
                  className="px-5 py-4 text-white text-base"
                />
              </BlurView>
            </View>

            <TouchableOpacity
              disabled={loading}
              onPress={signInWithEmail}
              className="mt-4"
            >
              <LinearGradient
                colors={['#8083ff', '#494bd6']}
                className="h-16 rounded-2xl items-center justify-center shadow-xl shadow-[#8083ff]/30"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View className="flex-row items-center space-x-4 py-6">
               <View className="flex-1 h-[1px] bg-white/5" />
               <Text className="text-[#464554] text-xs font-bold uppercase">Or continue with</Text>
               <View className="flex-1 h-[1px] bg-white/5" />
            </View>

            <View className="flex-row space-x-4">
               <TouchableOpacity className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl items-center justify-center flex-row space-x-2">
                  <MaterialIcons name="google" size={20} color="white" />
                  <Text className="text-white font-bold text-sm">Google</Text>
               </TouchableOpacity>
               <TouchableOpacity className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl items-center justify-center flex-row space-x-2">
                  <MaterialIcons name="apple" size={20} color="white" />
                  <Text className="text-white font-bold text-sm">Apple</Text>
               </TouchableOpacity>
            </View>

            <View className="flex-row justify-center mt-10">
              <Text className="text-[#94a3b8]">Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('signUp')}>
                <Text className="text-[#8083ff] font-bold">Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
