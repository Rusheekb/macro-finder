-- Create brands table (restaurant chains)
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_key TEXT UNIQUE NOT NULL,         -- 'mcdonalds', 'chipotle'
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create restaurants table (physical locations)
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  place_id TEXT UNIQUE,                   -- Google Places or Yelp business id
  name TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create menu items table (global per brand)
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  calories INTEGER,
  protein_g INTEGER,
  default_price NUMERIC(10,2),
  external_ref TEXT,                      -- nutritionix/ndbno/etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create local price overrides table
CREATE TABLE IF NOT EXISTS public.local_prices (
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (restaurant_id, item_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_restaurants_brand ON public.restaurants(brand_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_brand ON public.menu_items(brand_id);
CREATE INDEX IF NOT EXISTS idx_local_prices_restaurant ON public.local_prices(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON public.restaurants(lat, lng);

-- Enable Row Level Security
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_prices ENABLE ROW LEVEL SECURITY;

-- Anonymous read policies for MVP
CREATE POLICY "anon_read_brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "anon_read_restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "anon_read_menu_items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "anon_read_local_prices" ON public.local_prices FOR SELECT USING (true);

-- Service role policies for Edge Functions
CREATE POLICY "service_all_brands" ON public.brands 
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') 
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "service_all_restaurants" ON public.restaurants 
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') 
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "service_all_menu_items" ON public.menu_items 
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') 
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "service_all_local_prices" ON public.local_prices 
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') 
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_brands_updated_at 
  BEFORE UPDATE ON public.brands 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at 
  BEFORE UPDATE ON public.restaurants 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at 
  BEFORE UPDATE ON public.menu_items 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();