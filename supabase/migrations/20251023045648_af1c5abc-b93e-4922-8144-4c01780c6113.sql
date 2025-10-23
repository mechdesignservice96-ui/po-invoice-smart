-- Add bank details columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN bank_name TEXT,
ADD COLUMN account_name TEXT,
ADD COLUMN account_number TEXT,
ADD COLUMN ifsc_code TEXT,
ADD COLUMN upi_id TEXT;