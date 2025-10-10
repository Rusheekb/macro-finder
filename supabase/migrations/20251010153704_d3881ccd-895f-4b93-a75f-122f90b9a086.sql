-- Create unique indexes for safe upserts and better performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_chain_key ON public.brands(chain_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_place_id ON public.restaurants(place_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_brand_item ON public.menu_items(brand_id, item_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_local_prices_restaurant_item ON public.local_prices(restaurant_id, item_id);