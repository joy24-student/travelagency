-- Enable reading group messages in public groups for anon and authenticated
DROP POLICY IF EXISTS group_messages_public_read ON group_messages;
CREATE POLICY group_messages_public_read ON group_messages
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM groups WHERE groups.id = group_messages.group_id AND groups.privacy = 'public'));

-- Also allow inserting messages into public groups for authenticated and anon demo
DROP POLICY IF EXISTS group_messages_public_insert ON group_messages;
CREATE POLICY group_messages_public_insert ON group_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM groups WHERE groups.id = group_messages.group_id AND groups.privacy = 'public'));

