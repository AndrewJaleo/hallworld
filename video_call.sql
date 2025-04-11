CREATE TABLE call_notifications (
  id SERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  receiver_id UUID NOT NULL REFERENCES auth.users(id),
  chat_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'ringing', 'accepted', 'declined', 'ended'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE call_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own call notifications"
  ON call_notifications
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create call notifications"
  ON call_notifications
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own call notifications"
  ON call_notifications
  FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
