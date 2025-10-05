import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/integrations/supabase/types';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedData() {
  console.log('🌱 Starting database seed...');

  try {
    // Seed brands
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .upsert([
        { chain_key: 'mcdonalds', display_name: "McDonald's" },
        { chain_key: 'chipotle', display_name: 'Chipotle Mexican Grill' },
        { chain_key: 'subway', display_name: 'Subway' },
        { chain_key: 'kfc', display_name: 'KFC' },
        { chain_key: 'tacobell', display_name: 'Taco Bell' },
      ])
      .select();

    if (brandsError) throw brandsError;
    console.log('✅ Seeded brands:', brands?.length);

    // Create a brand map for easy reference
    const brandMap = brands?.reduce((acc, brand) => {
      acc[brand.chain_key] = brand.id;
      return acc;
    }, {} as Record<string, string>) || {};

    // Seed restaurants (3-4 per brand, coordinates around downtown LA)
    const restaurants = [
      // McDonald's locations
      { name: "McDonald's Downtown", brand_id: brandMap['mcdonalds'], lat: 34.0522, lng: -118.2437, address: '123 Main St', city: 'Los Angeles', state: 'CA', postal_code: '90012' },
      { name: "McDonald's West LA", brand_id: brandMap['mcdonalds'], lat: 34.0420, lng: -118.2650, address: '456 Broadway', city: 'Los Angeles', state: 'CA', postal_code: '90015' },
      { name: "McDonald's East Side", brand_id: brandMap['mcdonalds'], lat: 34.0600, lng: -118.2200, address: '789 Hill St', city: 'Los Angeles', state: 'CA', postal_code: '90013' },
      
      // Chipotle locations
      { name: 'Chipotle Downtown', brand_id: brandMap['chipotle'], lat: 34.0530, lng: -118.2480, address: '321 Spring St', city: 'Los Angeles', state: 'CA', postal_code: '90012' },
      { name: 'Chipotle Financial District', brand_id: brandMap['chipotle'], lat: 34.0500, lng: -118.2500, address: '654 Flower St', city: 'Los Angeles', state: 'CA', postal_code: '90071' },
      { name: 'Chipotle Arts District', brand_id: brandMap['chipotle'], lat: 34.0440, lng: -118.2350, address: '987 Alameda St', city: 'Los Angeles', state: 'CA', postal_code: '90013' },
      
      // Subway locations
      { name: 'Subway Central', brand_id: brandMap['subway'], lat: 34.0510, lng: -118.2420, address: '147 Grand Ave', city: 'Los Angeles', state: 'CA', postal_code: '90012' },
      { name: 'Subway Plaza', brand_id: brandMap['subway'], lat: 34.0490, lng: -118.2550, address: '258 Figueroa St', city: 'Los Angeles', state: 'CA', postal_code: '90071' },
      { name: 'Subway Historic Core', brand_id: brandMap['subway'], lat: 34.0470, lng: -118.2470, address: '369 Broadway', city: 'Los Angeles', state: 'CA', postal_code: '90013' },
      { name: 'Subway Little Tokyo', brand_id: brandMap['subway'], lat: 34.0500, lng: -118.2380, address: '741 1st St', city: 'Los Angeles', state: 'CA', postal_code: '90012' },
      
      // KFC locations
      { name: 'KFC Downtown', brand_id: brandMap['kfc'], lat: 34.0540, lng: -118.2460, address: '852 Main St', city: 'Los Angeles', state: 'CA', postal_code: '90014' },
      { name: 'KFC Fashion District', brand_id: brandMap['kfc'], lat: 34.0430, lng: -118.2520, address: '963 Los Angeles St', city: 'Los Angeles', state: 'CA', postal_code: '90015' },
      { name: 'KFC Civic Center', brand_id: brandMap['kfc'], lat: 34.0560, lng: -118.2430, address: '159 Temple St', city: 'Los Angeles', state: 'CA', postal_code: '90012' },
      
      // Taco Bell locations
      { name: 'Taco Bell Downtown', brand_id: brandMap['tacobell'], lat: 34.0515, lng: -118.2445, address: '753 Hill St', city: 'Los Angeles', state: 'CA', postal_code: '90014' },
      { name: 'Taco Bell South Park', brand_id: brandMap['tacobell'], lat: 34.0400, lng: -118.2570, address: '864 Pico Blvd', city: 'Los Angeles', state: 'CA', postal_code: '90015' },
      { name: 'Taco Bell Chinatown', brand_id: brandMap['tacobell'], lat: 34.0630, lng: -118.2380, address: '951 Broadway', city: 'Los Angeles', state: 'CA', postal_code: '90012' },
    ];

    const { data: insertedRestaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .upsert(restaurants)
      .select();

    if (restaurantsError) throw restaurantsError;
    console.log('✅ Seeded restaurants:', insertedRestaurants?.length);

    // Seed menu items
    const menuItems = [
      // McDonald's items
      { item_name: 'Big Mac', brand_id: brandMap['mcdonalds'], calories: 550, protein_g: 25, default_price: 5.99 },
      { item_name: 'Quarter Pounder with Cheese', brand_id: brandMap['mcdonalds'], calories: 520, protein_g: 30, default_price: 6.49 },
      { item_name: 'McChicken', brand_id: brandMap['mcdonalds'], calories: 400, protein_g: 14, default_price: 4.29 },
      { item_name: '10 Piece Chicken McNuggets', brand_id: brandMap['mcdonalds'], calories: 440, protein_g: 24, default_price: 5.49 },
      { item_name: 'Filet-O-Fish', brand_id: brandMap['mcdonalds'], calories: 390, protein_g: 16, default_price: 4.99 },
      
      // Chipotle items
      { item_name: 'Chicken Bowl', brand_id: brandMap['chipotle'], calories: 630, protein_g: 45, default_price: 10.95 },
      { item_name: 'Steak Bowl', brand_id: brandMap['chipotle'], calories: 650, protein_g: 42, default_price: 12.45 },
      { item_name: 'Carnitas Bowl', brand_id: brandMap['chipotle'], calories: 700, protein_g: 40, default_price: 11.45 },
      { item_name: 'Barbacoa Bowl', brand_id: brandMap['chipotle'], calories: 670, protein_g: 43, default_price: 12.45 },
      { item_name: 'Chicken Burrito', brand_id: brandMap['chipotle'], calories: 1050, protein_g: 55, default_price: 10.95 },
      
      // Subway items
      { item_name: '6" Turkey Breast', brand_id: brandMap['subway'], calories: 280, protein_g: 18, default_price: 5.99 },
      { item_name: '6" Italian BMT', brand_id: brandMap['subway'], calories: 410, protein_g: 19, default_price: 6.49 },
      { item_name: '6" Meatball Marinara', brand_id: brandMap['subway'], calories: 480, protein_g: 21, default_price: 5.49 },
      { item_name: '6" Chicken & Bacon Ranch', brand_id: brandMap['subway'], calories: 530, protein_g: 36, default_price: 7.99 },
      { item_name: '6" Steak & Cheese', brand_id: brandMap['subway'], calories: 380, protein_g: 24, default_price: 7.49 },
      { item_name: 'Footlong Turkey Breast', brand_id: brandMap['subway'], calories: 560, protein_g: 36, default_price: 9.99 },
      
      // KFC items
      { item_name: '3 Piece Original Recipe Chicken', brand_id: brandMap['kfc'], calories: 760, protein_g: 68, default_price: 9.99 },
      { item_name: '2 Piece Extra Crispy Chicken', brand_id: brandMap['kfc'], calories: 590, protein_g: 42, default_price: 7.49 },
      { item_name: 'Chicken Pot Pie', brand_id: brandMap['kfc'], calories: 790, protein_g: 29, default_price: 6.99 },
      { item_name: 'Popcorn Chicken', brand_id: brandMap['kfc'], calories: 410, protein_g: 26, default_price: 5.99 },
      { item_name: 'Famous Bowl', brand_id: brandMap['kfc'], calories: 720, protein_g: 26, default_price: 6.49 },
      
      // Taco Bell items
      { item_name: 'Crunchy Taco Supreme', brand_id: brandMap['tacobell'], calories: 190, protein_g: 9, default_price: 2.49 },
      { item_name: 'Burrito Supreme', brand_id: brandMap['tacobell'], calories: 410, protein_g: 17, default_price: 4.99 },
      { item_name: 'Chalupa Supreme', brand_id: brandMap['tacobell'], calories: 360, protein_g: 14, default_price: 4.49 },
      { item_name: 'Quesadilla', brand_id: brandMap['tacobell'], calories: 510, protein_g: 19, default_price: 4.99 },
      { item_name: 'Power Bowl', brand_id: brandMap['tacobell'], calories: 470, protein_g: 26, default_price: 6.99 },
      { item_name: 'Crunchwrap Supreme', brand_id: brandMap['tacobell'], calories: 530, protein_g: 16, default_price: 5.49 },
    ];

    const { data: insertedMenuItems, error: menuItemsError } = await supabase
      .from('menu_items')
      .upsert(menuItems)
      .select();

    if (menuItemsError) throw menuItemsError;
    console.log('✅ Seeded menu items:', insertedMenuItems?.length);

    console.log('🎉 Database seeded successfully!');
    console.log(`📊 Summary: ${brands?.length} brands, ${insertedRestaurants?.length} restaurants, ${insertedMenuItems?.length} menu items`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedData();