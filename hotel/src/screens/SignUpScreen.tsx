import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

export function SignUpScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  async function signUpWithEmail() {
    setLoading(true);
    const {
      data: { session },
      error
    } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      if (!session) Alert.alert('Check your email for the confirmation link!');
      navigation.navigate('login');
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-[#020617]">
      <View
        className="absolute w-[400] h-[400] rounded-full bg-[#4edea3]/5 blur-[100px]"
        style={{ bottom: -100, left: -100 }}
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

          <Text className="text-white text-4xl font-bold mb-2">Join Lumina</Text>
          <Text className="text-[#94a3b8] text-base mb-10">Start managing with intelligence</Text>

          <View className="space-y-6">
            <View>
              <Text className="text-[#c7c4d7] text-xs font-bold uppercase tracking-widest mb-3 ml-1">Full Name</Text>
              <BlurView intensity={10} tint="dark" className="rounded-2xl border border-white/10 overflow-hidden">
                <TextInput
                  placeholder="Enter your full name"
                  placeholderTextColor="#464554"
                  onChangeText={(text) => setFullName(text)}
                  value={fullName}
                  className="px-5 py-4 text-white text-base"
                />
              </BlurView>
            </View>

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
              <Text className="text-[#c7c4d7] text-xs font-bold uppercase tracking-widest mb-3 ml-1">Password</Text>
              <BlurView intensity={10} tint="dark" className="rounded-2xl border border-white/10 overflow-hidden">
                <TextInput
                  placeholder="Create a strong password"
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
              onPress={signUpWithEmail}
              className="mt-4"
            >
              <LinearGradient
                colors={['#8083ff', '#494bd6']}
                className="h-16 rounded-2xl items-center justify-center shadow-xl shadow-[#8083ff]/30"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Create Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View className="flex-row justify-center mt-10">
              <Text className="text-[#94a3b8]">Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('login')}>
                <Text className="text-[#8083ff] font-bold">Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
