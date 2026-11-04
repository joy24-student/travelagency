-- Migration: 20260608g_social_messenger_and_calls.sql
-- Description: Facebook-like Friend Request system, Messenger-like Direct Realtime Messaging, and Audio/Video Calls

-- 1. Friend Requests Table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_sender_receiver UNIQUE (sender_id, receiver_id),
  CONSTRAINT no_self_friending CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id, status);

-- 2. Conversations Table (Direct & Group messenger threads)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')) DEFAULT 'direct',
  title TEXT,
  avatar_url TEXT,
  last_message_text TEXT,
  last_message_sender_id UUID REFERENCES community_profiles(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);

-- 3. Conversation Participants Table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_convo_user UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_convo_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_convo_participants_convo ON conversation_participants(conversation_id);

-- 4. Direct Messages Table
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'audio', 'file')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_convo ON direct_messages(conversation_id, created_at ASC);

-- 5. Call Logs Table (Audio & Video calls)
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')) DEFAULT 'video',
  status TEXT NOT NULL CHECK (status IN ('calling', 'ringing', 'connected', 'completed', 'missed', 'rejected')) DEFAULT 'calling',
  duration_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_participants ON call_logs(caller_id, receiver_id, created_at DESC);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- 7. Permissions Grant
GRANT SELECT, INSERT, UPDATE, DELETE ON 
  friend_requests, conversations, conversation_participants, direct_messages, call_logs
TO anon, authenticated;

-- 8. Policies for friend_requests
DROP POLICY IF EXISTS friend_requests_all ON friend_requests;
CREATE POLICY friend_requests_all ON friend_requests
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (sender_id IS NOT NULL AND receiver_id IS NOT NULL);

-- 9. Policies for conversations
DROP POLICY IF EXISTS conversations_all ON conversations;
CREATE POLICY conversations_all ON conversations
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 10. Policies for conversation_participants
DROP POLICY IF EXISTS conversation_participants_all ON conversation_participants;
CREATE POLICY conversation_participants_all ON conversation_participants
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (conversation_id IS NOT NULL AND user_id IS NOT NULL);

-- 11. Policies for direct_messages
DROP POLICY IF EXISTS direct_messages_all ON direct_messages;
CREATE POLICY direct_messages_all ON direct_messages
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (conversation_id IS NOT NULL AND sender_id IS NOT NULL);

-- 12. Policies for call_logs
DROP POLICY IF EXISTS call_logs_all ON call_logs;
CREATE POLICY call_logs_all ON call_logs
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (caller_id IS NOT NULL AND receiver_id IS NOT NULL);

-- 13. Seed Initial Friends, Conversations, and Call Logs
DO $$
DECLARE
  v_elvis UUID := '5e491c34-50b4-4d2a-8cac-d09fddd7745c'; -- Elvis Mittra
  v_rahat UUID := '0ce5b7b9-7d51-4942-91c0-4b9b8d0132c9'; -- Rahat Galiv
  v_tania UUID := 'fe097f5f-44ea-4e66-a738-1208b6991d74'; -- Tania Travels
  v_siam UUID := '4ba914d5-181f-44e8-a47c-8b1e57045791';  -- Siam Wanderer
  v_convo1 UUID := 'e1111111-1111-1111-1111-111111111111';
  v_convo2 UUID := 'e2222222-2222-2222-2222-222222222222';
BEGIN
  -- Seed Friend Requests
  -- Elvis & Rahat: Accepted friends
  INSERT INTO friend_requests (sender_id, receiver_id, status)
  VALUES (v_elvis, v_rahat, 'accepted')
  ON CONFLICT (sender_id, receiver_id) DO UPDATE SET status = 'accepted';

  -- Tania -> Elvis: Pending incoming request for Elvis
  INSERT INTO friend_requests (sender_id, receiver_id, status)
  VALUES (v_tania, v_elvis, 'pending')
  ON CONFLICT (sender_id, receiver_id) DO UPDATE SET status = 'pending';

  -- Elvis -> Siam: Pending outgoing request from Elvis
  INSERT INTO friend_requests (sender_id, receiver_id, status)
  VALUES (v_elvis, v_siam, 'pending')
  ON CONFLICT (sender_id, receiver_id) DO UPDATE SET status = 'pending';

  -- Seed Convo 1: Elvis & Rahat
  INSERT INTO conversations (id, type, title, avatar_url, last_message_text, last_message_sender_id, last_message_at)
  VALUES (
    v_convo1,
    'direct',
    'Rahat Galiv',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    'Good tip, thanks brother!',
    v_elvis,
    NOW() - INTERVAL '10 minutes'
  )
  ON CONFLICT (id) DO UPDATE SET
    last_message_text = 'Good tip, thanks brother!',
    last_message_at = NOW() - INTERVAL '10 minutes';

  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (v_convo1, v_elvis),
    (v_convo1, v_rahat)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  -- Messages in Convo 1
  DELETE FROM direct_messages WHERE conversation_id = v_convo1;
  INSERT INTO direct_messages (conversation_id, sender_id, content, created_at)
  VALUES 
    (v_convo1, v_rahat, 'Hey Elvis! Are you joining the Sundarbans cruise this weekend?', NOW() - INTERVAL '45 minutes'),
    (v_convo1, v_elvis, 'Yes! Booked the forest eco-lodge yesterday. Super excited! 🌲', NOW() - INTERVAL '30 minutes'),
    (v_convo1, v_rahat, 'Awesome! Pack an extra rain jacket, forecast looks breezy.', NOW() - INTERVAL '15 minutes'),
    (v_convo1, v_elvis, 'Good tip, thanks brother!', NOW() - INTERVAL '10 minutes');

  -- Seed Convo 2: Elvis & Tania
  INSERT INTO conversations (id, type, title, avatar_url, last_message_text, last_message_sender_id, last_message_at)
  VALUES (
    v_convo2,
    'direct',
    'Tania Travels',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    'Around 6:30 AM before the crowd arrived!',
    v_elvis,
    NOW() - INTERVAL '2 hours'
  )
  ON CONFLICT (id) DO UPDATE SET
    last_message_text = 'Around 6:30 AM before the crowd arrived!',
    last_message_at = NOW() - INTERVAL '2 hours';

  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (v_convo2, v_elvis),
    (v_convo2, v_tania)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  DELETE FROM direct_messages WHERE conversation_id = v_convo2;
  INSERT INTO direct_messages (conversation_id, sender_id, content, created_at)
  VALUES 
    (v_convo2, v_tania, 'Loved your Arashiyama bamboo forest story! What time of day did you shoot it? 🎋', NOW() - INTERVAL '3 hours'),
    (v_convo2, v_elvis, 'Around 6:30 AM before the crowd arrived!', NOW() - INTERVAL '2 hours');

  -- Seed Call Logs
  DELETE FROM call_logs WHERE caller_id IN (v_elvis, v_rahat, v_tania, v_siam);
  INSERT INTO call_logs (caller_id, receiver_id, call_type, status, duration_seconds, started_at, ended_at)
  VALUES
    (v_rahat, v_elvis, 'video', 'completed', 420, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '7 minutes'),
    (v_tania, v_elvis, 'audio', 'missed', 0, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),
    (v_elvis, v_rahat, 'audio', 'completed', 155, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '155 seconds');

END $$;
