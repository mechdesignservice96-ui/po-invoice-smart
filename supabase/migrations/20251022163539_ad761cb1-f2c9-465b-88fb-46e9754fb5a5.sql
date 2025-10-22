-- Add company_logo_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'company_logo_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN company_logo_url TEXT;
  END IF;
END $$;

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for company logos
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view any company logo'
  ) THEN
    CREATE POLICY "Users can view any company logo"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'company-logos');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own company logo'
  ) THEN
    CREATE POLICY "Users can upload their own company logo"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'company-logos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own company logo'
  ) THEN
    CREATE POLICY "Users can update their own company logo"
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'company-logos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own company logo'
  ) THEN
    CREATE POLICY "Users can delete their own company logo"
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'company-logos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;