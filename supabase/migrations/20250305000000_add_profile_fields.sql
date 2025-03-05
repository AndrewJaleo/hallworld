-- Add new columns to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS likings TEXT,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS biography TEXT,
ADD COLUMN IF NOT EXISTS canvas_state JSONB;

-- Comment on columns
COMMENT ON COLUMN public.profiles.name IS 'User''s display name';
COMMENT ON COLUMN public.profiles.likings IS 'User''s interests and likings';
COMMENT ON COLUMN public.profiles.age IS 'User''s age';
COMMENT ON COLUMN public.profiles.gender IS 'User''s gender';
COMMENT ON COLUMN public.profiles.biography IS 'User''s biography or about me text';
COMMENT ON COLUMN public.profiles.canvas_state IS 'JSON representation of the user''s canvas editor state'; 