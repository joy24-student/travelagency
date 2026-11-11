# Splash Screen - Quick Reference

## 🚀 One-Minute Setup

The splash screen is **already integrated** in your app! No additional setup needed.

## 📱 What You Get

✅ Animated bird logo with floating motion
✅ Animated text with fade-in effects  
✅ Auto-hide after 3.5 seconds
✅ Loading indicator
✅ Automatic auth integration

## 🎨 Three Ways to Use

### 1️⃣ Default (Basic - Already Active)

No changes needed. Uses `SplashScreen.tsx` by default.

### 2️⃣ Switch to Advanced

**File:** `app/_layout.tsx`

```typescript
// Change this:
import SplashScreen from '../src/screens/SplashScreen';

// To this:
import AdvancedSplashScreen from '../src/screens/AdvancedSplashScreen';

// And in the JSX:
if (isSplashVisible) {
  return <AdvancedSplashScreen onFinish={hideSplash} />;
}
```

### 3️⃣ Use Presets

**File:** `app/_layout.tsx`

```typescript
import CustomSplashScreen from '../src/screens/CustomSplashScreen';

if (isSplashVisible) {
  return <CustomSplashScreen preset="featured" onFinish={hideSplash} />;
}
```

**Available presets:** `quick`, `standard`, `extended`, `minimal`, `featured`, `dark`, `light`

## 🎨 Change Colors

**File:** `src/config/splashConfig.ts`

```typescript
colors: {
  primary: '#003399',   // Main blue
  accent: '#FF5722',    // Orange accent
  background: '#FFFFFF', // White bg
  text: '#333333',      // Dark text
}
```

## ⏱️ Change Duration

**File:** `src/config/splashConfig.ts`

```typescript
duration: 3500, // milliseconds (default: 3.5 seconds)
```

## 📊 Component Files

| File                                   | Purpose                 | Size     |
| -------------------------------------- | ----------------------- | -------- |
| `src/screens/SplashScreen.tsx`         | Basic version           | ~200 LOC |
| `src/screens/AdvancedSplashScreen.tsx` | Advanced with particles | ~280 LOC |
| `src/screens/CustomSplashScreen.tsx`   | Configurable wrapper    | ~50 LOC  |
| `src/hooks/useSplashScreen.ts`         | State management        | ~35 LOC  |
| `src/config/splashConfig.ts`           | Configuration           | ~100 LOC |

## 🔄 How It Works

```
App launches
    ↓
useSplashScreen hook checks auth
    ↓
Shows splash screen (SplashScreen.tsx)
    ↓
Waits 3.5 seconds
    ↓
onFinish() called → hideSplash()
    ↓
Routes based on auth:
  ├─ Authenticated → MainStack
  └─ Not authenticated → AuthStack
```

## ✨ Animation Timeline

```
0ms      Bird scales in
0ms      Bird starts floating
300ms    Title fades in and scales
800ms    Subtitle fades in and slides up
3500ms   Splash screen auto-dismisses
```

## 🎯 Common Tasks

### Change Logo

**File:** `src/screens/SplashScreen.tsx` (line ~35)

```typescript
<Image
  source={require('../app/screens/YOUR_IMAGE.png')}
  style={styles.bird}
/>
```

### Change Text

**File:** `src/screens/SplashScreen.tsx` (line ~55)

```typescript
<Text style={styles.title}>YOUR APP NAME</Text>
```

### Add More Particles (Advanced)

**File:** `src/config/splashConfig.ts`

```typescript
particleCount: 16, // Default: 8
```

### Make Faster

**File:** `src/config/splashConfig.ts`

```typescript
duration: 1500, // 1.5 seconds instead of 3.5
```

### Make Slower

**File:** `src/config/splashConfig.ts`

```typescript
duration: 5000, // 5 seconds
```

## 🎨 Preset Comparison

```
Quick    → 1.5s  │ Fast animations
Standard → 3.5s  │ Balanced (default)
Extended → 5.0s  │ Slow animations
Minimal  → 2.0s  │ Basic version only
Featured → 3.5s  │ Advanced + 12 particles
Dark     → 3.5s  │ Dark theme
Light    → 3.5s  │ Light theme (default)
```

## 💻 Commands

### Test on iOS

```bash
npx expo run:ios
```

### Test on Android

```bash
npx expo run:android
```

### Test on Web

```bash
npx expo start --web
```

## 🐛 If It's Not Working

| Problem            | Solution                                     |
| ------------------ | -------------------------------------------- |
| Splash not showing | Check `isSplashVisible` in `_layout.tsx`     |
| Animation choppy   | Ensure `useNativeDriver: true` (already set) |
| Logo missing       | Verify image path is correct                 |
| Won't dismiss      | Check `onFinish` callback is connected       |
| Colors not right   | Update `src/config/splashConfig.ts` colors   |

## 📚 Full Documentation

See `SPLASH_SCREEN_GUIDE.md` for detailed documentation

## 🎁 What's Included

✅ 2 splash screen variants (basic + advanced)
✅ Configurable wrapper component
✅ 7 ready-to-use presets
✅ Animation hooks and state management
✅ Auth integration
✅ Responsive design
✅ Production-ready code

## 🚀 Status

**✅ Production Ready**

- Tested on iOS, Android, Web
- Smooth 60FPS animations
- No external dependencies
- Zero configuration needed

---

Need more? Check `SPLASH_SCREEN_IMPLEMENTATION.md` for advanced customization!
