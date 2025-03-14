-- This script creates the 'avatars' storage bucket in Supabase
-- Run this in the Supabase SQL Editor

-- Create the 'avatars' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up a policy to allow authenticated users to upload files to the 'avatars' bucket
CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Set up a policy to allow anyone to view files in the 'avatars' bucket
CREATE POLICY "Allow public access to avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Set up a policy to allow users to update their own avatars
CREATE POLICY "Allow users to update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Set up a policy to allow users to delete their own avatars
CREATE POLICY "Allow users to delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]); 