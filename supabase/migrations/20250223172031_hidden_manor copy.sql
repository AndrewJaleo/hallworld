CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  avatar_url TEXT,
  bio_background_color TEXT,
  bio_background_image TEXT,
  bio_background_type TEXT,
  container_background_color TEXT,
  container_background_image TEXT,
  container_background_type TEXT,
  biography TEXT,
  likings TEXT,
  name TEXT,
  age INTEGER,
  gender TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
