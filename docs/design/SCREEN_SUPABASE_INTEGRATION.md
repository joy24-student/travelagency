# Screen Integration with Supabase

Guide for connecting all 23 screens to real Supabase data.

## Quick Reference - Screens by Type

### Home Screens (3)

- **trip-home-sticky-1**: Featured hotels, flights, posts → useSearchHotels, useSearchFlights, usePostsFeed
- **trip-home-sticky-2**: Similar to above
- **trip.com_home**: Main home screen

### Search/Discovery Screens (6)

- **trip.com_hotels_discovery**: Hotels filtered → useSearchHotels with filters
- **trip.com_flights_discovery**: Flights filtered → useSearchFlights with filters
- **trip.com_trains**: Train search (similar pattern to flights)
- **trip.com_private_tours_search**: Tours search → useSearchTours with filters
- **trip.com_recommended_tours**: Tour recommendations
- **trip.com_invite_earn**: Referral program

### Booking/Checkout Screens (4)

- **trip.com_hotel_detail**: Hotel details, rooms → useHotel, book actions
- **trip.com_checkout**: Booking creation → useCreateBooking
- **trip.com_flight_detail**: Flight details, seat selection
- **trip.com_payments**: Payment processing → useBookingMutations

### User Account Screens (3)

- **trip.com_account_security**: Profile & preferences → useUserProfile, useUserPreferences
- **trip.com_settings**: Settings management → useUserPreferences
- **trip.com_account_profile**: Account info, addresses → useUserProfile, useUserAddresses

### Trips/Bookings Screens (2)

- **trip.com_my_trips_screen**: My bookings → useUserBookings
- **trip.com_trip_detail**: Booking details → useBooking

### Community/Social Screens (1)

- **travel_community_posts**: Feed + interactions → usePostsFeed, usePostInteractions

### Loyalty Screens (2)

- **trip.com_rewards**: Points & rewards → useLoyaltyAccount, useAvailableRewards
- **trip.com_rewards_login**: Loyalty login

### Support/Messages Screens (2)

- **trip_com_customer_support**: Support tickets → useUserTickets, useCreateTicket
- **trip.com_messages**: Messages (support or user-to-user)

---

## Home Screens Implementation

### trip-home-sticky-1

```typescript
import React, { useState } from 'react';
import { View, ScrollView, Text, FlatList, ActivityIndicator } from 'react-native';
import { useAuth, useSearchHotels, useSearchFlights, usePostsFeed } from '@/hooks';

export function HomeScreen() {
  const { user, loading: authLoading } = useAuth();
  const { hotels, loading: hotelsLoading } = useSearchHotels({
    minRating: 4,
  });
  const { flights, loading: flightsLoading } = useSearchFlights();
  const { posts, loading: postsLoading } = usePostsFeed();

  if (authLoading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Hero Section */}
      <View className="h-64 bg-blue-600 justify-center items-center">
        <Text className="text-white text-3xl font-bold">
          Hello, {user?.email?.split('@')[0]}!
        </Text>
      </View>

      {/* Search Bar */}
      <View className="px-4 py-4">
        <View className="bg-gray-100 rounded-lg p-4">
          <Text className="text-gray-600">Where to next?</Text>
        </View>
      </View>

      {/* Featured Hotels */}
      <View className="px-4 py-6">
        <Text className="text-xl font-bold mb-4">Featured Hotels</Text>
        {hotelsLoading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            horizontal
            scrollEnabled={false}
            data={hotels?.slice(0, 5)}
            renderItem={({ item }) => (
              <View className="mr-4 bg-gray-100 rounded-lg p-3 w-48">
                <Text className="font-bold">{item.name}</Text>
                <Text className="text-sm text-gray-600">{item.city}</Text>
                <Text className="text-yellow-500 mt-2">⭐ {item.rating}</Text>
              </View>
            )}
          />
        )}
      </View>

      {/* Recommended Flights */}
      <View className="px-4 py-6">
        <Text className="text-xl font-bold mb-4">Recommended Flights</Text>
        {flightsLoading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            horizontal
            scrollEnabled={false}
            data={flights?.slice(0, 5)}
            renderItem={({ item }) => (
              <View className="mr-4 bg-gray-100 rounded-lg p-3 w-48">
                <Text className="font-bold">{item.departure_airport}</Text>
                <Text className="text-sm text-gray-600">to {item.arrival_airport}</Text>
                <Text className="text-green-600 mt-2">${item.base_price}</Text>
              </View>
            )}
          />
        )}
      </View>

      {/* Recent Community Posts */}
      <View className="px-4 py-6">
        <Text className="text-xl font-bold mb-4">Recent Posts</Text>
        {postsLoading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            scrollEnabled={false}
            data={posts?.slice(0, 3)}
            renderItem={({ item }) => (
              <View className="mb-4 bg-gray-50 rounded-lg p-4">
                <Text className="font-bold">{item.author?.email}</Text>
                <Text className="text-gray-700 mt-2">{item.content}</Text>
                <View className="flex-row mt-3 gap-4">
                  <Text className="text-sm text-gray-500">❤️ {item.like_count}</Text>
                  <Text className="text-sm text-gray-500">💬 {item.comment_count}</Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </ScrollView>
  );
}
```

---

## Search/Discovery Screens

### trip.com_hotels_discovery

```typescript
import React, { useState } from 'react';
import { View, FlatList, TextInput, Button, ActivityIndicator } from 'react-native';
import { useSearchHotels } from '@/hooks';

export function HotelsDiscoveryScreen() {
  const [filters, setFilters] = useState({
    city: 'Paris',
    minRating: 3,
    minPrice: 0,
    maxPrice: 1000,
  });

  const { hotels, loading, refetch } = useSearchHotels(filters);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <View className="flex-1 bg-white">
      {/* Filter Bar */}
      <View className="bg-gray-100 p-4 gap-2">
        <TextInput
          placeholder="City"
          value={filters.city}
          onChangeText={(text) => handleFilterChange('city', text)}
          className="bg-white p-3 rounded border border-gray-300"
        />
        <TextInput
          placeholder="Min Price"
          value={String(filters.minPrice)}
          keyboardType="numeric"
          onChangeText={(text) => handleFilterChange('minPrice', parseInt(text))}
          className="bg-white p-3 rounded border border-gray-300"
        />
        <TextInput
          placeholder="Max Price"
          value={String(filters.maxPrice)}
          keyboardType="numeric"
          onChangeText={(text) => handleFilterChange('maxPrice', parseInt(text))}
          className="bg-white p-3 rounded border border-gray-300"
        />
        <Button
          title="Search"
          onPress={() => refetch()}
        />
      </View>

      {/* Results */}
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={hotels}
          renderItem={({ item }) => (
            <View className="border-b border-gray-200 p-4">
              <Text className="text-lg font-bold">{item.name}</Text>
              <Text className="text-gray-600">{item.city}, {item.country}</Text>
              <View className="flex-row justify-between mt-2">
                <Text className="text-yellow-500">⭐ {item.rating}</Text>
                <Text className="text-green-600 font-bold">${item.room_price_min}</Text>
              </View>
            </View>
          )}
          refreshing={loading}
          onRefresh={refetch}
          ListEmptyComponent={<Text className="text-center mt-10">No hotels found</Text>}
        />
      )}
    </View>
  );
}
```

---

## Booking/Checkout Screens

### trip.com_checkout

```typescript
import React, { useState } from 'react';
import { View, ScrollView, Text, Button, TextInput, ActivityIndicator } from 'react-native';
import { useAuth, useCreateBooking, useBookingMutations } from '@/hooks';

export function CheckoutScreen({ route }) {
  const { productId, productType } = route.params;
  const { user } = useAuth();

  const [bookingData, setBookingData] = useState({
    product_type: productType,
    destination_city: '',
    total_price: 0,
    check_in_date: new Date().toISOString().split('T')[0],
  });

  const { createBooking, loading, data: newBooking } = useCreateBooking();

  const handleCreateBooking = async () => {
    try {
      await createBooking({
        userId: user?.id,
        booking: bookingData,
      });
    } catch (error) {
      console.error('Booking creation failed:', error);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  if (newBooking) {
    return (
      <View className="flex-1 justify-center items-center bg-green-50">
        <Text className="text-2xl font-bold text-green-600 mb-4">Booking Confirmed!</Text>
        <Text className="text-lg mb-4">Reference: {newBooking.booking_reference}</Text>
        <Button title="View Details" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-6">Complete Your Booking</Text>

      <View className="gap-4">
        <View>
          <Text className="font-bold mb-2">Destination City</Text>
          <TextInput
            placeholder="Enter city"
            value={bookingData.destination_city}
            onChangeText={(text) =>
              setBookingData({ ...bookingData, destination_city: text })
            }
            className="bg-gray-100 p-3 rounded border border-gray-300"
          />
        </View>

        <View>
          <Text className="font-bold mb-2">Check-in Date</Text>
          <TextInput
            placeholder="YYYY-MM-DD"
            value={bookingData.check_in_date}
            onChangeText={(text) =>
              setBookingData({ ...bookingData, check_in_date: text })
            }
            className="bg-gray-100 p-3 rounded border border-gray-300"
          />
        </View>

        <View>
          <Text className="font-bold mb-2">Total Price</Text>
          <TextInput
            placeholder="0"
            value={String(bookingData.total_price)}
            keyboardType="numeric"
            onChangeText={(text) =>
              setBookingData({ ...bookingData, total_price: parseFloat(text) })
            }
            className="bg-gray-100 p-3 rounded border border-gray-300"
          />
        </View>

        <Button
          title={loading ? 'Creating...' : 'Confirm Booking'}
          onPress={handleCreateBooking}
          disabled={loading}
        />
      </View>
    </ScrollView>
  );
}
```

---

## Account Screens

### trip.com_account_security

```typescript
import React from 'react';
import { View, ScrollView, Text, Button, ActivityIndicator } from 'react-native';
import { useAuth, useUserProfile, useUserPreferences } from '@/hooks';

export function AccountSecurityScreen() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.id);
  const { preferences, loading: prefsLoading } = useUserPreferences(user?.id);

  if (profileLoading || prefsLoading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-6">Account & Security</Text>

      {/* Account Info */}
      <View className="bg-gray-50 rounded-lg p-4 mb-6">
        <Text className="text-lg font-bold mb-3">Account Information</Text>
        <View className="gap-2">
          <Text className="text-gray-600">Email: {user?.email}</Text>
          <Text className="text-gray-600">Name: {profile?.first_name} {profile?.last_name}</Text>
          <Text className="text-gray-600">Bio: {profile?.bio || 'Not set'}</Text>
        </View>
      </View>

      {/* Preferences */}
      <View className="bg-gray-50 rounded-lg p-4 mb-6">
        <Text className="text-lg font-bold mb-3">Preferences</Text>
        <View className="gap-2">
          <Text className="text-gray-600">Language: {preferences?.language || 'English'}</Text>
          <Text className="text-gray-600">Currency: {preferences?.currency || 'USD'}</Text>
          <Text className="text-gray-600">Theme: {preferences?.theme || 'Light'}</Text>
        </View>
      </View>

      {/* Actions */}
      <View className="gap-2">
        <Button title="Edit Profile" />
        <Button title="Change Password" />
        <Button title="Two-Factor Authentication" />
        <Button title="Logout" color="red" />
      </View>
    </ScrollView>
  );
}
```

---

## Trips/Bookings Screens

### trip.com_my_trips_screen

```typescript
import React from 'react';
import { View, ScrollView, Text, FlatList, ActivityIndicator } from 'react-native';
import { useAuth, useUserBookings } from '@/hooks';

export function MyTripsScreen() {
  const { user } = useAuth();
  const { bookings, loading } = useUserBookings(user?.id);

  const upcomingTrips = bookings?.filter(b => new Date(b.check_in_date) > new Date()) || [];
  const pastTrips = bookings?.filter(b => new Date(b.check_in_date) <= new Date()) || [];

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-6">My Trips</Text>

      {/* Upcoming Trips */}
      <View className="mb-6">
        <Text className="text-lg font-bold mb-3">Upcoming Trips</Text>
        {upcomingTrips.length > 0 ? (
          <FlatList
            scrollEnabled={false}
            data={upcomingTrips}
            renderItem={({ item }) => (
              <View className="bg-blue-50 rounded-lg p-4 mb-3">
                <Text className="font-bold">{item.destination_city}</Text>
                <Text className="text-sm text-gray-600">
                  {item.check_in_date} to {item.check_out_date}
                </Text>
                <Text className="text-green-600 mt-2">{item.booking_reference}</Text>
              </View>
            )}
          />
        ) : (
          <Text className="text-gray-500">No upcoming trips</Text>
        )}
      </View>

      {/* Past Trips */}
      <View>
        <Text className="text-lg font-bold mb-3">Past Trips</Text>
        {pastTrips.length > 0 ? (
          <FlatList
            scrollEnabled={false}
            data={pastTrips}
            renderItem={({ item }) => (
              <View className="bg-gray-50 rounded-lg p-4 mb-3">
                <Text className="font-bold">{item.destination_city}</Text>
                <Text className="text-sm text-gray-600">{item.check_in_date}</Text>
              </View>
            )}
          />
        ) : (
          <Text className="text-gray-500">No past trips</Text>
        )}
      </View>
    </ScrollView>
  );
}
```

---

## Community Screens

### travel_community_posts

```typescript
import React from 'react';
import { View, ScrollView, FlatList, Text, Button, ActivityIndicator, TextInput } from 'react-native';
import { useAuth, usePostsFeed, useCreatePost, usePostInteractions } from '@/hooks';

export function CommunityPostsScreen() {
  const { user } = useAuth();
  const { posts, loading, refetch } = usePostsFeed();
  const { createPost, loading: creating } = useCreatePost(user?.id);
  const [newPostContent, setNewPostContent] = React.useState('');

  const handleCreatePost = async () => {
    try {
      await createPost({
        content: newPostContent,
        visibility: 'public',
      });
      setNewPostContent('');
      refetch();
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Post Creation */}
      <ScrollView className="bg-gray-50 p-4">
        <Text className="font-bold mb-2">Share Your Travel Experience</Text>
        <TextInput
          placeholder="What's on your mind?"
          value={newPostContent}
          onChangeText={setNewPostContent}
          multiline
          className="bg-white p-3 rounded border border-gray-300 mb-2 min-h-24"
        />
        <Button
          title={creating ? 'Posting...' : 'Post'}
          onPress={handleCreatePost}
          disabled={creating || !newPostContent}
        />
      </ScrollView>

      {/* Posts Feed */}
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={posts}
          renderItem={({ item }) => (
            <PostItem post={item} userId={user?.id} />
          )}
          refreshing={loading}
          onRefresh={refetch}
          ListEmptyComponent={<Text className="text-center mt-10">No posts yet</Text>}
        />
      )}
    </View>
  );
}

function PostItem({ post, userId }) {
  const { like, unlike, addComment, save } = usePostInteractions(post.id, userId);
  const [liked, setLiked] = React.useState(false);

  return (
    <View className="border-b border-gray-200 p-4">
      <View className="flex-row justify-between mb-2">
        <Text className="font-bold">{post.author?.email}</Text>
        <Text className="text-xs text-gray-500">{post.created_at}</Text>
      </View>
      <Text className="text-gray-700 mb-3">{post.content}</Text>
      <View className="flex-row gap-4">
        <Button
          title={liked ? '❤️ Unlike' : '❤️ Like'}
          onPress={() => {
            if (liked) unlike();
            else like();
            setLiked(!liked);
          }}
        />
        <Button title="💬 Comment" onPress={() => addComment({ comment_text: '' })} />
        <Button title="🔖 Save" onPress={save} />
      </View>
    </View>
  );
}
```

---

## Loyalty/Rewards Screens

### trip.com_rewards

```typescript
import React from 'react';
import { View, ScrollView, FlatList, Text, Button, ActivityIndicator } from 'react-native';
import { useAuth, useLoyaltyAccount, useAvailableRewards, useRedeemReward } from '@/hooks';

export function RewardsScreen() {
  const { user } = useAuth();
  const { account, loading: accountLoading } = useLoyaltyAccount(user?.id);
  const { rewards, loading: rewardsLoading } = useAvailableRewards();
  const { redeem, loading: redeeming } = useRedeemReward(account?.id);

  if (accountLoading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <ScrollView className="flex-1 bg-white p-4">
      {/* Loyalty Card */}
      <View className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 mb-6 text-white">
        <Text className="text-white text-lg font-bold mb-2">{account?.tier?.toUpperCase()}</Text>
        <Text className="text-white text-3xl font-bold">{account?.points_balance}</Text>
        <Text className="text-white text-sm mt-1">Points Available</Text>
      </View>

      {/* Available Rewards */}
      <Text className="text-lg font-bold mb-3">Available Rewards</Text>
      {rewardsLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          scrollEnabled={false}
          data={rewards}
          renderItem={({ item }) => {
            const canRedeem = account?.points_balance >= item.points_required;
            return (
              <View className="bg-gray-50 rounded-lg p-4 mb-3">
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="font-bold flex-1">{item.reward_name}</Text>
                  <Text className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {item.points_required}pts
                  </Text>
                </View>
                <Text className="text-gray-600 text-sm mb-3">{item.description}</Text>
                <Button
                  title={redeeming ? 'Redeeming...' : 'Redeem'}
                  onPress={() => redeem(item.id)}
                  disabled={!canRedeem || redeeming}
                  color={canRedeem ? '#287dfa' : '#ccc'}
                />
              </View>
            );
          }}
        />
      )}
    </ScrollView>
  );
}
```

---

## Migration Checklist

For each screen, follow these steps:

- [ ] Import necessary hooks at top of component
- [ ] Initialize hooks with appropriate parameters
- [ ] Replace mock data with hook data
- [ ] Add loading indicator while `loading === true`
- [ ] Add error display and retry button on error
- [ ] Add empty state when `data.length === 0`
- [ ] Add pull-to-refresh with `onRefresh={refetch}`
- [ ] Test on physical device or emulator
- [ ] Verify RLS policies allow access
- [ ] Monitor Supabase logs for errors

---

## Common Patterns

### Pattern 1: List with Search

```typescript
const [filters, setFilters] = useState({});
const {
  data: items,
  loading,
  refetch,
} = useQuery(async () => repository.search(filters), [filters]);
```

### Pattern 2: Detail with Related Data

```typescript
const { data: item, loading } = useQuery(
  async () => repository.getDetail(id),
  [id],
  { enabled: !!id },
);
```

### Pattern 3: Create + Redirect

```typescript
const { mutate, loading, data } = useMutation(...);
useEffect(() => {
  if (data?.id) {
    navigation.navigate('Detail', { id: data.id });
  }
}, [data]);
```

### Pattern 4: Real-time Updates

```typescript
useRealtimeSubscription("table_name", "UPDATE", (data) => {
  refetch(); // or update local state
});
```
