-- Add data quality and tracking fields to menu_items
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_menu_items_data_source ON public.menu_items(data_source);
CREATE INDEX IF NOT EXISTS idx_menu_items_verification_status ON public.menu_items(verification_status);