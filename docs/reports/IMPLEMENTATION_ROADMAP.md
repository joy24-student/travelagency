# Integration & Implementation Guide

## Complete Implementation Roadmap

This guide ties together screens, architecture, and database to create a cohesive system.

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Database Setup

- [ ] Create Supabase project
- [ ] Deploy PostgreSQL schema (SUPABASE_SCHEMA.md)
- [ ] Enable Row-Level Security
- [ ] Setup realtime subscriptions
- [ ] Configure auth providers (Google, Facebook, Apple)
- [ ] Test database connections

### 1.2 Project Structure

- [ ] Implement feature-based architecture (FEATURE_ARCHITECTURE.md)
- [ ] Create folder structure as specified
- [ ] Setup TypeScript paths
- [ ] Configure environment variables
- [ ] Setup state management (Redux/Zustand)

### 1.3 Core Services

- [ ] Implement auth service (connect Supabase auth)
- [ ] Setup API client with interceptors
- [ ] Create storage service
- [ ] Setup analytics service
- [ ] Implement error handling/logging

---

## Phase 2: Authentication & User Management (Week 2-3)

### 2.1 Authentication Flow

```
User → Auth Screen (rewards-login)
    ↓
OAuth or Email Login
    ↓
Create session (auth_sessions table)
    ↓
Store JWT + refresh token
    ↓
Redirect to Home
```

### 2.2 Screens to Build

- **rewards-login** (kind: 'account')
  - Social auth buttons (Google, Facebook, email)
  - Email/password form
  - Phone verification
  - Link to oauth_accounts table

### 2.3 Database Integration

```typescript
// Signup flow
1. Create user in users table
2. Create user_profiles
3. Create user_preferences (defaults)
4. Create user_addresses (optional)
5. Create loyalty_account (bronze tier)
6. Create auth_session
```

### 2.4 Implementation Tasks

- [ ] Build LoginScreen component
- [ ] Connect to Supabase auth
- [ ] Implement OAuth providers
- [ ] Setup secure storage for tokens
- [ ] Implement session persistence
- [ ] Create auth context/store

---

## Phase 3: Home & Discovery (Week 3-4)

### 3.1 Screens to Build

- **trip-home-sticky-1** (kind: 'home')
- **trip-home-sticky-2** (kind: 'home')
- **trip-mobile-interface** (kind: 'home')
- **luxestay-hotels** (kind: 'hotel')

### 3.2 Features

- Sticky search bar
- Service tabs (Hotels, Flights, Trains, Tours)
- Destination chips with recent searches
- Promotional banners
- Quick access grid

### 3.3 Data Sources

```typescript
// From database:
- Search history (from bookings & saved_posts)
- Recent destinations (from bookings)
- Promotions (from loyalty_rewards)
- Featured hotels (from hotels with ratings > 4)
- Trending tours (from tours with reviews)
```

### 3.4 Implementation Tasks

- [ ] Create HomeScreen component
- [ ] Build HeroSection with gradient
- [ ] Implement sticky scroll header
- [ ] Create TabCard component
- [ ] Create DestinationChips component
- [ ] Connect to real search data
- [ ] Implement analytics tracking

---

## Phase 4: Search & Booking (Week 4-6)

### 4.1 Search Screens

- **flights** (kind: 'search')
- **hotels-homes** (kind: 'hotel')
- **trains** (kind: 'search')
- **private-tours-search** (kind: 'search')
- **recommended-tours** (kind: 'list')

### 4.2 Search Flow

```
Search Input (location, dates, passengers)
    ↓
Query hotels/flights/trains database
    ↓
Apply filters (price, rating, duration)
    ↓
Display results with cards
    ↓
Select item → Show details
    ↓
Add to cart/booking
```

### 4.3 Database Queries

```sql
-- Find available hotels
SELECT * FROM hotel_room_availability
WHERE check_in_date = $1 AND available_count > 0
ORDER BY price ASC;

-- Get flights with availability
SELECT f.*, a1.name as departure, a2.name as arrival
FROM flights f
JOIN airports a1 ON f.departure_airport_id = a1.id
JOIN airports a2 ON f.arrival_airport_id = a2.id
WHERE f.departure_time >= $1 AND f.available_seats > 0
ORDER BY f.departure_time;
```

### 4.4 Booking Creation Flow

```typescript
function createBooking(searchResult) {
  // 1. Create booking (status: 'draft')
  const booking = await db.bookings.create({
    user_id: currentUser.id,
    product_type: "flight",
    total_price: searchResult.price,
    currency: "USD",
    status: "draft",
  });

  // 2. Add booking items
  await db.booking_items.create({
    booking_id: booking.id,
    product_id: flight.id,
    product_type: "flight",
    quantity: passengers,
    unit_price: searchResult.price,
  });

  // 3. Add passengers
  for (let passenger of passengers) {
    await db.booking_passengers.create({
      booking_id: booking.id,
      first_name: passenger.firstName,
      // ...
      is_primary: passenger === passengers[0],
    });
  }

  // 4. Prepare payment
  // → Payment Screen
}
```

### 4.5 Implementation Tasks

- [ ] Create search form components
- [ ] Implement date/passenger selectors
- [ ] Build filter system
- [ ] Create result cards
- [ ] Implement search caching
- [ ] Add analytics tracking
- [ ] Create booking context

---

## Phase 5: Payments & Bookings (Week 6-7)

### 5.1 Payment Processing

```
Booking Review
    ↓
Select Payment Method (card, PayPal, Apple Pay)
    ↓
Process Payment (Stripe/PayPal)
    ↓
Create booking_payments record
    ↓
Update booking status → 'confirmed'
    ↓
Redirect to Confirmation
```

### 5.2 Payment Integration

```typescript
// With Stripe
async function processPayment(booking, paymentMethod) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(booking.final_price * 100),
    currency: booking.currency.toLowerCase(),
    metadata: {
      booking_id: booking.id,
      user_id: currentUser.id,
    },
  });

  // Show payment UI to user
  const result = await stripe.confirmPayment({
    clientSecret: paymentIntent.client_secret,
  });

  if (result.paymentIntent.status === "succeeded") {
    // Update database
    await db.booking_payments.create({
      booking_id: booking.id,
      amount: booking.final_price,
      payment_method: "card",
      payment_status: "completed",
      transaction_id: result.paymentIntent.id,
    });

    await db.bookings.update(booking.id, {
      status: "confirmed",
      confirmed_at: new Date(),
    });

    // Award loyalty points
    const pointsEarned = booking.final_price * 10; // 10 points per dollar
    await awardLoyaltyPoints(currentUser.id, pointsEarned, "earn", booking.id);
  }
}
```

### 5.3 Implementation Tasks

- [ ] Setup Stripe integration
- [ ] Create PaymentForm component
- [ ] Implement payment UI
- [ ] Handle webhooks from Stripe
- [ ] Create booking confirmation screen
- [ ] Send confirmation emails
- [ ] Track conversion analytics

---

## Phase 6: Trips & History (Week 7-8)

### 6.1 Trip Management Screen

- **my-trips** (kind: 'trips')

### 6.2 Features

- List upcoming bookings
- Show past trips
- Display trip photos/memories
- Timeline view
- Export/share trip

### 6.3 Database Query

```sql
-- Get user's trips
SELECT b.*,
       COUNT(DISTINCT bp.id) as passenger_count,
       COALESCE(b.final_price, 0) as spent
FROM bookings b
LEFT JOIN booking_passengers bp ON b.id = bp.booking_id
WHERE b.user_id = $1 AND b.status IN ('confirmed', 'completed')
ORDER BY b.check_in_date DESC;
```

### 6.4 Implementation Tasks

- [ ] Create TripsScreen
- [ ] Display upcoming bookings
- [ ] Show past trips
- [ ] Implement trip details view
- [ ] Add photo gallery
- [ ] Create trip sharing feature

---

## Phase 7: Community & Social (Week 8-9)

### 7.1 Community Screens

- **travel-community-refined** (kind: 'community')
- **travel-community-posts** (kind: 'community')

### 7.2 Features

```
Stories Carousel
    ↓
Post Feed
    ├─ Author info
    ├─ Post image
    ├─ Caption
    ├─ Engagement (likes, comments, shares)
    └─ Bookable Experience CTA
```

### 7.3 Creating a Post

```typescript
async function createPost(content, images, destination) {
  // 1. Create post
  const post = await db.posts.create({
    user_id: currentUser.id,
    content,
    destination_city: destination.city,
    destination_country: destination.country,
    visibility: "public",
  });

  // 2. Upload images
  for (let image of images) {
    const url = await uploadToStorage(image);
    await db.post_images.create({
      post_id: post.id,
      image_url: url,
    });
  }

  // 3. Notify followers
  const followers = await db.user_follows
    .where({ following_id: currentUser.id })
    .select("follower_id");

  for (let follower of followers) {
    await createNotification({
      user_id: follower.follower_id,
      type: "new_post",
      title: `${currentUser.firstName} shared a new post`,
      data: { post_id: post.id },
    });
  }
}
```

### 7.4 Engagement

```typescript
// Like a post
async function likePost(postId) {
  const reaction = await db.post_reactions.upsert({
    post_id: postId,
    user_id: currentUser.id,
    reaction_type: "like",
  });

  // Update like count
  await db.posts.update(postId, {
    likes_count: db.raw("likes_count + 1"),
  });

  // Notify post author
  const post = await db.posts.findOne(postId);
  await createNotification({
    user_id: post.user_id,
    type: "post_like",
    title: `${currentUser.firstName} liked your post`,
    data: { post_id: postId },
  });
}
```

### 7.5 Implementation Tasks

- [ ] Create StoriesBar component
- [ ] Build Post component
- [ ] Implement like/comment system
- [ ] Create post creation flow
- [ ] Add followers/following
- [ ] Implement notifications
- [ ] Create comment threads

---

## Phase 8: Loyalty & Rewards (Week 9-10)

### 8.1 Loyalty System

```
Earn Points
  ├─ On bookings (10 points per $1)
  ├─ On referrals ($10 per friend)
  └─ On reviews/posts (bonus points)
    ↓
Accumulate Points
  ├─ Track tier progress
  ├─ Unlock tier benefits
  └─ View balance
    ↓
Redeem Rewards
  ├─ Select reward
  ├─ Verify points
  └─ Apply to booking
```

### 8.2 Tier Progression

```
Bronze (0-10,000 points)
  ↓
Silver (10,000-50,000 points)
  ├─ 10% discount on hotels
  ├─ Free cancellation
  └─ Priority support
  ↓
Gold (50,000-100,000 points)
  ├─ 15% discount
  ├─ Free room upgrade
  └─ Concierge service
  ↓
Platinum (100,000-500,000 points)
  ├─ 20% discount
  ├─ Suite upgrade
  └─ Personal travel concierge
  ↓
Diamond (500,000+ points)
  ├─ 25% discount
  ├─ Villa upgrade
  └─ Private jet access (premium)
```

### 8.3 Reward Screens

- **rewards** (kind: 'rewards')
- **invite-earn** (kind: 'invite')

### 8.4 Implementation Tasks

- [ ] Create rewards screen
- [ ] Display loyalty tier
- [ ] Show point balance
- [ ] Implement reward catalog
- [ ] Create redemption flow
- [ ] Setup referral system
- [ ] Track points transactions

---

## Phase 9: Account & Settings (Week 10-11)

### 9.1 Account Screens

- **premium-account** (kind: 'account')
- **account-security** (kind: 'settings')
- **settings** (kind: 'settings')

### 9.2 Features

```
Profile Management
  ├─ Personal info
  ├─ Photo
  ├─ Preferences
  └─ Addresses

Security
  ├─ Password
  ├─ 2FA
  ├─ Login history
  └─ Connected devices

Settings
  ├─ Language
  ├─ Currency
  ├─ Theme
  ├─ Notifications
  └─ Privacy
```

### 9.3 Implementation Tasks

- [ ] Create profile edit screen
- [ ] Implement security settings
- [ ] Build settings screen
- [ ] Add 2FA setup
- [ ] Create session management
- [ ] Implement preference sync

---

## Phase 10: Support & Admin (Week 11-12)

### 10.1 Support Screens

- **customer-support** (kind: 'support')

### 10.2 Features

```
Browse FAQs
  ├─ By category
  ├─ Search
  └─ Vote helpful

Contact Support
  ├─ Chat
  ├─ Create ticket
  └─ Track status

Knowledge Base
  ├─ Articles
  ├─ Videos
  └─ Community answers
```

### 10.3 Ticket System

```typescript
// Create support ticket
async function createSupportTicket(subject, message, booking) {
  const ticket = await db.support_tickets.create({
    user_id: currentUser.id,
    booking_id: booking?.id,
    subject,
    category: categorizeIssue(subject),
    priority: determinePriority(subject),
    status: "open",
    ticket_number: generateTicketNumber(),
  });

  // Add initial message
  await db.ticket_messages.create({
    ticket_id: ticket.id,
    user_id: currentUser.id,
    message,
  });

  // Notify support team
  const admins = await db.users.where({ role: "admin" });
  for (let admin of admins) {
    await createNotification({
      user_id: admin.id,
      type: "support_ticket",
      title: `New support ticket #${ticket.ticket_number}`,
      data: { ticket_id: ticket.id },
    });
  }
}
```

### 10.4 Implementation Tasks

- [ ] Build support screen
- [ ] Create FAQ display
- [ ] Implement chat interface
- [ ] Create ticket system
- [ ] Setup email routing
- [ ] Add knowledge base search

---

## Phase 11: Testing & QA (Week 12)

### 11.1 Testing Strategy

```
Unit Tests
  ├─ Services (auth, bookings, payments)
  ├─ Utilities (formatting, validation)
  └─ Hooks (useAuth, useSearch)

Integration Tests
  ├─ Auth flow
  ├─ Booking flow
  ├─ Payment processing
  └─ Community interactions

End-to-End Tests
  ├─ Complete user journey
  ├─ All 23 screens
  └─ Key workflows
```

### 11.2 QA Checklist

- [ ] Test all 23 screens on iOS
- [ ] Test all 23 screens on Android
- [ ] Test all 23 screens on web
- [ ] Verify database integrity
- [ ] Test RLS policies
- [ ] Load testing
- [ ] Security testing

---

## Phase 12: Analytics & Optimization (Week 12+)

### 12.1 Analytics Events

```typescript
// Track key metrics
analytics.track("app_opened");
analytics.track("screen_viewed", { screen: "hotels-homes" });
analytics.track("search_performed", { type: "flight", from: "NYC", to: "LAX" });
analytics.track("booking_created", { product_type: "flight", price: 500 });
analytics.track("payment_completed", { amount: 500, method: "card" });
analytics.track("post_created", { destination: "Paris" });
analytics.track("reward_redeemed", { points: 10000 });
```

### 12.2 Monitoring

- [ ] Setup error tracking (Sentry)
- [ ] Configure performance monitoring
- [ ] Setup database monitoring
- [ ] Create dashboards
- [ ] Setup alerts

---

## Feature Mapping: Screen → Database

| Screen                 | Primary Tables                                        | Secondary Tables                      | Key Queries                            |
| ---------------------- | ----------------------------------------------------- | ------------------------------------- | -------------------------------------- |
| trip-home-sticky-1     | bookings, hotels, flights                             | users, hotels.reviews                 | Recent bookings, trending destinations |
| flights                | flights, airports                                     | bookings, booking_items               | Available flights, user search history |
| hotels-homes           | hotels, hotel_rooms, hotel_room_availability          | bookings, hotel_reviews               | Room availability, pricing             |
| messages               | notifications, support_tickets                        | users, bookings                       | Recent notifications, ticket status    |
| my-trips               | bookings, booking_passengers                          | hotels, flights, tours                | User's bookings, passenger info        |
| travel-community-posts | posts, post_comments, post_reactions, user_follows    | users, user_profiles                  | Feed posts, engagement metrics         |
| rewards                | loyalty_accounts, loyalty_rewards, reward_redemptions | bookings, loyalty_points_transactions | Point balance, available rewards       |
| premium-account        | user_profiles, loyalty_accounts, oauth_accounts       | users, user_preferences               | Profile info, loyalty tier             |
| settings               | user_preferences, user_addresses                      | users, oauth_accounts                 | All user settings                      |
| customer-support       | support_tickets, faq, ticket_messages                 | users, bookings                       | Tickets, FAQs, chat history            |

---

## API Endpoints Needed

### Authentication

```
POST /auth/signup
POST /auth/login
POST /auth/logout
POST /auth/refresh
GET /auth/me
POST /auth/oauth/callback
```

### Search & Browse

```
GET /hotels/search
GET /flights/search
GET /trains/search
GET /tours/search
GET /tours/:id
GET /hotels/:id
```

### Bookings

```
POST /bookings
GET /bookings/:id
PUT /bookings/:id
DELETE /bookings/:id
GET /bookings
POST /bookings/:id/confirm
POST /bookings/:id/cancel
```

### Community

```
GET /posts
POST /posts
GET /posts/:id
PUT /posts/:id
DELETE /posts/:id
POST /posts/:id/like
POST /posts/:id/comments
GET /users/:id
POST /users/:id/follow
```

### Loyalty

```
GET /loyalty/account
GET /loyalty/points
GET /loyalty/rewards
POST /loyalty/rewards/:id/redeem
GET /loyalty/history
```

### Support

```
POST /support/tickets
GET /support/tickets
GET /support/tickets/:id
POST /support/tickets/:id/messages
GET /faq
GET /faq/search
```

---

## Deployment Strategy

### Pre-Production

1. Test on staging environment
2. Load testing (simulating 1000 concurrent users)
3. Security audit
4. Accessibility audit
5. Performance optimization

### Production

1. Blue-green deployment
2. Database backup before deployment
3. Feature flags for gradual rollout
4. Monitoring & alerting
5. Rollback plan

---

## Success Metrics

### User Metrics

- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- User retention (30-day, 90-day)
- Average session duration

### Booking Metrics

- Booking conversion rate
- Average order value (AOV)
- Booking cancellation rate
- Payment success rate

### Community Metrics

- Posts per day
- Engagement rate (likes + comments / views)
- Follower growth
- Share rate

### Business Metrics

- Customer acquisition cost (CAC)
- Lifetime value (LTV)
- Loyalty program participation
- Net Promoter Score (NPS)

---

## Conclusion

This roadmap provides a complete path from screens to implementation. Follow the phases sequentially, testing each phase before moving to the next. The feature-based architecture ensures scalability, and the database schema ensures data integrity and security.

**Total estimated timeline: 12 weeks**
**Team size: 4-6 engineers**
**Key dependencies: Supabase, Stripe, Mapbox, Firebase**
