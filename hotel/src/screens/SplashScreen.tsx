import React, { useEffect } from 'react';
import { View, Text, Image, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

export function SplashScreen({ navigation }: any) {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.9);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.navigate('onboarding');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 bg-[#020617] items-center justify-center">
      <StatusBar style="light" />
      <LinearGradient
        colors={['transparent', 'rgba(99, 102, 241, 0.05)', 'transparent']}
        style={{ position: 'absolute', width, height }}
      />

      {/* Background Decorative Glows */}
      <View
        className="absolute w-[400] h-[400] rounded-full bg-[#8083ff]/10 blur-[100px]"
        style={{ top: -100, right: -100 }}
      />
      <View
        className="absolute w-[300] h-[300] rounded-full bg-[#4edea3]/5 blur-[80px]"
        style={{ bottom: -50, left: -50 }}
      />

      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
        className="items-center"
      >
        <View className="w-24 h-24 rounded-[28px] bg-[#8083ff] items-center justify-center shadow-2xl shadow-[#8083ff]/40">
           <Text className="text-white text-4xl font-bold">L</Text>
        </View>
        <Text className="text-white text-3xl font-bold mt-6 tracking-widest">LUMINA</Text>
        <Text className="text-[#94a3b8] text-xs font-medium uppercase tracking-[4px] mt-2">Hospitality Elite</Text>
      </Animated.View>

      <View className="absolute bottom-16 items-center">
        <View className="w-1 h-1 bg-[#8083ff] rounded-full animate-bounce" />
        <Text className="text-[#464554] text-[10px] font-bold uppercase tracking-[2px] mt-4">Version 2.4.0</Text>
      </View>
    </View>
  );
}
