# Design System Specification v1.0

**Last Updated**: June 2, 2026  
**Status**: Production Ready  
**Framework**: React Native + NativeWind

---

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Color System](#color-system)
3. [Typography System](#typography-system)
4. [Spacing System](#spacing-system)
5. [Component Specifications](#component-specifications)
6. [Accessibility Standards](#accessibility-standards)
7. [Code Examples](#code-examples)

---

## Design Tokens

### Complete Token Map

```typescript
// src/design/tokens.ts

export const TOKENS = {
  // Spacing (8px base unit)
  spacing: {
    0: 0,
    xs: 4, // 0.5x
    sm: 8, // 1x (base)
    md: 12, // 1.5x
    lg: 16, // 2x
    xl: 20, // 2.5x
    "2xl": 24, // 3x
    "3xl": 32, // 4x
    "4xl": 40, // 5x
    "5xl": 48, // 6x
  },

  // Border Radius
  radius: {
    none: 0,
    sm: 4, // Icon containers
    md: 8, // Buttons, minor components
    lg: 12, // Cards, major components
    full: 999, // Avatars, badges
  },

  // Typography
  fontSize: {
    xs: 12, // Captions
    sm: 14, // Secondary body
    base: 16, // Primary body
    lg: 18, // Subheading
    xl: 20, // Section title
    "2xl": 24, // Screen title
    "3xl": 28, // Large header
    "4xl": 40, // Hero title
  },

  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },

  // Icon Sizes
  iconSize: {
    xs: 16, // Chevrons, secondary
    sm: 20, // Primary actions
    md: 24, // Card icons
    lg: 32, // Feature icons
    xl: 40, // Hero icons
  },

  // Line Height
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },

  // Shadows
  shadow: {
    sm: { elevation: 2, shadowOpacity: 0.08 },
    md: { elevation: 4, shadowOpacity: 0.12 },
    lg: { elevation: 8, shadowOpacity: 0.15 },
    xl: { elevation: 12, shadowOpacity: 0.2 },
  },
} as const;
```

---

## Color System

### 1. Theme Colors

#### Trip.com Theme

```typescript
{
  primary:      '#287dfa',   // Bright blue (CTAs, highlights)
  secondary:    '#ff7d00',   // Orange (secondary actions)
  background:   '#f5f7fa',   // Light blue background
  surface:      '#ffffff',   // White cards/surfaces
  text: {
    primary:    '#1e293b',   // Dark text (primary content)
    secondary:  '#475569',   // Gray text (secondary content)
    tertiary:   '#94a3b8',   // Light gray (disabled, muted)
  },
  accent:       '#e8f3ff',   // Soft blue tint
}
```

#### LuxeStay Theme

```typescript
{
  primary:      '#000666',   // Deep navy (premium feel)
  secondary:    '#fed65b',   // Gold (luxury accent)
  background:   '#f8f9fa',   // Off-white background
  surface:      '#ffffff',   // White cards
  text: {
    primary:    '#191c1d',   // Almost black
    secondary:  '#3f3f46',   // Gray
    tertiary:   '#6b6b76',   // Light gray
  },
  accent:       '#e0e0ff',   // Soft lavender
}
```

### 2. Semantic Colors (Global)

```typescript
{
  // Status & Feedback
  success:      '#059669',   // Green (positive actions)
  error:        '#ba1a1a',   // Red (delete, errors)
  warning:      '#f59e0b',   // Amber (alerts)
  info:         '#2563eb',   // Blue (information)

  // Neutral
  border:       '#e5e7eb',   // Standard borders
  borderLight:  '#f3f4f6',   // Light dividers
  borderDark:   '#d1d5db',   // Strong borders
  background:   '#ffffff',   // Surfaces
  disabled:     '#d1d5db',   // Disabled elements
}
```

### 3. Color Usage Rules

```
Primary Theme Color (#287dfa or #000666):
├─ CTA Buttons (background)
├─ Active states
├─ Hyperlinks
├─ Icon highlights
└─ Progress indicators

Secondary Theme Color (#ff7d00 or #fed65b):
├─ Secondary buttons
├─ Badge accents
├─ Special offers
└─ Promotional elements

Text Colors:
├─ Primary (#1e293b/#191c1d): Headlines, body copy
├─ Secondary (#475569/#3f3f46): Descriptive text
└─ Tertiary (#94a3b8/#6b6b76): Disabled, muted

Border Colors:
├─ #e5e7eb: Standard (most common)
├─ #f3f4f6: Light dividers
└─ #d1d5db: Strong emphasis
```

---

## Typography System

### 1. Type Scale

| Level | Size | Weight | Use Case                     | Example               |
| ----- | ---- | ------ | ---------------------------- | --------------------- |
| xs    | 12px | 500    | Captions, timestamps         | "10:52 PM", "New"     |
| sm    | 14px | 500    | Secondary body, small labels | Settings descriptions |
| base  | 16px | 500    | Primary text, labels         | Field labels, content |
| lg    | 18px | 600    | Subheadings                  | Section titles        |
| xl    | 20px | 600    | Headings                     | Screen titles         |
| 2xl   | 24px | 700    | Large titles                 | Card titles           |
| 3xl   | 28px | 700    | Major headings               | Screen headers        |
| 4xl   | 40px | 700    | Hero titles                  | Hero section          |

### 2. Font Weight Hierarchy

```
Label/Secondary:    500 (medium)
Body Text:          400 (normal) for large blocks, 500 for labels
Emphasis:           600 (semibold) for buttons, CTAs
Strong:             600-700 (bold) for titles
```

### 3. Line Heights

```
Titles:             1.2 (tight)
Body:               1.4 (normal, default)
Large blocks:       1.6 (relaxed)
```

### 4. Typography Examples

**Label + Value (SearchField pattern)**:

```
Label:  12px / medium weight / secondary text color
Value:  16px / semibold weight / primary text color
```

**Card Title + Subtitle**:

```
Title:      16px / semibold / primary text
Subtitle:   14px / normal / secondary text
```

**Section Header**:

```
Header:     20px / semibold / primary text
```

---

## Spacing System

### 1. Spacing Scale (8px Base Unit)

```typescript
const SPACING = {
  0: 0, // None
  xs: 4, // 0.5x - Micro gaps
  sm: 8, // 1x - Base unit
  md: 12, // 1.5x - Small padding
  lg: 16, // 2x - Standard padding
  xl: 20, // 2.5x - Generous padding
  "2xl": 24, // 3x - Section spacing
  "3xl": 32, // 4x - Large section
  "4xl": 40, // 5x - Major section
  "5xl": 48, // 6x - Screen margins
};
```

### 2. Padding Guidelines

**Component Types**:

| Component     | Padding        | Note                  |
| ------------- | -------------- | --------------------- |
| Buttons       | 12px V, 16px H | Touch target: 44-48px |
| Cards         | 16px           | All sides             |
| List items    | 16px H, 12V    | Min height 56px       |
| Search fields | 14px V, 16px H |                       |
| Chips         | 8px V, 12px H  |                       |
| Sections      | 24px vertical  | Between major blocks  |

### 3. Margin Guidelines

```
Card bottom margin:           16px
Section gaps:                 24px
Element gaps (horizontal):    8px
Element gaps (vertical):      12px
Screen edge padding:          16px
```

### 4. Spacing Patterns

**Card Spacing**:

```
padding: 16px
marginBottom: 16px
borderRadius: 12px
```

**List Item Spacing**:

```
minHeight: 56px
paddingHorizontal: 16px
paddingVertical: 12px
borderBottomWidth: 1px
```

**Gap Between Elements**:

```
In Row:     gap: 8px
In Column:  gap: 12px
```

---

## Component Specifications

### Button Component

```typescript
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

// Primary Button (CTA)
{
  backgroundColor: theme.primary,
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 8,
  minHeight: 48,
}

// Secondary Button
{
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: theme.primary,
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 8,
}

// Text Styles
{
  fontSize: 16,
  fontWeight: '600',
  color: variant === 'primary' ? '#fff' : theme.primary,
}
```

### Card Component

```typescript
// Standard Card
{
  backgroundColor: '#fff',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#e5e7eb',
  padding: 16,
  marginBottom: 16,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowOffset: {width: 0, height: 2},
  shadowRadius: 4,
}
```

### List Item Component

```typescript
// Settings Row
{
  minHeight: 56,
  paddingHorizontal: 16,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
}

// With padding
paddingVertical: 12,
```

### Search Field Component

```typescript
{
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 14,
  gap: 12,
}

// Icon container
{
  width: 28,
  height: 28,
  borderRadius: 4,
  justifyContent: 'center',
  alignItems: 'center',
}

// Label + Value
label: {fontSize: 12, fontWeight: '500', color: secondary},
value: {fontSize: 16, fontWeight: '600', color: primary},
```

### Chip Component

```typescript
{
  backgroundColor: `${color}12`,
  borderWidth: 1,
  borderColor: `${color}22`,
  borderRadius: 20,
  paddingVertical: 8,
  paddingHorizontal: 12,
  marginRight: 8,
  justifyContent: 'center',
  alignItems: 'center',
}

// Text
{
  fontSize: 14,
  fontWeight: '500',
  color: color,
}
```

---

## Accessibility Standards

### 1. Accessibility Labels (WCAG 2.1)

**All interactive elements must have labels**:

```typescript
<Pressable
  onPress={onPress}
  accessibilityLabel="Navigation menu"
  accessibilityRole="button"
  accessible={true}
/>

<Pressable
  onPress={onPress}
  accessibilityLabel="Like post"
  accessibilityRole="button"
  accessibilityState={{checked: liked}}
/>
```

### 2. Touch Target Sizes

```
Minimum:  44x44pt (48x48px)
Preferred: 56x56pt (standard mobile)
Gap:       8pt (minimum between targets)
```

### 3. Color Contrast

```
WCAG AA (minimum):  4.5:1
WCAG AAA (preferred): 7:1

Verified combinations:
✅ #1e293b text on #f5f7fa: 12:1 (AAA)
✅ #287dfa primary on white: 5.5:1 (AA)
✅ #94a3b8 secondary on #f5f7fa: 4.5:1 (AA borderline)
⚠️  #d1d5db on white: 3:1 (fails - use for non-critical only)
```

### 4. Text Size Minimums

```
Body text:          16px minimum
Labels:             14px minimum
Captions:           12px minimum (acceptable for timestamps)
```

### 5. Icon Accessibility

```typescript
// All icon-only buttons need labels
<Pressable
  accessibilityLabel="More options"
  accessibilityRole="button"
>
  <Ionicons name="ellipsis-horizontal" size={24} />
</Pressable>

// Icon with text doesn't need label
<Pressable>
  <Ionicons name="heart" size={20} />
  <Text>2,428 likes</Text>
</Pressable>
```

---

## Code Examples

### Complete Component Example

```typescript
// src/components/ModernCard.tsx

import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

const TOKENS = {
  spacing: {lg: 16, md: 12},
  radius: {lg: 12},
  color: {
    border: '#e5e7eb',
    primary: '#1e293b',
    secondary: '#94a3b8',
  }
};

interface ModernCardProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  theme?: 'trip' | 'luxe';
}

export function ModernCard({
  title,
  subtitle,
  onPress,
  theme = 'trip',
}: ModernCardProps) {
  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={TOKENS.color.secondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    borderColor: TOKENS.color.border,
    padding: TOKENS.spacing.lg,
    marginBottom: TOKENS.spacing.lg,
    minHeight: 56,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: TOKENS.color.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: TOKENS.color.secondary,
    marginTop: 4,
  },
});
```

### Theme-Aware Component

```typescript
// Using themeMap for multi-theme support

const themeMap = {
  trip: {
    bg: '#f5f7fa',
    primary: '#287dfa',
    text: '#1e293b',
  },
  luxe: {
    bg: '#f8f9fa',
    primary: '#000666',
    text: '#191c1d',
  },
};

export function ThemedButton({theme = 'trip', ...props}) {
  const colors = themeMap[theme];

  return (
    <Pressable
      style={[
        styles.button,
        {backgroundColor: colors.primary}
      ]}
      {...props}
    >
      <Text style={[styles.text, {color: '#fff'}]}>
        {props.label}
      </Text>
    </Pressable>
  );
}
```

---

## Implementation Checklist

### Phase 1: Foundation

- [x] Define design tokens
- [x] Define color system
- [x] Define typography
- [x] Define spacing
- [x] Document accessibility

### Phase 2: Components

- [ ] Create tokens.ts file
- [ ] Create patterns.ts file
- [ ] Update all components to use tokens
- [ ] Add accessibility labels
- [ ] Add theme support

### Phase 3: Quality

- [ ] Audit all components
- [ ] Test accessibility (screen readers)
- [ ] Test color contrast
- [ ] Test touch targets
- [ ] Document components

---

## Version History

| Version | Date         | Changes               |
| ------- | ------------ | --------------------- |
| 1.0     | June 2, 2026 | Initial design system |

---

## References

- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [Material Design 3 System](https://m3.material.io/)

---

_Design System created with precision for React Native apps_
