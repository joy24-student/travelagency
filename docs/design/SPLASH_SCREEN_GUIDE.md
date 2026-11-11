# Animated Splash Screen Implementation Guide

## Overview

Complete animated splash screen system with:

- ✅ Moving bird animation
- ✅ Text animations (fade-in, scale)
- ✅ Particle effects (advanced version)
- ✅ Loading indicators
- ✅ Progress bar
- ✅ Auto-navigation on completion

## Splash Screen Variants

### 1. Basic Splash Screen

**File:** `src/screens/SplashScreen.tsx`

Features:

- Bird scale-in animation
- Bird floating animation
- Text fade-in and scale
- Subtitle slide-up animation
- Loading dots indicator
- Simple and elegant

**Animation Sequence:**

```
0ms ─────────────┐
                 ├─> Bird scales in (0-800ms)
                 ├─> Bird floats up/down (looping)
300ms ────────────┤
                  └─> Title fades in and scales (300-1100ms)
800ms ─────────────┤
                   └─> Subtitle fades in and slides up (800-1400ms)
3500ms ────────────> Auto-dismiss and navigate
```

**Usage:**

```typescript
import SplashScreen from '../src/screens/SplashScreen';

<SplashScreen onFinish={() => navigation.navigate('Home')} />
```

### 2. Advanced Splash Screen with Particles

**File:** `src/screens/AdvancedSplashScreen.tsx`

Features:

- Spring animation for bird pop-in
- Particle effects (animated dots)
- Progress bar indicator
- Enhanced floating animation
- Professional feel

**Animation Details:**

- 8 animated particles rising and fading
- Spring-physics bird animation
- Linear progress bar (0-100% over 3 seconds)
- Enhanced title styling

**Usage:**

```typescript
import AdvancedSplashScreen from '../src/screens/AdvancedSplashScreen';

<AdvancedSplashScreen onFinish={() => navigation.navigate('Home')} />
```

## Hook Integration

### useSplashScreen Hook

**File:** `src/hooks/useSplashScreen.ts`

Manages splash screen visibility and app initialization:

```typescript
const { isSplashVisible, hideSplash, isReady, isAuthenticated } =
  useSplashScreen();

// Returns:
// - isSplashVisible: boolean (show/hide splash)
// - hideSplash: () => void (manually hide splash)
// - isReady: boolean (app initialization complete)
// - isAuthenticated: boolean (user auth status)
```

## Root Layout Integration

**File:** `app/_layout.tsx`

The splash screen is automatically displayed on app startup:

```typescript
export default function RootLayout() {
  const { isSplashVisible, hideSplash } = useSplashScreen();

  if (isSplashVisible) {
    return <SplashScreen onFinish={hideSplash} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

## Customization Options

### Change Display Duration

Edit `useSplashScreen.ts`:

```typescript
await new Promise((resolve) => setTimeout(resolve, 2000)); // Change to desired ms
```

### Change Colors

Edit splash screen file's `StyleSheet`:

```typescript
titleAccent: {
  color: '#FF5722', // Change accent color
}
```

### Add Background

```typescript
container: {
  backgroundColor: '#F5F5F5', // Change background
  backgroundImage: require('./bg.png'), // Add background image
}
```

### Customize Text

Edit the `Text` components in JSX:

```typescript
<Text style={styles.title}>YOUR APP NAME</Text>
```

## Animation Properties

### Bird Animation

```typescript
// Scale: 0 → 1 (800ms)
// Rotation: 0° → 360° (4s looping)
// Y Position: -20 → 20 (continuous float)
```

### Text Animation

```typescript
// Opacity: 0 → 1 (800ms)
// Scale: 0.5 → 1 (800ms)
// Y Position: 20 → 0 (600ms)
```

### Particles (Advanced)

```typescript
// Opacity: 1 → 0 (2000ms)
// Y Position: 0 → -200 (2000ms)
// X Position: random ±50 (2000ms)
// Scale: 1 → 0.5 (2000ms)
// Staggered with 200ms delays
```

## Performance Optimization

✅ Uses `useNativeDriver: true` for smooth 60fps animations
✅ Optimized for iOS, Android, and Web
✅ Minimal re-renders with proper dependency arrays
✅ Automatic cleanup with `unsubscribe` return

## Best Practices

1. **Duration:** Keep splash screen 2-3 seconds
2. **Loading:** Use for initial app setup (auth check, data loading)
3. **Navigation:** Automatically routes based on auth status
4. **Customization:** Modify colors/text to match branding
5. **Testing:** Test on real devices for animation smoothness

## Troubleshooting

### Animation Not Starting

- Check that `onFinish` callback is properly connected
- Verify `useNativeDriver: true` is set for all animations
- Ensure component is mounted before animation starts

### Image Not Loading

- Verify image path is correct
- Check that image file exists in project
- Use absolute path for imports

### Performance Issues

- Reduce number of particles (Advanced version)
- Disable looping animations if not needed
- Use `useNativeDriver: true` for all animations

## Animation Libraries

Current implementation uses React Native's built-in `Animated` API:

- No external dependencies
- Excellent performance
- Native driver support
- Works on all platforms

Optional: For more advanced animations, consider:

- `react-native-reanimated` (more powerful)
- `react-native-svg` (complex shapes)
- `lottie-react-native` (JSON animations)

## Files Structure

```
src/
├── screens/
│   ├── SplashScreen.tsx (basic version)
│   └── AdvancedSplashScreen.tsx (with particles)
├── hooks/
│   ├── useSplashScreen.ts (splash state management)
│   └── useAuth.ts (authentication status)
└── services/
    └── auth.ts (authentication logic)

app/
├── _layout.tsx (root with splash integration)
└── screens/
    └── ChatGPT Image Jun 3, 2026, 01_07_18 AM.png (logo)
```

## Switching Between Versions

### To Use Basic Splash Screen:

```typescript
// app/_layout.tsx
import SplashScreen from '../src/screens/SplashScreen';

if (isSplashVisible) {
  return <SplashScreen onFinish={hideSplash} />;
}
```

### To Use Advanced Splash Screen:

```typescript
// app/_layout.tsx
import AdvancedSplashScreen from '../src/screens/AdvancedSplashScreen';

if (isSplashVisible) {
  return <AdvancedSplashScreen onFinish={hideSplash} />;
}
```

## Event Hooks

The splash screen triggers in this order:

1. **App Launch** → Splash displays
2. **Auth Check** → useAuth verifies user
3. **App Init** → useSplashScreen waits 2 seconds
4. **onFinish Called** → hideSplash() triggered
5. **Splash Hides** → Main app displays
6. **Navigation** → Automatically routes based on auth

## Advanced Customization

### Custom Animation Timeline

```typescript
useEffect(() => {
  Animated.sequence([
    Animated.timing(animation1, {
      /* ... */
    }),
    Animated.parallel([
      Animated.timing(animation2, {
        /* ... */
      }),
      Animated.timing(animation3, {
        /* ... */
      }),
    ]),
  ]).start(() => onAnimationComplete?.());
}, []);
```

### Conditional Display

```typescript
if (!isReady) {
  return <SplashScreen onFinish={hideSplash} />;
}

if (!isAuthenticated) {
  return <AuthStack />;
}

return <MainStack />;
```

## Deployment

✅ Ready for production
✅ Tested on iOS and Android
✅ Web compatible
✅ No breaking changes
✅ Zero external dependencies

---

**Status:** ✅ Complete and production-ready
