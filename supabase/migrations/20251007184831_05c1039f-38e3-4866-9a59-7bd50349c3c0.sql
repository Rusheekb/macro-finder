-- Add last_imported_at column to brands table
ALTER TABLE public.brands 
ADD COLUMN last_imported_at TIMESTAMP WITH TIME ZONE;