import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if demo seeding is allowed
    const allowDemoSeed = Deno.env.get('ALLOW_DEMO_SEED');
    if (allowDemoSeed !== 'true') {
      console.log('Demo seed blocked: ALLOW_DEMO_SEED not set to true');
      return new Response(
        JSON.stringify({ error: 'Demo seeding is not enabled' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Checking if tables are empty...');

    // Check if tables are empty
    const [brandsResult, menuItemsResult, restaurantsResult] = await Promise.all([
      supabase.from('brands').select('*', { count: 'exact', head: true }),
      supabase.from('menu_items').select('*', { count: 'exact', head: true }),
      supabase.from('restaurants').select('*', { count: 'exact', head: true }),
    ]);

    const brandCount = brandsResult.count ?? 0;
    const menuItemCount = menuItemsResult.count ?? 0;
    const restaurantCount = restaurantsResult.count ?? 0;

    console.log('Current counts:', { brandCount, menuItemCount, restaurantCount });

    if (brandCount > 0 || menuItemCount > 0 || restaurantCount > 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Tables already contain data',
          counts: { brandCount, menuItemCount, restaurantCount }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Frisco, TX coordinates (approximate center)
    const friscoLat = 33.1507;
    const friscoLng = -96.8236;

    // Insert brands
    const brandsData = [
      { chain_key: 'mcdonalds', display_name: "McDonald's" },
      { chain_key: 'chipotle', display_name: 'Chipotle' },
      { chain_key: 'wingstop', display_name: 'Wingstop' },
    ];

    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .upsert(brandsData, { onConflict: 'chain_key' })
      .select();

    if (brandsError) {
      console.error('Failed to insert brands:', brandsError);
      throw brandsError;
    }

    console.log(`Inserted ${brands.length} brands`);

    // Create brand lookup
    const brandMap = new Map(brands.map(b => [b.chain_key, b.id]));

    // Insert menu items
    const menuItemsData = [
      // McDonald's
      { brand_id: brandMap.get('mcdonalds'), item_name: 'Big Mac', calories: 563, protein_g: 25, default_price: 5.99 },
      { brand_id: brandMap.get('mcdonalds'), item_name: 'Quarter Pounder', calories: 520, protein_g: 26, default_price: 6.49 },
      { brand_id: brandMap.get('mcdonalds'), item_name: 'McChicken', calories: 400, protein_g: 14, default_price: 3.99 },
      { brand_id: brandMap.get('mcdonalds'), item_name: '10 Piece McNuggets', calories: 420, protein_g: 24, default_price: 5.49 },
      { brand_id: brandMap.get('mcdonalds'), item_name: 'Artisan Grilled Chicken Sandwich', calories: 380, protein_g: 37, default_price: 6.99 },
      
      // Chipotle
      { brand_id: brandMap.get('chipotle'), item_name: 'Chicken Bowl', calories: 630, protein_g: 42, default_price: 9.99 },
      { brand_id: brandMap.get('chipotle'), item_name: 'Steak Bowl', calories: 680, protein_g: 38, default_price: 11.99 },
      { brand_id: brandMap.get('chipotle'), item_name: 'Carnitas Bowl', calories: 710, protein_g: 35, default_price: 10.49 },
      { brand_id: brandMap.get('chipotle'), item_name: 'Chicken Burrito', calories: 1120, protein_g: 55, default_price: 9.99 },
      { brand_id: brandMap.get('chipotle'), item_name: 'Veggie Bowl', calories: 430, protein_g: 16, default_price: 8.99 },
      
      // Wingstop
      { brand_id: brandMap.get('wingstop'), item_name: '6 Boneless Wings', calories: 520, protein_g: 32, default_price: 7.49 },
      { brand_id: brandMap.get('wingstop'), item_name: '6 Classic Wings', calories: 430, protein_g: 43, default_price: 8.99 },
      { brand_id: brandMap.get('wingstop'), item_name: '10 Classic Wings', calories: 710, protein_g: 72, default_price: 12.99 },
      { brand_id: brandMap.get('wingstop'), item_name: 'Chicken Sandwich', calories: 550, protein_g: 34, default_price: 6.99 },
      { brand_id: brandMap.get('wingstop'), item_name: 'Chicken Tenders (5pc)', calories: 610, protein_g: 40, default_price: 8.49 },
    ];

    const { data: menuItems, error: menuItemsError } = await supabase
      .from('menu_items')
      .insert(menuItemsData)
      .select();

    if (menuItemsError) {
      console.error('Failed to insert menu items:', menuItemsError);
      throw menuItemsError;
    }

    console.log(`Inserted ${menuItems.length} menu items`);

    // Insert restaurants (2-3 per brand around Frisco, TX)
    const restaurantsData = [
      // McDonald's locations
      { brand_id: brandMap.get('mcdonalds'), name: "McDonald's - Preston Rd", lat: friscoLat + 0.02, lng: friscoLng + 0.01, address: '6000 Preston Rd', city: 'Frisco', state: 'TX', postal_code: '75034' },
      { brand_id: brandMap.get('mcdonalds'), name: "McDonald's - Main St", lat: friscoLat - 0.01, lng: friscoLng - 0.02, address: '3500 Main St', city: 'Frisco', state: 'TX', postal_code: '75033' },
      
      // Chipotle locations
      { brand_id: brandMap.get('chipotle'), name: 'Chipotle - Legacy Dr', lat: friscoLat + 0.03, lng: friscoLng - 0.01, address: '5700 Legacy Dr', city: 'Frisco', state: 'TX', postal_code: '75034' },
      { brand_id: brandMap.get('chipotle'), name: 'Chipotle - Warren Pkwy', lat: friscoLat - 0.02, lng: friscoLng + 0.02, address: '2500 Warren Pkwy', city: 'Frisco', state: 'TX', postal_code: '75035' },
      { brand_id: brandMap.get('chipotle'), name: 'Chipotle - Eldorado Pkwy', lat: friscoLat + 0.01, lng: friscoLng + 0.03, address: '8000 Eldorado Pkwy', city: 'Frisco', state: 'TX', postal_code: '75036' },
      
      // Wingstop locations
      { brand_id: brandMap.get('wingstop'), name: 'Wingstop - Stonebrook Pkwy', lat: friscoLat - 0.03, lng: friscoLng - 0.01, address: '4200 Stonebrook Pkwy', city: 'Frisco', state: 'TX', postal_code: '75034' },
      { brand_id: brandMap.get('wingstop'), name: 'Wingstop - Lebanon Rd', lat: friscoLat + 0.025, lng: friscoLng - 0.025, address: '7500 Lebanon Rd', city: 'Frisco', state: 'TX', postal_code: '75035' },
    ];

    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .insert(restaurantsData)
      .select();

    if (restaurantsError) {
      console.error('Failed to insert restaurants:', restaurantsError);
      throw restaurantsError;
    }

    console.log(`Inserted ${restaurants.length} restaurants`);

    const result = {
      success: true,
      inserted: {
        brands: brands.length,
        menuItems: menuItems.length,
        restaurants: restaurants.length,
      },
      message: 'Demo data successfully inserted',
    };

    console.log('Demo seed complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in seed_demo function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
