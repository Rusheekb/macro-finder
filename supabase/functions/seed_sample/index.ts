import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting sample data seed...');

    // 1. Seed brands
    const brandsData = [
      { chain_key: 'mcdonalds', display_name: "McDonald's" },
      { chain_key: 'chipotle', display_name: 'Chipotle' },
      { chain_key: 'subway', display_name: 'Subway' },
      { chain_key: 'kfc', display_name: 'KFC' },
      { chain_key: 'tacobell', display_name: 'Taco Bell' },
    ];

    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .upsert(brandsData, { onConflict: 'chain_key' })
      .select();

    if (brandsError) throw brandsError;
    console.log(`Seeded ${brands.length} brands`);

    const brandMap: Record<string, string> = {};
    brands.forEach((b: any) => {
      brandMap[b.chain_key] = b.id;
    });

    // 2. Seed restaurants (3-4 per brand, coordinates around Los Angeles)
    const restaurantsData = [
      // McDonald's
      { name: "McDonald's Downtown LA", brand_id: brandMap.mcdonalds, lat: 34.0522, lng: -118.2437, address: '123 Main St', city: 'Los Angeles', state: 'CA', postal_code: '90012' },
      { name: "McDonald's Hollywood", brand_id: brandMap.mcdonalds, lat: 34.0928, lng: -118.3287, address: '456 Hollywood Blvd', city: 'Los Angeles', state: 'CA', postal_code: '90028' },
      { name: "McDonald's Santa Monica", brand_id: brandMap.mcdonalds, lat: 34.0195, lng: -118.4912, address: '789 Ocean Ave', city: 'Santa Monica', state: 'CA', postal_code: '90401' },
      
      // Chipotle
      { name: 'Chipotle Century City', brand_id: brandMap.chipotle, lat: 34.0559, lng: -118.4163, address: '321 Avenue of the Stars', city: 'Los Angeles', state: 'CA', postal_code: '90067' },
      { name: 'Chipotle Westwood', brand_id: brandMap.chipotle, lat: 34.0633, lng: -118.4456, address: '456 Westwood Blvd', city: 'Los Angeles', state: 'CA', postal_code: '90024' },
      { name: 'Chipotle Downtown', brand_id: brandMap.chipotle, lat: 34.0500, lng: -118.2500, address: '111 Broadway', city: 'Los Angeles', state: 'CA', postal_code: '90012' },
      
      // Subway
      { name: 'Subway Koreatown', brand_id: brandMap.subway, lat: 34.0571, lng: -118.3003, address: '789 Western Ave', city: 'Los Angeles', state: 'CA', postal_code: '90005' },
      { name: 'Subway Beverly Hills', brand_id: brandMap.subway, lat: 34.0736, lng: -118.4004, address: '234 Wilshire Blvd', city: 'Beverly Hills', state: 'CA', postal_code: '90210' },
      { name: 'Subway Pasadena', brand_id: brandMap.subway, lat: 34.1478, lng: -118.1445, address: '567 Colorado Blvd', city: 'Pasadena', state: 'CA', postal_code: '91101' },
      { name: 'Subway Venice', brand_id: brandMap.subway, lat: 33.9850, lng: -118.4695, address: '890 Abbot Kinney', city: 'Venice', state: 'CA', postal_code: '90291' },
      
      // KFC
      { name: 'KFC Downtown', brand_id: brandMap.kfc, lat: 34.0489, lng: -118.2520, address: '345 Main St', city: 'Los Angeles', state: 'CA', postal_code: '90013' },
      { name: 'KFC Inglewood', brand_id: brandMap.kfc, lat: 33.9617, lng: -118.3531, address: '678 Market St', city: 'Inglewood', state: 'CA', postal_code: '90301' },
      { name: 'KFC Glendale', brand_id: brandMap.kfc, lat: 34.1425, lng: -118.2551, address: '901 Brand Blvd', city: 'Glendale', state: 'CA', postal_code: '91204' },
      
      // Taco Bell
      { name: 'Taco Bell Hollywood', brand_id: brandMap.tacobell, lat: 34.1016, lng: -118.3406, address: '234 Highland Ave', city: 'Los Angeles', state: 'CA', postal_code: '90038' },
      { name: 'Taco Bell Culver City', brand_id: brandMap.tacobell, lat: 34.0211, lng: -118.3965, address: '567 Washington Blvd', city: 'Culver City', state: 'CA', postal_code: '90232' },
      { name: 'Taco Bell Long Beach', brand_id: brandMap.tacobell, lat: 33.7701, lng: -118.1937, address: '890 Pine Ave', city: 'Long Beach', state: 'CA', postal_code: '90802' },
    ];

    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .upsert(restaurantsData, { onConflict: 'name' })
      .select();

    if (restaurantsError) throw restaurantsError;
    console.log(`Seeded ${restaurants.length} restaurants`);

    // 3. Seed menu items (linked to brands)
    const menuItemsData = [
      // McDonald's items
      { item_name: 'Big Mac', brand_id: brandMap.mcdonalds, calories: 550, protein_g: 25, default_price: 5.99 },
      { item_name: 'Quarter Pounder with Cheese', brand_id: brandMap.mcdonalds, calories: 520, protein_g: 30, default_price: 6.49 },
      { item_name: '10 Piece Chicken McNuggets', brand_id: brandMap.mcdonalds, calories: 420, protein_g: 23, default_price: 4.99 },
      { item_name: 'McChicken', brand_id: brandMap.mcdonalds, calories: 400, protein_g: 14, default_price: 3.99 },
      { item_name: 'Filet-O-Fish', brand_id: brandMap.mcdonalds, calories: 380, protein_g: 15, default_price: 4.79 },
      
      // Chipotle items
      { item_name: 'Chicken Bowl', brand_id: brandMap.chipotle, calories: 520, protein_g: 42, default_price: 9.50 },
      { item_name: 'Steak Burrito', brand_id: brandMap.chipotle, calories: 790, protein_g: 43, default_price: 11.50 },
      { item_name: 'Carnitas Bowl', brand_id: brandMap.chipotle, calories: 540, protein_g: 32, default_price: 10.25 },
      { item_name: 'Barbacoa Burrito Bowl', brand_id: brandMap.chipotle, calories: 505, protein_g: 41, default_price: 11.25 },
      { item_name: 'Sofritas Bowl', brand_id: brandMap.chipotle, calories: 420, protein_g: 18, default_price: 9.25 },
      
      // Subway items
      { item_name: '6" Turkey Breast Sub', brand_id: brandMap.subway, calories: 280, protein_g: 18, default_price: 5.99 },
      { item_name: '6" Meatball Marinara', brand_id: brandMap.subway, calories: 480, protein_g: 21, default_price: 5.49 },
      { item_name: '6" Veggie Delite', brand_id: brandMap.subway, calories: 230, protein_g: 9, default_price: 4.99 },
      { item_name: '6" Chicken & Bacon Ranch', brand_id: brandMap.subway, calories: 530, protein_g: 36, default_price: 7.49 },
      { item_name: '6" Steak & Cheese', brand_id: brandMap.subway, calories: 380, protein_g: 24, default_price: 7.99 },
      
      // KFC items
      { item_name: '3 Piece Original Recipe', brand_id: brandMap.kfc, calories: 760, protein_g: 59, default_price: 8.99 },
      { item_name: '3 Piece Grilled Chicken', brand_id: brandMap.kfc, calories: 390, protein_g: 55, default_price: 9.49 },
      { item_name: 'Chicken Pot Pie', brand_id: brandMap.kfc, calories: 720, protein_g: 29, default_price: 6.99 },
      { item_name: 'Famous Bowl', brand_id: brandMap.kfc, calories: 680, protein_g: 26, default_price: 5.99 },
      { item_name: 'Popcorn Chicken (Large)', brand_id: brandMap.kfc, calories: 550, protein_g: 28, default_price: 6.49 },
      
      // Taco Bell items
      { item_name: 'Crunchy Taco Supreme', brand_id: brandMap.tacobell, calories: 190, protein_g: 8, default_price: 2.49 },
      { item_name: 'Burrito Supreme', brand_id: brandMap.tacobell, calories: 420, protein_g: 17, default_price: 4.99 },
      { item_name: 'Chalupa Supreme', brand_id: brandMap.tacobell, calories: 360, protein_g: 13, default_price: 4.49 },
      { item_name: 'Quesadilla', brand_id: brandMap.tacobell, calories: 460, protein_g: 19, default_price: 4.99 },
      { item_name: 'Power Bowl', brand_id: brandMap.tacobell, calories: 480, protein_g: 26, default_price: 8.49 },
      { item_name: 'Crunchwrap Supreme', brand_id: brandMap.tacobell, calories: 530, protein_g: 16, default_price: 5.49 },
    ];

    const { data: menuItems, error: menuItemsError } = await supabase
      .from('menu_items')
      .upsert(menuItemsData, { onConflict: 'item_name,brand_id' })
      .select();

    if (menuItemsError) throw menuItemsError;
    console.log(`Seeded ${menuItems.length} menu items`);

    const summary = {
      brands: brands.length,
      restaurants: restaurants.length,
      menuItems: menuItems.length,
    };

    console.log('Sample data seed completed:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error seeding sample data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
