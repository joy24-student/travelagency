import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const onboardingData = [
  {
    title: 'Experience Premium\nHospitality',
    description: 'Elevate your hotel management with Lumina’s futuristic AI-driven suite.',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=1000',
  },
  {
    title: 'Real-time Analytics\nAt Your Fingertips',
    description: 'Monitor performance, revenue, and guest satisfaction in one unified workspace.',
    image: 'https://images.unsplash.com/photo-1551288049-bb1c004517ae?auto=format&fit=crop&q=80&w=1000',
  },
  {
    title: 'Smart Guest\nEngagement',
    description: 'Seamlessly connect with your guests through our integrated intelligent chat system.',
    image: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&q=80&w=1000',
  },
];

export function OnboardingScreen({ navigation }: any) {
  const [currentIndex, setCurrentPage] = useState(0);
  const scrollX = new Animated.Value(0);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentPage(currentIndex + 1);
    } else {
      navigation.navigate('login');
    }
  };

  return (
    <View className="flex-1 bg-[#020617]">
      {/* Background Glows */}
      <View
        className="absolute w-[500] h-[500] rounded-full bg-[#8083ff]/10 blur-[120px]"
        style={{ top: -200, left: -100 }}
      />
      <View
        className="absolute w-[400] h-[400] rounded-full bg-[#4edea3]/5 blur-[100px]"
        style={{ bottom: -100, right: -100 }}
      />

      {/* Content */}
      <View className="flex-1 items-center justify-center pt-20">
        <Image
          source={{ uri: onboardingData[currentIndex].image }}
          className="w-full h-80 opacity-60"
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', '#020617']}
          className="absolute w-full h-80"
          style={{ top: 80 }}
        />
      </View>

      {/* Glassmorphism Card */}
      <View className="px-6 pb-20">
        <BlurView intensity={30} tint="dark" className="p-8 rounded-[40px] border border-white/10 overflow-hidden">
          <View className="flex-row space-x-2 mb-6">
            {onboardingData.map((_, i) => (
              <View
                key={i}
                className={`h-1.5 rounded-full ${i === currentIndex ? 'w-8 bg-[#8083ff]' : 'w-2 bg-white/20'}`}
              />
            ))}
          </View>

          <Text className="text-white text-3xl font-bold mb-4 leading-[38px]">
            {onboardingData[currentIndex].title}
          </Text>

          <Text className="text-[#94a3b8] text-base leading-6 mb-10">
            {onboardingData[currentIndex].description}
          </Text>

          <TouchableOpacity
            onPress={handleNext}
            className="flex-row items-center justify-between"
          >
            <LinearGradient
              colors={['#8083ff', '#494bd6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="flex-1 h-16 rounded-2xl flex-row items-center justify-center space-x-2 shadow-xl shadow-[#8083ff]/30"
            >
              <Text className="text-white font-bold text-lg">
                {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Continue'}
              </Text>
              <MaterialIcons name="arrow-forward" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </BlurView>
      </View>
    </View>
  );
}
