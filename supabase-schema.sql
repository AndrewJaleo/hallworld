-- Create group_chats table
CREATE TABLE IF NOT EXISTS public.group_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  city TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create group_messages table
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id ON public.group_messages(sender_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for group_chats
CREATE POLICY "Allow all users to view group chats" 
  ON public.group_chats FOR SELECT 
  USING (true);

CREATE POLICY "Allow authenticated users to create group chats" 
  ON public.group_chats FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create policies for group_messages
CREATE POLICY "Allow all users to view group messages" 
  ON public.group_messages FOR SELECT 
  USING (true);

CREATE POLICY "Allow authenticated users to send messages" 
  ON public.group_messages FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = sender_id);

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

-- Make sure we have a profiles table (if not already created)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  likings TEXT,
  age INTEGER,
  gender TEXT,
  avatar_url TEXT,
  biography TEXT,
  canvas_state JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create policy for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view all profiles" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Allow users to update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Create a trigger to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 