-- Phase 1: Performance & Caching
-- 1.1 Database Indexing for faster queries

-- Index for location-based restaurant queries
CREATE INDEX IF NOT EXISTS idx_restaurants_brand_location 
ON public.restaurants(brand_id, lat, lng);

-- Index for menu item filtering by nutritional content
CREATE INDEX IF NOT EXISTS idx_menu_items_brand_nutrition 
ON public.menu_items(brand_id, protein_g, calories);

-- Index for price lookups
CREATE INDEX IF NOT EXISTS idx_local_prices_restaurant_item 
ON public.local_prices(restaurant_id, item_id);

-- Index for brand lookups
CREATE INDEX IF NOT EXISTS idx_brands_chain_key 
ON public.brands(chain_key);

-- 1.2 Result Caching System
-- Create cache table for storing ranked results
CREATE TABLE IF NOT EXISTS public.rank_results_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS on cache table
ALTER TABLE public.rank_results_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to read non-expired cache entries
CREATE POLICY "anon_read_valid_cache" 
ON public.rank_results_cache 
FOR SELECT 
USING (expires_at > now());

-- Policy: Allow service role to manage all cache entries
CREATE POLICY "service_all_cache" 
ON public.rank_results_cache 
FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Index for cache lookups by key and expiration
CREATE INDEX IF NOT EXISTS idx_cache_key ON public.rank_results_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON public.rank_results_cache(expires_at);

-- Function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rank_results_cache
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;