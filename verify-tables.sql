-- Verify that the private_chats table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'private_chats'
);

-- Verify that the private_messages table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'private_messages'
);

-- Check the structure of the private_chats table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'private_chats';

-- Check the structure of the private_messages table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'private_messages';

-- Check if the trigger exists
SELECT EXISTS (
   SELECT FROM information_schema.triggers
   WHERE trigger_name = 'on_private_message_inserted'
);

-- Check if there are any rows in the tables
SELECT COUNT(*) FROM public.private_chats;
SELECT COUNT(*) FROM public.private_messages; 