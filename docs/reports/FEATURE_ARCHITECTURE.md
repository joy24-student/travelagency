# Feature-Based Architecture & Module Organization

## Feature-Driven Directory Structure

### Recommended Folder Organization

```
src/
├── features/                            # Feature modules
│   ├── auth/                           # Authentication
│   │   ├── screens/
│   │   │   └── LoginScreen.tsx         # rewards-login
│   │   ├── components/
│   │   │   ├── SocialAuthButtons.tsx
│   │   │   └── AuthForm.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── services/
│   │   │   └── authService.ts
│   │   └── types/
│   │       └── auth.ts
│   │
│   ├── search/                         # Search (flights, hotels, trains)
│   │   ├── screens/
│   │   │   ├── FlightSearchScreen.tsx
│   │   │   ├── HotelSearchScreen.tsx
│   │   │   └── TrainSearchScreen.tsx
│   │   ├── components/
│   │   │   ├── SearchForm.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   ├── PassengerSelector.tsx
│   │   │   └── FilterChips.tsx
│   │   ├── hooks/
│   │   │   ├── useSearch.ts
│   │   │   └── useFilters.ts
│   │   ├── services/
│   │   │   ├── flightService.ts
│   │   │   ├── hotelService.ts
│   │   │   └── trainService.ts
│   │   ├── store/
│   │   │   └── searchSlice.ts         # Redux/Zustand
│   │   └── types/
│   │       └── search.ts
│   │
│   ├── bookings/                       # Booking management
│   │   ├── screens/
│   │   │   ├── SearchResultsScreen.tsx
│   │   │   ├── BookingDetailsScreen.tsx
│   │   │   └── BookingConfirmationScreen.tsx
│   │   ├── components/
│   │   │   ├── ResultCard.tsx
│   │   │   ├── PricingDetails.tsx
│   │   │   └── PaymentForm.tsx
│   │   ├── services/
│   │   │   └── bookingService.ts
│   │   └── types/
│   │       └── booking.ts
│   │
│   ├── trips/                         # Trip management
│   │   ├── screens/
│   │   │   ├── MyTripsScreen.tsx      # my-trips
│   │   │   └── TripDetailsScreen.tsx
│   │   ├── components/
│   │   │   ├── TripCard.tsx
│   │   │   ├── ItineraryTimeline.tsx
│   │   │   └── TripPhotos.tsx
│   │   ├── services/
│   │   │   └── tripService.ts
│   │   └── types/
│   │       └── trip.ts
│   │
│   ├── community/                     # Community & social
│   │   ├── screens/
│   │   │   ├── CommunityFeedScreen.tsx   # travel-community-posts
│   │   │   ├── StoriesScreen.tsx         # travel-community-refined
│   │   │   └── PostDetailScreen.tsx
│   │   ├── components/
│   │   │   ├── StoryCard.tsx
│   │   │   ├── Post.tsx
│   │   │   ├── CommentSection.tsx
│   │   │   └── ReactionButtons.tsx
│   │   ├── services/
│   │   │   └── communityService.ts
│   │   └── types/
│   │       └── community.ts
│   │
│   ├── loyalty/                       # Loyalty & rewards
│   │   ├── screens/
│   │   │   ├── RewardsScreen.tsx      # rewards
│   │   │   ├── RewardDetailsScreen.tsx
│   │   │   └── RedemptionScreen.tsx
│   │   ├── components/
│   │   │   ├── TierCard.tsx
│   │   │   ├── RewardCard.tsx
│   │   │   └── PointsDisplay.tsx
│   │   ├── services/
│   │   │   └── loyaltyService.ts
│   │   └── types/
│   │       └── loyalty.ts
│   │
│   ├── account/                       # User account
│   │   ├── screens/
│   │   │   ├── ProfileScreen.tsx      # premium-account
│   │   │   ├── AccountSecurityScreen.tsx
│   │   │   └── PaymentMethodsScreen.tsx
│   │   ├── components/
│   │   │   ├── ProfileCard.tsx
│   │   │   ├── SettingsRow.tsx
│   │   │   └── SecuritySettings.tsx
│   │   ├── services/
│   │   │   └── accountService.ts
│   │   └── types/
│   │       └── account.ts
│   │
│   ├── messages/                      # Messaging & notifications
│   │   ├── screens/
│   │   │   ├── MessagesScreen.tsx     # messages
│   │   │   ├── NotificationDetailsScreen.tsx
│   │   │   └── ChatScreen.tsx
│   │   ├── components/
│   │   │   ├── NotificationCard.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── services/
│   │   │   ├── messageService.ts
│   │   │   └── notificationService.ts
│   │   └── types/
│   │       └── message.ts
│   │
│   ├── support/                       # Customer support
│   │   ├── screens/
│   │   │   ├── SupportScreen.tsx      # customer-support
│   │   │   ├── FAQScreen.tsx
│   │   │   └── ChatSupportScreen.tsx
│   │   ├── components/
│   │   │   ├── FAQCard.tsx
│   │   │   ├── CategoryTabs.tsx
│   │   │   └── SupportChat.tsx
│   │   ├── services/
│   │   │   └── supportService.ts
│   │   └── types/
│   │       └── support.ts
│   │
│   ├── home/                         # Home & discovery
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx         # trip-home-sticky-1, etc.
│   │   │   └── DiscoveryScreen.tsx
│   │   ├── components/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── ServiceTabs.tsx
│   │   │   ├── DestinationChips.tsx
│   │   │   └── PromoBanner.tsx
│   │   ├── services/
│   │   │   └── homeService.ts
│   │   └── types/
│   │       └── home.ts
│   │
│   ├── ai-assistant/                 # AI features
│   │   ├── screens/
│   │   │   ├── AssistantScreen.tsx    # ai-assistant
│   │   │   └── ChatHistoryScreen.tsx
│   │   ├── components/
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── SuggestedPrompts.tsx
│   │   │   └── FeatureCards.tsx
│   │   ├── services/
│   │   │   └── aiService.ts
│   │   └── types/
│   │       └── ai.ts
│   │
│   └── settings/                      # Settings
│       ├── screens/
│       │   ├── SettingsScreen.tsx
│       │   └── LocalizationScreen.tsx
│       ├── components/
│       │   ├── SettingRow.tsx
│       │   └── PreferenceToggle.tsx
│       ├── services/
│       │   └── settingsService.ts
│       └── types/
│           └── settings.ts
│
├── shared/                            # Shared utilities
│   ├── components/
│   │   ├── TopBar.tsx
│   │   ├── BottomNav.tsx
│   │   ├── AiPill.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── useTheme.ts
│   │   ├── useNavigation.ts
│   │   ├── usePagination.ts
│   │   └── useFormHandler.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── storage.ts
│   │   ├── auth.ts
│   │   └── analytics.ts
│   ├── utils/
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   ├── date.ts
│   │   └── currency.ts
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── endpoints.ts
│   └── types/
│       ├── common.ts
│       └── api.ts
│
├── store/                            # Global state management
│   ├── rootReducer.ts
│   ├── slices/
│   │   ├── authSlice.ts
│   │   ├── userSlice.ts
│   │   ├── searchSlice.ts
│   │   ├── bookingSlice.ts
│   │   └── uiSlice.ts
│   └── middleware/
│       └── api.ts
│
├── navigation/
│   ├── RootNavigator.tsx
│   ├── types.ts
│   └── linking.ts
│
├── styles/
│   ├── theme.ts
│   ├── spacing.ts
│   └── typography.ts
│
└── app/                             # App initialization
    ├── App.tsx
    └── providers.tsx
```

---

## Feature Module Template

### Each feature follows this structure:

```typescript
// Feature: bookings
// Responsible for: Search, browse, and book travel products

/features/bookings/
├── README.md                     # Feature documentation
├── screens/                      # UI screens
│   ├── SearchResultsScreen.tsx   # Lists results
│   ├── BookingDetailsScreen.tsx  # Shows details
│   └── ConfirmationScreen.tsx    # Booking confirmation
├── components/                   # Reusable UI
│   ├── ResultCard.tsx
│   ├── PricingDetails.tsx
│   └── PaymentForm.tsx
├── hooks/                        # Custom hooks
│   ├── useBooking.ts
│   ├── usePayment.ts
│   └── useFilters.ts
├── services/                     # API & business logic
│   ├── bookingService.ts
│   ├── paymentService.ts
│   └── validationService.ts
├── store/                        # State management
│   └── bookingSlice.ts
├── types/                        # TypeScript types
│   ├── booking.ts
│   └── payment.ts
└── index.ts                      # Public exports
```

---

## Navigation Tree

```
RootNavigator
├── AuthStack (rewards-login)
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── VerificationScreen
│
├── MainStack (TabNavigator)
│   ├── HomeStack
│   │   ├── HomeScreen (trip-home-sticky-1, trip-home-sticky-2, trip-mobile-interface)
│   │   ├── DiscoveryScreen
│   │   └── DestinationDetail
│   │
│   ├── SearchStack
│   │   ├── SearchTypeSelector
│   │   ├── FlightSearchScreen (flights)
│   │   ├── HotelSearchScreen (hotels-homes, search-stays, luxestay-hotels)
│   │   ├── TrainSearchScreen (trains)
│   │   ├── ToursSearchScreen (private-tours-search)
│   │   ├── SearchResultsScreen (recommended-tours)
│   │   └── DetailScreen
│   │
│   ├── CommunityStack
│   │   ├── CommunityFeedScreen (travel-community-posts)
│   │   ├── StoriesScreen (travel-community-refined)
│   │   ├── PostDetailScreen
│   │   ├── CreatorProfileScreen
│   │   └── ExperienceDetailScreen
│   │
│   ├── TripsStack
│   │   ├── MyTripsScreen (my-trips)
│   │   ├── TripDetailScreen
│   │   ├── ItineraryScreen
│   │   └── PhotosScreen
│   │
│   └── AccountStack
│       ├── ProfileScreen (premium-account)
│       ├── RewardsScreen (rewards)
│       ├── MessagesScreen (messages)
│       ├── SupportScreen (customer-support)
│       ├── SettingsScreen (settings, account-security)
│       └── PartnerScreen (partner-program)
│
├── AssistantStack (ai-assistant)
│   ├── ChatScreen
│   ├── ChatHistoryScreen
│   └── InsightsScreen
│
├── PostCreationStack (modal)
│   ├── PhotoSelectionScreen
│   └── PostEditorScreen
│
└── ModalStack (overlays)
    ├── FilterModal
    ├── SortModal
    ├── AuthModal
    └── PaymentModal
```

---

## Route Map

### Deep Linking Structure

```
App Routes:
├── /home
│   ├── /home/flights
│   ├── /home/hotels
│   ├── /home/trains
│   └── /home/discovery
│
├── /search
│   ├── /search/flights
│   ├── /search/hotels
│   ├── /search/trains
│   ├── /search/tours
│   └── /search/results?type=flight&from=NYC&to=LAX
│
├── /bookings
│   ├── /bookings/:id
│   ├── /bookings/:id/details
│   └── /bookings/:id/confirmation
│
├── /trips
│   ├── /trips/upcoming
│   ├── /trips/:id
│   ├── /trips/:id/itinerary
│   └── /trips/:id/photos
│
├── /community
│   ├── /community/feed
│   ├── /community/stories
│   ├── /community/post/:id
│   └── /community/creator/:id
│
├── /account
│   ├── /account/profile
│   ├── /account/rewards
│   ├── /account/messages
│   ├── /account/support
│   └── /account/settings
│
├── /auth
│   ├── /auth/login
│   ├── /auth/register
│   └── /auth/verify
│
├── /ai
│   ├── /ai/chat
│   └── /ai/history
│
└── /admin (partner-program)
    ├── /admin/partner
    └── /admin/creator
```

---

## Feature Dependencies

### Dependency Graph

```
authentication
    ↓
    ├─→ account
    ├─→ bookings
    ├─→ loyalty
    └─→ messages

home
    ↓
    ├─→ search
    ├─→ discoveries
    └─→ recommendations

search
    ↓
    ├─→ bookings
    ├─→ payments
    └─→ prices

bookings
    ↓
    ├─→ payments
    ├─→ trips
    ├─→ notifications
    └─→ loyalty

community
    ↓
    ├─→ user profiles
    ├─→ notifications
    └─→ bookings (for experiences)

loyalty
    ↓
    ├─→ account
    ├─→ notifications
    └─→ bookings

ai-assistant
    ↓
    ├─→ search
    ├─→ recommendations
    └─→ bookings

support
    ↓
    └─→ bookings (for help with orders)
```

---

## Feature Breakdown by Screen

| Screen                   | Primary Feature | Secondary Features        | Dependencies      |
| ------------------------ | --------------- | ------------------------- | ----------------- |
| trip-home-sticky-1       | home            | search, discoveries       | -                 |
| trip-home-sticky-2       | home            | search, loyalty           | loyalty           |
| trip-mobile-interface    | home            | services, search          | -                 |
| flights                  | search          | bookings, payment         | bookings          |
| search-stays             | search          | bookings, loyalty         | bookings, loyalty |
| hotels-homes             | search          | bookings                  | bookings          |
| luxestay-hotels          | search          | bookings                  | bookings          |
| trains                   | search          | bookings                  | bookings          |
| private-tours-search     | search          | bookings                  | bookings          |
| recommended-tours        | bookings        | search, pricing           | search            |
| my-trips                 | trips           | bookings, photos          | auth              |
| messages                 | notifications   | bookings, support         | auth              |
| travel-community-refined | community       | bookings, profiles        | auth              |
| travel-community-posts   | community       | bookings, profiles        | auth              |
| ai-assistant             | ai-assistant    | search, recommendations   | auth              |
| customer-support         | support         | bookings, tickets         | auth              |
| partner-program          | admin           | account, partnerships     | auth              |
| invite-earn              | loyalty         | account, referrals        | auth              |
| rewards                  | loyalty         | account, bookings         | auth              |
| rewards-login            | auth            | account, loyalty          | -                 |
| premium-account          | account         | loyalty, bookings         | auth              |
| account-security         | account         | auth                      | auth              |
| settings                 | account         | localization, preferences | auth              |

---

## Cross-Cutting Concerns

### Authentication & Authorization

- Required by: 16/23 screens
- Provided by: `features/auth`
- Global state: `store/authSlice`

### Notifications & Messaging

- Used by: 8/23 screens
- Provided by: `features/messages`
- Real-time: WebSocket/FCM

### Payments & Transactions

- Used by: 5/23 screens
- Provided by: `features/bookings/services/paymentService`
- PCI Compliance: Required

### Search & Discovery

- Used by: 12/23 screens
- Provided by: `features/search`
- Indexing: Elasticsearch/Algolia

### Recommendations & Analytics

- Used by: 8/23 screens
- Provided by: `shared/services/analytics`
- ML Pipeline: External service

### Localization & Internationalization

- Used by: All 23 screens
- Provided by: `shared/hooks/useTheme`, `shared/utils/formatting`
- i18n provider: i18next

### Theme & Styling

- Used by: All 23 screens
- Provided by: `shared/hooks/useTheme`
- Theme colors: `shared/constants/colors`

---

## Integration Points

### Backend Services

- **REST API**: `/api/v1/*` endpoints
- **GraphQL**: Real-time subscriptions
- **WebSocket**: Live notifications
- **File Storage**: Image uploads (S3/CDN)

### Third-Party Services

- **Payment Gateway**: Stripe/PayPal
- **Maps**: Google Maps/Mapbox
- **AI/ML**: Recommendation engine
- **Analytics**: Mixpanel/Amplitude
- **Push Notifications**: Firebase Cloud Messaging
- **Social Auth**: Google, Facebook, Apple

### Internal Services

- **Auth Service**: JWT tokens, session management
- **Database**: PostgreSQL with Supabase
- **Cache**: Redis for hot data
- **Search**: Elasticsearch for full-text search
- **Message Queue**: RabbitMQ/Kafka

---

## Scaling Considerations

### Horizontal Scaling

- Stateless features can scale independently
- Search and booking features need read replicas
- Community features need caching layer

### Caching Strategy

- User profile: Cache 1 hour
- Search results: Cache 15 minutes
- Community content: Cache 5 minutes
- Loyalty data: Cache 30 minutes

### Load Balancing

- Geographic distribution needed for search
- CDN for images and static assets
- API gateway for rate limiting

### Database Sharding

- By user ID for account data
- By trip ID for booking data
- By community ID for social data

---

## Monitoring & Observability

### Metrics by Feature

```
auth: login_rate, logout_rate, failed_attempts
search: search_latency, result_count, conversion_rate
bookings: booking_count, transaction_value, cancellation_rate
community: post_count, engagement_rate, follower_growth
loyalty: points_earned, redemption_rate, tier_distribution
```

### Error Tracking

- Sentry for React Native errors
- LogRocket for user sessions
- DataDog for infrastructure

---

## Development Workflow

1. **Create feature folder**: `features/[feature-name]`
2. **Add screens**: UI components in `screens/`
3. **Create components**: Reusable UI in `components/`
4. **Implement hooks**: Custom logic in `hooks/`
5. **Write services**: API calls in `services/`
6. **Define types**: TypeScript types in `types/`
7. **Setup store**: Redux/Zustand in `store/` (if needed)
8. **Export**: Public API in `index.ts`
9. **Test**: Unit & integration tests
10. **Document**: README for feature

---

## Summary

This feature-based architecture provides:

- ✅ Clear separation of concerns
- ✅ Easy to locate related code
- ✅ Scalable structure
- ✅ Independent feature development
- ✅ Reusable shared utilities
- ✅ Clear dependencies
- ✅ Easy testing and mocking
- ✅ Performance optimization opportunities
