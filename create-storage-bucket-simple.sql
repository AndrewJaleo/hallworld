-- This is a simplified script to create the 'avatars' storage bucket in Supabase
-- Run this in the Supabase SQL Editor

-- Create the 'avatars' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create a simple policy to allow authenticated users to update files
CREATE POLICY "Allow authenticated users to update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- Create a simple policy to allow authenticated users to delete files
CREATE POLICY "Allow authenticated users to delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars'); 