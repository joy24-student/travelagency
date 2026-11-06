import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Particle component
const Particle = ({ index, delay }: { index: number; delay: number }) => {
  const posX = useRef(new Animated.Value(0)).current;
  const posY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(posY, {
          toValue: -200,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(posX, {
          toValue: Math.random() * 100 - 50,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.5,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const randomX = Math.random() * (width - 20);
  const randomY = height / 2 + Math.random() * 100;
  const randomSize = Math.random() * 8 + 4;
  const randomColor = [
    '#003399',
    '#FF5722',
    '#00AA00',
    '#0099FF',
  ][Math.floor(Math.random() * 4)];

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: randomX,
          top: randomY,
          width: randomSize,
          height: randomSize,
          backgroundColor: randomColor,
          transform: [
            { translateY: posY },
            { translateX: posX },
            { scale },
          ],
          opacity,
        },
      ]}
    />
  );
};

export default function AdvancedSplashScreen({ onFinish }: { onFinish?: () => void }) {
  const [particles, setParticles] = useState<number[]>([]);
  const birdScale = useRef(new Animated.Value(0)).current;
  const birdY = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Generate particles
    setParticles(Array.from({ length: 8 }, (_, i) => i));

    const animationSequence = () => {
      // Bird pop-in animation
      Animated.parallel([
        Animated.spring(birdScale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();

      // Float animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(birdY, {
            toValue: -15,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(birdY, {
            toValue: 15,
            duration: 2500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Title fade in
      setTimeout(() => {
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      }, 400);

      // Subtitle fade in
      setTimeout(() => {
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      }, 900);

      // Finish splash
      setTimeout(() => {
        onFinish?.();
      }, 3500);
    };

    animationSequence();
  }, []);

  return (
    <View style={styles.container}>
      {/* Particle background */}
      {particles.map((index) => (
        <Particle key={index} index={index} delay={index * 200} />
      ))}

      {/* Main content */}
      <View style={styles.content}>
        {/* Animated Bird */}
        <Animated.View
          style={[
            styles.birdContainer,
            {
              transform: [
                { scale: birdScale },
                { translateY: birdY },
              ],
            },
          ]}
        >
          <Image
              source={require('../../assets/images/splash-icon.png')}
              style={styles.birdImage}
              resizeMode="contain"
          />
          <Text style={styles.title}>SHOPNO</Text>
          <Text style={[styles.title, styles.titleAccent]}>JATRA</Text>
        </Animated.View>

        {/* Animated Subtitle */}
        <Animated.View
          style={[
            styles.subtitleContainer,
            {
              opacity: subtitleOpacity,
            },
          ]}
        >
          <Text style={styles.subtitle}>Your Journey Awaits</Text>
          <View style={styles.underline} />
        </Animated.View>
      </View>

      {/* Progress indicator */}
      <View style={styles.progressBar}>
        <ProgressBar />
      </View>
    </View>
  );
}

// Progress bar component
function ProgressBar() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: true,
    }).start();
  }, []);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 0],
  });

  return (
    <View style={[styles.progressBarTrack, { overflow: 'hidden' }]}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            width: '100%',
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    borderRadius: 100,
  },
  birdContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  birdImage: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  titleContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#003399',
    textAlign: 'center',
  },
  titleAccent: {
    color: '#FF5722',
  },
  subtitleContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  underline: {
    width: 40,
    height: 3,
    backgroundColor: '#FF5722',
    borderRadius: 2,
  },
  progressBar: {
    position: 'absolute',
    bottom: 50,
    left: 50,
    right: 50,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
  },
  progressBarTrack: {
    position: 'absolute',
    left: 50,
    right: 50,
    bottom: 50,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#003399',
    borderRadius: 2,
  },
});
