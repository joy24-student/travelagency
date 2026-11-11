# Component Reference Guide

## Quick Navigation

### Reusable Components (`src/components/`)

#### SettingsRow.tsx

A row component for displaying settings with optional label, value, toggle, or chevron.

**Props:**

- `label: string` - Setting label
- `value?: string` - Setting value
- `showChevron?: boolean` - Show right chevron
- `onPress?: () => void` - Press handler
- `rightComponent?: React.ReactNode` - Custom right component (e.g., toggle)
- `hasBorder?: boolean` - Show bottom border

**Usage:**

```tsx
<SettingsRow label="Language" value="English" />
<SettingsRow label="Dark Theme" showChevron={false} rightComponent={<Toggle />} />
```

---

#### NotificationCard.tsx

A notification/message card with badge, title, time, and action button.

**Props:**

- `badge?: React.ReactNode` - Badge component
- `title: string` - Notification title
- `subtitle?: string` - Notification subtitle
- `time?: string` - Timestamp
- `actionText?: string` - Action button text
- `onAction?: () => void` - Action callback
- `onPress?: () => void` - Card press callback

**Usage:**

```tsx
<NotificationCard
  badge={<BadgeIcon />}
  title="Congratulations! You're now a Silver Member!"
  subtitle="Tap here to unlock your benefits!"
  time="10:52 PM"
  actionText="View details"
  onAction={() => {}}
/>
```

---

#### CommunityPost.tsx

A full social media post component with author, image, and engagement metrics.

**Props:**

- `authorName: string` - Author name
- `authorImage?: string` - Author avatar URL
- `role?: string` - Author role
- `location?: string` - Location text
- `timestamp?: string` - Time since posted
- `title: string` - Post title
- `description?: string` - Post description
- `postImage?: string` - Featured image URL
- `likes?: number` - Like count
- `comments?: number` - Comment count
- `liked?: boolean` - Is liked by current user
- `onLike?: () => void` - Like handler
- `onComment?: () => void` - Comment handler
- `onShare?: () => void` - Share handler

**Usage:**

```tsx
<CommunityPost
  authorName="Julianna V."
  role="Influencer"
  location="Amalfi Coast, Italy"
  title="Wandering through paradise"
  description="The colors, the vibes, everything is pure magic"
  postImage={imageUrl}
  likes={2428}
  comments={156}
  onLike={() => setLiked(!liked)}
/>
```

---

#### SearchField.tsx

A search field component with icon, label, and value display.

**Props:**

- `icon?: string` - Ionicon name
- `label: string` - Field label
- `value: string` - Current value
- `onPress?: () => void` - Press handler
- `isBorder?: boolean` - Show bottom border

**Usage:**

```tsx
<SearchField
  icon="location"
  label="Destination"
  value="Tokyo"
  onPress={() => navigate("destination")}
/>
```

---

#### RewardCard.tsx

A reward or offer card with icon, title, discount badge.

**Props:**

- `title: string` - Card title
- `subtitle?: string` - Subtitle
- `icon?: string` - Ionicon name
- `iconColor?: string` - Icon color (default: #287dfa)
- `discount?: string` - Discount text (e.g., "10% off")
- `onPress?: () => void` - Press handler
- `style?: any` - Custom styles

**Usage:**

```tsx
<RewardCard
  title="Hotels & Homes"
  subtitle="Enjoy"
  discount="10% off"
  icon="gift"
  iconColor="#287dfa"
  onPress={() => navigate("rewards")}
/>
```

---

#### StoriesBar.tsx

A horizontal scrollable stories carousel with add story button.

**Props:**

- `stories?: Array<{name: string, image?: string}>` - Story data
- `onAddStory?: () => void` - Add story handler
- `onStoryPress?: (name: string) => void` - Story press handler

**Usage:**

```tsx
<StoriesBar
  stories={[
    { name: "Marcus", image: "https://..." },
    { name: "Elena", image: "https://..." },
  ]}
  onAddStory={() => showStoryCamera()}
  onStoryPress={(name) => viewStory(name)}
/>
```

---

#### SettingsScreen.tsx

Complete settings screen layout with sections and components.

**Props:**

- `title: string` - Screen title

**Features:**

- Localization settings (Language, Currency, Units, Temperature, Time Format)
- Account management
- Interface settings (Dark Theme, Notifications, Accessibility)
- Legal settings (Terms, Privacy, Opt-out)

**Usage:**

```tsx
<SettingsScreen title="Settings" />
```

---

### Screen Components (`src/screens/`)

#### ConvertedScreen.tsx

Generic screen renderer that adapts based on screen metadata.

**Props:**

- `screen: UIScreen` - Screen configuration

**Automatically renders:**

- Hero section with image and gradient overlay
- Tabs (for Hotels, Flights, etc.)
- Chip rail (for destination suggestions)
- Search fields (for booking forms)
- Action grid (for quick access items)
- Benefit pills (for new user offers)
- Image features (for promotional content)
- Content cards (for destinations, tours, etc.)
- Community posts (for feed items)
- AI assistant blocks
- Bottom navigation with tabs
- Floating AI pill

**Usage:**

```tsx
const screen = screens.find((s) => s.slug === "hotels-homes");
<ConvertedScreen screen={screen} />;
```

---

#### SettingsSpecializedScreen.tsx

Custom settings screen with full layout and UI elements.

**Props:**

- `screen: UIScreen` - Screen configuration

**Features:**

- Customized header with back button
- Multiple settings sections with separators
- Toggle components for boolean settings
- Chevron indicators for navigation items
- Full scroll support
- Bottom navigation

**Usage:**

```tsx
<SettingsSpecializedScreen screen={settingsScreen} />
```

---

#### CommunitySpecializedScreen.tsx

Community feed screen with stories and posts.

**Props:**

- `screen: UIScreen` - Screen configuration

**Features:**

- Stories carousel at top
- Community posts with engagement
- Author profiles with roles
- Like/comment/share actions
- Floating AI pill
- Bottom navigation

**Usage:**

```tsx
<CommunitySpecializedScreen screen={communityScreen} />
```

---

#### TopBar.tsx

Shared top navigation bar with back button and title.

**Props:**

- `screen: UIScreen` - Screen configuration (for title and theme)

**Features:**

- Back button (goes to previous screen or home)
- Source file reference
- Screen title
- More options button
- Theme-aware colors

**Usage:**

```tsx
<TopBar screen={currentScreen} />
```

---

#### Navigation.tsx

Exports for bottom navigation and AI pill components.

**Components:**

1. **AiPill** - Floating AI assistant button
   - Props: `color: string` (primary color)
   - Position: Floating above bottom nav

2. **BottomNav** - Tab navigation bar
   - Props:
     - `active: string` - Current tab name
     - `color: string` - Primary color
   - Tabs: Home, Messages, Post, My Trips, Account

**Usage:**

```tsx
<AiPill color="#287dfa" />
<BottomNav active="Home" color="#287dfa" />
```

---

## Screen Data Structure

```typescript
// From src/data/screens.ts
type UIScreen = {
  slug: string; // Unique identifier
  source: string; // HTML file reference
  title: string; // Display title
  subtitle: string; // Display subtitle
  kind: ScreenKind; // Screen type
  theme: "trip" | "luxe"; // Color theme
  hero?: string; // Hero image URL
  image?: string; // Feature image URL
  tabs?: string[]; // Tab labels
  fields?: string[]; // Search form fields
  chips?: string[]; // Chip suggestions
  actions?: string[]; // Action grid items
  benefits?: string[]; // Benefit pills
  cards?: Array<{
    // Content cards
    title: string;
    subtitle?: string;
    meta?: string;
    price?: string;
  }>;
  activeTab?: string; // Active bottom nav tab
};
```

---

## Theme System

### Trip.com Theme

```typescript
{
  bg: '#f5f7fa',           // Light blue background
  primary: '#287dfa',      // Bright blue
  accent: '#ff7d00',       // Orange accent
  text: '#333333',         // Dark text
  soft: '#e8f3ff',         // Soft blue tint
}
```

### LuxeStay Theme

```typescript
{
  bg: '#f8f9fa',           // Off-white background
  primary: '#000666',      // Deep navy
  accent: '#fed65b',       // Gold accent
  text: '#191c1d',         // Almost black
  soft: '#e0e0ff',         // Soft lavender
}
```

---

## Best Practices

### Creating New Components

1. Use TypeScript interfaces for props
2. Export component and StyleSheet separately
3. Implement proper accessibility labels
4. Use NativeWind for styling
5. Add type safety with Ionicons glyphMap

### Using Existing Components

1. Check props interface first
2. Pass all required props
3. Use theme colors consistently
4. Handle loading states if fetching data
5. Test on both iOS and Android

### Styling

- Use flex layout (no CSS Grid)
- Maintain consistent spacing (8px base)
- Use theme colors from themeMap
- Add shadows for elevation
- Use borderRadius for modern look
- Respect SafeAreaView boundaries
