/**
 * DESIGN SYSTEM & UI COMPONENTS
 * Comprehensive guide for all screens across User App & AGEN App
 * Consistent colors, typography, and component patterns
 */

# 🎨 Complete Design System

## Color Palettes

### User App - Light Theme
```
PRIMARY: #287dfa (Blue)
BACKGROUND: #f9fafb (Light Gray)
TEXT_PRIMARY: #111827 (Dark Gray)
TEXT_SECONDARY: #6b7280 (Medium Gray)
TEXT_TERTIARY: #9ca3af (Light Gray)
BORDER: #e5e7eb (Very Light Gray)
CARD_BG: #ffffff (White)
SUCCESS: #10b981 (Green)
WARNING: #f59e0b (Amber)
ERROR: #ef4444 (Red)
INFO: #3b82f6 (Blue)
```

### AGEN App - Dark Theme
```
PRIMARY: COLORS.primary (Defined in App)
BACKGROUND: #0B1326 (Very Dark)
SURFACE: rgba(255, 255, 255, 0.05) (Semi-transparent white)
TEXT_PRIMARY: #DAE2FD (Light blue)
TEXT_SECONDARY: #918fa0 (Medium gray)
TEXT_TERTIARY: #64748B (Dark gray)
BORDER: rgba(255, 255, 255, 0.08) (Semi-transparent border)
INPUT_BG: rgba(255, 255, 255, 0.05)
OVERLAY: rgba(0, 0, 0, 0.75)
```

---

## Typography Scale

### Headings
- **H1**: 28px, Weight 700, Letter Spacing 0.5px
- **H2**: 24px, Weight 700
- **H3**: 20px, Weight 700
- **H4**: 18px, Weight 700

### Body Text
- **Large**: 16px, Weight 400-600
- **Regular**: 14px, Weight 400-600
- **Small**: 13px, Weight 400-500
- **Extra Small**: 11px, Weight 400-500

### Special
- **Menu Labels**: 15px, Weight 700
- **Menu Subtitles**: 13px, Weight 400
- **Section Headers**: 16px, Weight 700
- **Modal Titles**: 20px, Weight 800

---

## Spacing System

```
xs: 4px
sm: 8px
md: 12px
lg: 16px (standard)
xl: 20px
xxl: 24px
xxxl: 32px
```

### Common Spacing Patterns
- **Card Padding**: 16px
- **Section Gap**: 12px
- **Section Margin Bottom**: 24px
- **Header Padding**: 16px (horizontal), 14px (vertical)
- **Modal Padding**: 24px
- **Button Padding**: 12px (horizontal), 12px (vertical)

---

## Component Library

### 1. Menu Item (Settings)
```
Layout: Row
Items: Icon | Label/Value | Chevron

Icon:
- Size: 20px
- Background: Primary color + 12% opacity
- Radius: 20px
- Dimensions: 40x40px

Label:
- Size: 15px
- Weight: 700
- Color: Text Primary

Subtitle:
- Size: 13px
- Color: Text Secondary
- Margin Top: 2px
```

### 2. Section Card
```
Background: Card BG (white or surface)
Border Radius: 12px
Padding: 16px
Overflow: hidden

Children:
- Multiple menu items
- Dividers between items
- Last item has no divider
```

### 3. Toggle Switch
```
Colors:
- Off Track: rgba(0,0,0,0.1)
- On Track: Primary color
- Thumb: Primary color

Platform: Native
Animation: Smooth slide
```

### 4. Modal
```
Container:
- Overlay: Semi-transparent (rgba(0,0,0,0.4-0.75))
- Animation: slide from bottom
- Border Radius Top: 32px

Header:
- Padding: 24px
- Border Bottom: 1px divider
- Title: 20px, Weight 800

Body:
- Padding: 24px
- Max Height: 85% of screen

Footer:
- Buttons at bottom
- Padding: 24px
```

### 5. Button Styles

#### Primary Button
```
Background: Primary color
Padding: 16px
Border Radius: 8px
Text: White, 16px, Weight 700
```

#### Secondary Button
```
Background: Surface/Light Gray
Padding: 16px
Border Radius: 8px
Text: Primary color, 16px, Weight 600
```

#### Tertiary Button
```
Background: Transparent
Border: 1px Primary
Padding: 16px
Border Radius: 8px
Text: Primary color, 16px, Weight 600
```

### 6. Input Fields
```
Background: Input BG (Light gray or semi-transparent)
Border: 1px Light border
Border Radius: 8px
Padding: 12px
Font Size: 14px
Font Color: Text Primary
Placeholder Color: Text Tertiary
```

### 7. Card Components

#### Info Card
```
Background: Light (Primary + 12% opacity)
Border Radius: 12px
Padding: 16px
Gap: 12px

Icon:
- Size: 24px
- Color: Primary
- Background: Lighter

Content:
- Title: 14px, Weight 600
- Description: 12px, Weight 400
```

#### Status Card
```
Background: Color coded
Padding: 12px 16px
Border Radius: 20px
Flex Direction: Row
Align Items: Center
Gap: 8px

Indicator:
- Width: 8px
- Height: 8px
- Border Radius: 4px
- Background: Status color
```

---

## Layout Patterns

### Full Screen Layout
```
SafeAreaView
├── Header (Fixed)
│   ├── Back Button
│   ├── Title (Centered)
│   └── Spacer
├── ScrollView (Flex: 1)
│   ├── Multiple sections
│   └── Bottom padding: 100px
├── AI Pill (Fixed Bottom)
└── Bottom Nav (Fixed Bottom)
```

### Modal Layout
```
Modal
└── SafeAreaView
    ├── Header (Fixed)
    │   ├── Title
    │   └── Close Button
    ├── ScrollView
    │   ├── Options/Content
    │   └── Bottom padding
    └── Footer Actions (if needed)
```

### Card Section Layout
```
Section
├── Title: 16px, Weight 700, margin bottom 12px
└── Card Container
    ├── MenuItem
    ├── Divider
    ├── MenuItem
    ├── Divider
    └── MenuItem (no divider after)
```

---

## Animation Patterns

### Transitions
- **Modal Slide**: 300ms ease-out
- **Button Press**: 150ms opacity
- **Page Navigation**: 300ms slide
- **Fade In**: 200ms ease-in

### Interactions
- **Touch Feedback**: 0.7 opacity on press
- **Button Hover**: Slight scale up (1.02x)
- **Toggle Animation**: Smooth slide 250ms
- **Modal Dismiss**: Slide down 300ms

---

## Responsive Breakpoints

### Mobile (< 375px)
- Padding: 12px
- Font Sizes: -1px
- Gap: 8px

### Standard (375px - 667px)
- Padding: 16px (default)
- Font Sizes: standard
- Gap: 12px

### Large (> 667px)
- Padding: 20px
- Font Sizes: +1-2px
- Gap: 16px
- Content Max Width: 1000px

---

## Accessibility

### Color Contrast
- Text on Background: 4.5:1 minimum
- UI Components: 3:1 minimum
- Focus indicators: Clear and visible

### Touch Targets
- Minimum size: 44x44pt
- Minimum spacing: 8pt between targets

### Text
- Readable font sizes: 14px minimum
- Line height: 1.5 minimum
- Letter spacing: Adequate for readability

---

## Dark Mode Implementation

### AGEN App (Native Dark)
- Uses rgba(255, 255, 255, X) for surfaces
- Text automatically adjusts
- No color scheme switching needed

### User App (Potential)
- Uses conditional styling based on darkMode state
- Same color definitions, inverted theme
- Platform-aware implementation

---

## State Indicators

### Loading
- Circular spinner
- Color: Primary
- Size: 40px (large), 24px (small)

### Empty State
- Icon: 64px, color #d1d5db
- Title: 18px, Weight 700
- Subtitle: 14px, secondary color

### Error State
- Background: Error color + low opacity
- Icon: Error color
- Message: Clear and actionable

### Success State
- Toast or confirmation modal
- Icon: Checkmark
- Color: Success color (#10b981)
- Duration: 2-3 seconds

---

## Form Patterns

### Standard Form
```
Section
├── Label (14px, Weight 600)
├── Input Field
│   ├── Placeholder text
│   ├── Focus state (border highlight)
│   └── Error state (red border + message)
├── Helper text (12px, secondary)
└── Divider
```

### Validation
- **Required**: Red border + error message
- **Success**: Green checkmark
- **Warning**: Amber icon + message
- **Info**: Blue icon + message

---

## Navigation Components

### Header
```
Background: White (#fff) or Surface
Height: 60px
Content:
├── Back Button (left)
├── Title (center)
└── Action/Spacer (right)
Border Bottom: 1px divider
```

### Bottom Navigation (User App)
```
Height: 60px
Items: 5 max
Selected: Primary color + bold text
Unselected: Secondary color

Icons: 24px
Labels: 10px, Weight 600
```

### Tab Navigation
```
Background: Light/Surface
Height: 48px
Items: 2-4
Indicator: Bottom border (2px)
Animation: Smooth slide
```

---

## Platform-Specific Considerations

### iOS
- Safe area insets: Top + Bottom
- Status bar: Light/Dark content
- Navigation: Swipe back gesture support
- Modals: Slide from bottom (native)

### Android
- Status bar: Light/Dark content
- Navigation: Material back button
- Modals: Slide from bottom
- Back button: Hardware + software

---

## Component States

### Buttons
- **Default**: Full color, enabled
- **Hover**: Slight opacity change
- **Active**: Pressed opacity (0.8)
- **Disabled**: Grayed out (0.5 opacity)
- **Loading**: Spinner replacing text

### Input Fields
- **Default**: Light background, normal border
- **Focus**: Primary border, cursor visible
- **Filled**: Text visible
- **Error**: Red border + error message
- **Disabled**: Grayed out, no interaction

### Menu Items
- **Default**: Normal appearance
- **Hover**: Slight background change
- **Active**: Primary color highlight
- **Disabled**: Grayed out

---

## Typography Usage

### Headlines
- Page Title: H3 (20px)
- Section Header: H4 (18px)
- Card Title: Large (16px)

### Body
- Menu Labels: Menu Labels style (15px)
- Description: Regular (14px)
- Helper Text: Small (13px)
- Timestamps: Extra Small (11px)

### Emphasis
- Bold: Weight 700
- Semi-bold: Weight 600
- Regular: Weight 400

---

## Icon System

### Sizes
- **Small**: 16px (inline icons)
- **Medium**: 20px (in menus)
- **Large**: 24px (buttons, headers)
- **Extra Large**: 48-64px (illustrations)

### Colors
- **Primary**: Primary color
- **Secondary**: Secondary text color
- **Disabled**: Lighter gray
- **Success/Error**: Status colors

### Library
- User App: Ionicons
- AGEN App: MaterialCommunityIcons

---

**Status**: ✅ **COMPLETE DESIGN SYSTEM**  
**Version**: 1.0  
**Last Updated**: June 12, 2026
