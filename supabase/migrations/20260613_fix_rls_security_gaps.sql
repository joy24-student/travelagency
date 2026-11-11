-- ============================================================================
-- ZERO-TRUST SECURITY PATCH: Fix RLS gaps on user_device_tokens, user_settings, user_addresses
-- Migration Version: 20260613_fix_rls_security_gaps.sql
-- ============================================================================

BEGIN;

-- 1. Lock down user_device_tokens
-- Drop wide-open public policy created in 20260608h
DROP POLICY IF EXISTS "Public device tokens policy" ON public.user_device_tokens;
DROP POLICY IF EXISTS "User device tokens isolated" ON public.user_device_tokens;

ALTER TABLE public.user_device_tokens ENABLE ROW LEVEL SECURITY;

-- Revoke all table privileges from anon
REVOKE ALL ON public.user_device_tokens FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_device_tokens TO authenticated, service_role;

-- Enforce strict user isolation: users can only read, write, or delete their own tokens
CREATE POLICY "User device tokens isolated" ON public.user_device_tokens
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin())
  WITH CHECK ((SELECT auth.uid()) = user_id OR public.is_admin());


-- 2. Drop leftover open policies on user_settings and user_addresses from 20260608i
DROP POLICY IF EXISTS user_settings_all ON public.user_settings;
DROP POLICY IF EXISTS "User settings isolated" ON public.user_settings;

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated, service_role;

CREATE POLICY "User settings isolated" ON public.user_settings
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin())
  WITH CHECK ((SELECT auth.uid()) = user_id OR public.is_admin());


DROP POLICY IF EXISTS user_addresses_all ON public.user_addresses;
DROP POLICY IF EXISTS "User addresses isolated" ON public.user_addresses;

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_addresses FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_addresses TO authenticated, service_role;

CREATE POLICY "User addresses isolated" ON public.user_addresses
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin())
  WITH CHECK ((SELECT auth.uid()) = user_id OR public.is_admin());


-- 3. Ensure any lingering demo/anon policies from 20260608f are dropped
DROP POLICY IF EXISTS post_comments_anon_insert ON public.post_comments;
DROP POLICY IF EXISTS post_comments_anon_delete ON public.post_comments;
DROP POLICY IF EXISTS post_likes_anon_all ON public.post_likes;
DROP POLICY IF EXISTS saved_posts_anon_all ON public.saved_posts;
DROP POLICY IF EXISTS user_follows_anon_all ON public.user_follows;
DROP POLICY IF EXISTS posts_anon_insert ON public.posts;
DROP POLICY IF EXISTS posts_anon_delete ON public.posts;
DROP POLICY IF EXISTS post_media_anon_insert ON public.post_media;
DROP POLICY IF EXISTS stories_anon_insert ON public.stories;
DROP POLICY IF EXISTS stories_anon_delete ON public.stories;
DROP POLICY IF EXISTS groups_anon_insert ON public.groups;
DROP POLICY IF EXISTS group_members_anon_all ON public.group_members;

REVOKE INSERT, UPDATE, DELETE ON 
  public.posts, public.post_media, public.post_comments, public.post_likes, 
  public.comment_likes, public.stories, public.groups, public.group_members, 
  public.group_messages, public.user_follows, public.saved_posts 
FROM anon;

COMMIT;

NOTIFY pgrst, 'reload schema';
