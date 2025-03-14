-- Drop existing tables if they exist (to avoid conflicts)
DROP TABLE IF EXISTS public.private_messages;
DROP TABLE IF EXISTS public.private_chats;

-- Create private chats table
CREATE TABLE IF NOT EXISTS public.private_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  CONSTRAINT different_users CHECK (user1_id <> user2_id),
  UNIQUE(user1_id, user2_id)
);

-- Create private messages table
CREATE TABLE IF NOT EXISTS public.private_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.private_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_private_chats_user1_id ON public.private_chats(user1_id);
CREATE INDEX IF NOT EXISTS idx_private_chats_user2_id ON public.private_chats(user2_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_chat_id ON public.private_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_sender_id ON public.private_messages(sender_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.private_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for private_chats
CREATE POLICY "Users can view their own private chats" 
  ON public.private_chats FOR SELECT 
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create private chats with other users" 
  ON public.private_chats FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their own private chats" 
  ON public.private_chats FOR UPDATE 
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Create policies for private_messages
CREATE POLICY "Users can view messages in their chats" 
  ON public.private_messages FOR SELECT 
  USING (
    chat_id IN (
      SELECT id FROM public.private_chats 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their chats" 
  ON public.private_messages FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = sender_id AND
    chat_id IN (
      SELECT id FROM public.private_chats 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can update read status of messages in their chats" 
  ON public.private_messages FOR UPDATE 
  USING (
    chat_id IN (
      SELECT id FROM public.private_chats 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;

-- Create function to update last_message and last_message_time in private_chats
CREATE OR REPLACE FUNCTION public.update_private_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.private_chats
  SET 
    last_message = NEW.content,
    last_message_time = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update last_message when a new message is inserted
DROP TRIGGER IF EXISTS on_private_message_inserted ON public.private_messages;
CREATE TRIGGER on_private_message_inserted
  AFTER INSERT ON public.private_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_private_chat_last_message(); 