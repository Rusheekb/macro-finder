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

    // Example restaurants and menu items can be added here
    console.log('🎉 Database seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedData();