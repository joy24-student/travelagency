# Supabase Integration Guide

Complete guide for using Supabase services, repositories, and hooks across all screens.

## Table of Contents

1. [Setup](#setup)
2. [Architecture](#architecture)
3. [Using Services](#using-services)
4. [Using Repositories](#using-repositories)
5. [Using Hooks](#using-hooks)
6. [Examples by Screen](#examples-by-screen)
7. [Real-time Subscriptions](#real-time-subscriptions)
8. [Error Handling](#error-handling)

---

## Setup

### 1. Environment Variables

```bash
# .env.local
EXPO_PUBLIC_SUPABASE_URL=https://htkpmrfhoijznigwimwj.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_L-imfE-H1FnYefIOH6_cdQ_nOO2PImv
```

### 2. Install Dependencies

```bash
npm install @supabase/supabase-js @react-native-async-storage/async-storage
```

### 3. Import in App

```typescript
import { useAuth } from './hooks';

export default function App() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return isAuthenticated ? <MainApp /> : <AuthStack />;
}
```

---

## Architecture

### Service Layer

- **Services**: Business logic abstraction
  - `authService`: Authentication (sign up, sign in, logout)
  - Repositories: Data access layer

### Repository Layer

- **Repositories**: Direct database access
  - `userRepository`: User profiles, preferences, addresses
  - `bookingRepository`: Bookings, payments, passengers
  - `searchRepository`: Hotels, flights, tours, airports
  - `communityRepository`: Posts, comments, reactions, follows
  - `loyaltyRepository`: Points, rewards, redemptions
  - `supportRepository`: Tickets, messages, FAQ

### Hook Layer

- **Hooks**: React integration
  - `useAuth()`: Authentication state
  - `useQuery()`: Data fetching
  - `useMutation()`: Creating/updating data
  - Specialized hooks for each feature

---

## Using Services

### Authentication Service

```typescript
import { authService } from "@/services";

// Sign up
const result = await authService.signUp(
  "user@example.com",
  "password123",
  "John",
  "Doe",
);

// Sign in
const session = await authService.signIn("user@example.com", "password123");

// Sign out
await authService.signOut();

// Get current user
const user = await authService.getCurrentUser();

// Reset password
await authService.resetPassword("user@example.com");

// Listen to auth changes
const unsubscribe = authService.onAuthStateChange((isAuth, user) => {
  console.log("Auth state changed:", isAuth, user);
});
```

---

## Using Repositories

### User Repository

```typescript
import { userRepository } from "@/services";

// Get profile
const profile = await userRepository.getProfile();

// Update profile
const updated = await userRepository.updateProfile(userId, {
  bio: "I love travel",
  avatar_url: "https://...",
});

// Get preferences
const prefs = await userRepository.getPreferences(userId);

// Update preferences
await userRepository.updatePreferences(userId, {
  language: "en",
  currency: "USD",
  theme: "dark",
});

// Get addresses
const addresses = await userRepository.getAddresses(userId);

// Add address
const address = await userRepository.addAddress(userId, {
  type: "billing",
  full_name: "John Doe",
  street_address: "123 Main St",
  city: "New York",
  country: "US",
});
```

### Booking Repository

```typescript
import { bookingRepository } from "@/services";

// Get user bookings
const bookings = await bookingRepository.getUserBookings(userId, "confirmed");

// Get specific booking
const booking = await bookingRepository.getBooking(bookingId);

// Create booking
const newBooking = await bookingRepository.createBooking(userId, {
  product_type: "flight",
  total_price: 500,
  destination_city: "Paris",
  check_in_date: "2024-06-15",
});

// Confirm booking
await bookingRepository.confirmBooking(bookingId);

// Cancel booking
await bookingRepository.cancelBooking(bookingId, "Personal reasons");

// Add passenger
await bookingRepository.addPassenger(bookingId, {
  first_name: "Jane",
  last_name: "Doe",
  email: "jane@example.com",
  passenger_type: "adult",
});

// Create payment
const payment = await bookingRepository.createPayment(bookingId, {
  amount: 500,
  payment_method: "credit_card",
  payment_status: "processing",
});

// Update payment status
await bookingRepository.updatePaymentStatus(
  paymentId,
  "completed",
  "stripe_transaction_id",
);
```

### Search Repository

```typescript
import { searchRepository } from "@/services";

// Search hotels
const hotels = await searchRepository.searchHotels({
  city: "Paris",
  country: "FR",
  minRating: 4,
});

// Get hotel details
const hotel = await searchRepository.getHotel(hotelId);

// Get room availability
const availability = await searchRepository.getHotelRoomAvailability(
  roomId,
  "2024-06-15",
  "2024-06-20",
);

// Search flights
const flights = await searchRepository.searchFlights({
  departureAirportId: "CDG",
  arrivalAirportId: "JFK",
  departureDate: "2024-06-15",
});

// Search tours
const tours = await searchRepository.searchTours({
  destination: "Eiffel Tower",
  difficultyLevel: "easy",
});

// Get airports
const airports = await searchRepository.getAirports();

// Search airports
const results = await searchRepository.searchAirports("CDG");
```

---

## Using Hooks

### Authentication Hook

```typescript
import { useAuth } from '@/hooks';

export function LoginScreen() {
  const { signIn, signUp, signOut, isAuthenticated, user, loading } = useAuth();

  const handleLogin = async () => {
    try {
      await signIn('user@example.com', 'password123');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (loading) return <LoadingScreen />;

  if (isAuthenticated) {
    return (
      <View>
        <Text>Welcome, {user?.email}</Text>
        <Button title="Sign Out" onPress={signOut} />
      </View>
    );
  }

  return (
    <View>
      <Button title="Sign In" onPress={handleLogin} />
    </View>
  );
}
```

### Query Hook

```typescript
import { useQuery } from '@/hooks';

export function HotelsScreen() {
  const { data: hotels, loading, error, refetch } = useQuery(
    async () => {
      return await searchRepository.searchHotels({
        city: 'Paris',
        minRating: 4,
      });
    }
  );

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} onRetry={refetch} />;

  return (
    <FlatList
      data={hotels}
      renderItem={({ item }) => <HotelCard hotel={item} />}
      refreshing={loading}
      onRefresh={refetch}
    />
  );
}
```

### Mutation Hook

```typescript
import { useMutation } from '@/hooks';

export function CreateBookingButton() {
  const { mutate: createBooking, loading, error, data } = useMutation(
    async (bookingData) => {
      return await bookingRepository.createBooking(userId, bookingData);
    }
  );

  const handlePress = async () => {
    try {
      const booking = await createBooking({
        product_type: 'flight',
        total_price: 500,
        destination_city: 'Paris',
      });
      console.log('Booking created:', booking);
    } catch (error) {
      console.error('Failed to create booking:', error);
    }
  };

  return (
    <Button
      title={loading ? 'Creating...' : 'Book Now'}
      onPress={handlePress}
      disabled={loading}
    />
  );
}
```

### Specialized Hooks

```typescript
import {
  useUserProfile,
  useUserBookings,
  useSearchHotels,
  usePostsFeed,
  useLoyaltyAccount,
} from "@/hooks";

// Get user profile
const { profile, loading, updateProfile } = useUserProfile(userId);

// Get user bookings
const { bookings, loading, refetch } = useUserBookings(userId);

// Search hotels
const { hotels, loading, refetch } = useSearchHotels({
  city: "Paris",
  minRating: 4,
});

// Get posts feed
const { posts, loading, refetch } = usePostsFeed();

// Get loyalty account
const { account, loading } = useLoyaltyAccount(userId);
```

---

## Examples by Screen

### Home Screen (trip-home-sticky-1)

```typescript
import { useSearchHotels, useSearchFlights, usePostsFeed } from '@/hooks';

export function HomeScreen() {
  const { hotels } = useSearchHotels({ minRating: 4 });
  const { flights } = useSearchFlights();
  const { posts } = usePostsFeed();

  return (
    <ScrollView>
      <HeroSection />
      <SearchBar />
      <Section title="Featured Hotels">
        {hotels.map(hotel => <HotelCard key={hotel.id} hotel={hotel} />)}
      </Section>
      <Section title="Recent Posts">
        {posts.map(post => <PostCard key={post.id} post={post} />)}
      </Section>
    </ScrollView>
  );
}
```

### Hotels Discovery Screen

```typescript
import { useSearchHotels, useHotel } from '@/hooks';

export function HotelsDiscoveryScreen() {
  const [filters, setFilters] = useState({ city: 'Paris', minRating: 4 });
  const { hotels, loading, refetch } = useSearchHotels(filters);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <View>
      <FilterBar onChange={handleFilterChange} />
      <FlatList
        data={hotels}
        renderItem={({ item }) => (
          <HotelCard
            hotel={item}
            onPress={() => navigation.navigate('HotelDetails', { hotelId: item.id })}
          />
        )}
        refreshing={loading}
        onRefresh={refetch}
      />
    </View>
  );
}
```

### My Trips Screen

```typescript
import { useUserBookings } from '@/hooks';
import { useAuth } from '@/hooks';

export function MyTripsScreen() {
  const { user } = useAuth();
  const { bookings, loading } = useUserBookings(user?.id);

  const upcomingTrips = bookings.filter(b => new Date(b.check_in_date) > new Date());
  const pastTrips = bookings.filter(b => new Date(b.check_in_date) <= new Date());

  return (
    <View>
      <Section title="Upcoming Trips">
        {upcomingTrips.map(trip => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </Section>
      <Section title="Past Trips">
        {pastTrips.map(trip => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </Section>
    </View>
  );
}
```

### Community Screen

```typescript
import { usePostsFeed, useCreatePost, usePostInteractions } from '@/hooks';
import { useAuth } from '@/hooks';

export function CommunityScreen() {
  const { user } = useAuth();
  const { posts, loading, refetch } = usePostsFeed();
  const { createPost, loading: creating } = useCreatePost(user?.id);

  const handleCreatePost = async (content, images) => {
    try {
      await createPost({ content, visibility: 'public' });
      refetch();
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  return (
    <View>
      <PostCreationForm onSubmit={handleCreatePost} />
      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            userId={user?.id}
            onLike={() => {}}
            onComment={() => {}}
          />
        )}
        refreshing={loading}
        onRefresh={refetch}
      />
    </View>
  );
}
```

### Rewards Screen

```typescript
import { useLoyaltyAccount, useAvailableRewards, useRedeemReward } from '@/hooks';
import { useAuth } from '@/hooks';

export function RewardsScreen() {
  const { user } = useAuth();
  const { account } = useLoyaltyAccount(user?.id);
  const { rewards } = useAvailableRewards();
  const { redeem, loading } = useRedeemReward(account?.id);

  return (
    <View>
      <LoyaltyCard
        tier={account?.tier}
        points={account?.points_balance}
        nextTierThreshold={account?.next_tier_threshold}
      />
      <FlatList
        data={rewards}
        renderItem={({ item }) => (
          <RewardCard
            reward={item}
            canRedeem={account?.points_balance >= item.points_required}
            onRedeem={() => redeem(item.id)}
            isRedeeming={loading}
          />
        )}
      />
    </View>
  );
}
```

### Support Screen

```typescript
import { useUserTickets, useCreateTicket, useFAQ } from '@/hooks';
import { useAuth } from '@/hooks';

export function SupportScreen() {
  const { user } = useAuth();
  const { tickets, loading } = useUserTickets(user?.id);
  const { faqItems, categories } = useFAQ();
  const { createTicket } = useCreateTicket(user?.id);

  return (
    <View>
      <Section title="FAQs">
        {faqItems.map(faq => (
          <FAQItem key={faq.id} faq={faq} />
        ))}
      </Section>
      <Section title="Your Tickets">
        {tickets.map(ticket => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </Section>
      <Button
        title="Create New Ticket"
        onPress={() => {
          // Open ticket creation modal
        }}
      />
    </View>
  );
}
```

---

## Real-time Subscriptions

### Subscribe to Posts

```typescript
import { useRealtimeSubscription } from '@/hooks';

export function CommunityFeed() {
  const [posts, setPosts] = useState([]);

  // Real-time subscription
  useRealtimeSubscription('posts', 'INSERT', (newPost) => {
    setPosts([newPost, ...posts]);
  });

  return <FlatList data={posts} renderItem={renderPost} />;
}
```

### Subscribe to Bookings

```typescript
export function BookingStatus() {
  const [booking, setBooking] = useState(null);

  // Real-time subscription to payment updates
  useRealtimeSubscription('booking_payments', 'UPDATE', (updatedPayment) => {
    if (updatedPayment.booking_id === bookingId) {
      // Update UI when payment status changes
      setBooking({ ...booking, payment: updatedPayment });
    }
  });

  return <BookingCard booking={booking} />;
}
```

---

## Error Handling

```typescript
export function SafeDataFetch() {
  const { data, loading, error, refetch } = useQuery(
    async () => await searchRepository.searchHotels()
  );

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load hotels</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        <Button title="Retry" onPress={refetch} />
      </View>
    );
  }

  if (!data || data.length === 0) {
    return <EmptyStateScreen />;
  }

  return <HotelsList hotels={data} />;
}
```

---

## Best Practices

1. **Always use hooks** instead of calling repositories directly
2. **Handle loading and error states** in UI
3. **Unsubscribe from real-time subscriptions** when components unmount
4. **Cache data** using useQuery hook
5. **Use optimistic updates** for better UX
6. **Implement error boundaries** for crash handling
7. **Test RLS policies** in staging before production

---

## Deployment

Before deploying:

1. ✅ Test all authentication flows
2. ✅ Verify RLS policies are working
3. ✅ Test real-time subscriptions
4. ✅ Implement proper error handling
5. ✅ Set up monitoring and analytics
6. ✅ Configure backup strategy
