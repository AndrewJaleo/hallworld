-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Check and add bio_background_color
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles'
                  AND column_name = 'bio_background_color') THEN
        ALTER TABLE public.profiles ADD COLUMN bio_background_color TEXT;
    END IF;
    
    -- Check and add bio_background_image
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles'
                  AND column_name = 'bio_background_image') THEN
        ALTER TABLE public.profiles ADD COLUMN bio_background_image TEXT;
    END IF;
    
    -- Check and add bio_background_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles'
                  AND column_name = 'bio_background_type') THEN
        ALTER TABLE public.profiles ADD COLUMN bio_background_type TEXT DEFAULT 'color';
    END IF;
    
    -- Check and add container_background_color
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles'
                  AND column_name = 'container_background_color') THEN
        ALTER TABLE public.profiles ADD COLUMN container_background_color TEXT;
    END IF;
    
    -- Check and add container_background_image
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles'
                  AND column_name = 'container_background_image') THEN
        ALTER TABLE public.profiles ADD COLUMN container_background_image TEXT;
    END IF;
    
    -- Check and add container_background_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles'
                  AND column_name = 'container_background_type') THEN
        ALTER TABLE public.profiles ADD COLUMN container_background_type TEXT DEFAULT 'color';
    END IF;
END $$;
