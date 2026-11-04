-- Migration: 20260608f_allow_community_anon_demo_interactions.sql
-- Description: Allow anon/guest role to interact with community features (likes, saves, comments, follows, posting, stories)

-- 1. Grant table privileges to anon
GRANT SELECT, INSERT, UPDATE, DELETE ON 
  posts, post_media, post_comments, post_likes, comment_likes, 
  stories, groups, group_members, group_messages, user_follows, saved_posts 
TO anon;

-- 2. post_comments: allow anon inserts and deletes
DROP POLICY IF EXISTS post_comments_anon_insert ON post_comments;
CREATE POLICY post_comments_anon_insert ON post_comments
  FOR INSERT TO anon
  WITH CHECK (user_id IS NOT NULL);

DROP POLICY IF EXISTS post_comments_anon_delete ON post_comments;
CREATE POLICY post_comments_anon_delete ON post_comments
  FOR DELETE TO anon
  USING (true);

-- 3. post_likes: allow anon likes and unlikes
DROP POLICY IF EXISTS post_likes_anon_all ON post_likes;
CREATE POLICY post_likes_anon_all ON post_likes
  FOR ALL TO anon
  USING (true)
  WITH CHECK (user_id IS NOT NULL);

-- 4. saved_posts: allow anon save and unsave
DROP POLICY IF EXISTS saved_posts_anon_all ON saved_posts;
CREATE POLICY saved_posts_anon_all ON saved_posts
  FOR ALL TO anon
  USING (true)
  WITH CHECK (user_id IS NOT NULL);

-- 5. user_follows: allow anon follow and unfollow
DROP POLICY IF EXISTS user_follows_anon_all ON user_follows;
CREATE POLICY user_follows_anon_all ON user_follows
  FOR ALL TO anon
  USING (true)
  WITH CHECK (follower_id IS NOT NULL);

-- 6. posts: allow anon create and delete
DROP POLICY IF EXISTS posts_anon_insert ON posts;
CREATE POLICY posts_anon_insert ON posts
  FOR INSERT TO anon
  WITH CHECK (user_id IS NOT NULL);

DROP POLICY IF EXISTS posts_anon_delete ON posts;
CREATE POLICY posts_anon_delete ON posts
  FOR DELETE TO anon
  USING (true);

-- 7. post_media: allow anon insert
DROP POLICY IF EXISTS post_media_anon_insert ON post_media;
CREATE POLICY post_media_anon_insert ON post_media
  FOR INSERT TO anon
  WITH CHECK (post_id IS NOT NULL);

-- 8. stories: allow anon create and delete
DROP POLICY IF EXISTS stories_anon_insert ON stories;
CREATE POLICY stories_anon_insert ON stories
  FOR INSERT TO anon
  WITH CHECK (user_id IS NOT NULL);

DROP POLICY IF EXISTS stories_anon_delete ON stories;
CREATE POLICY stories_anon_delete ON stories
  FOR DELETE TO anon
  USING (true);

-- 9. groups: allow anon create
DROP POLICY IF EXISTS groups_anon_insert ON groups;
CREATE POLICY groups_anon_insert ON groups
  FOR INSERT TO anon
  WITH CHECK (owner_id IS NOT NULL);

-- 10. group_members: allow anon join and leave
DROP POLICY IF EXISTS group_members_anon_all ON group_members;
CREATE POLICY group_members_anon_all ON group_members
  FOR ALL TO anon
  USING (true)
  WITH CHECK (user_id IS NOT NULL);

