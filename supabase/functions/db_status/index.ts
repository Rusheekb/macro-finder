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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get project URL and derive ref
    const projectUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const projectRef = projectUrl.match(/https:\/\/([^.]+)\./)?.[1] ?? 'unknown';

    console.log('Fetching database status...');

    // Get counts for all tables
    const [brandsResult, restaurantsResult, itemsResult, pricesResult] = await Promise.all([
      supabase.from('brands').select('*', { count: 'exact', head: true }),
      supabase.from('restaurants').select('*', { count: 'exact', head: true }),
      supabase.from('menu_items').select('*', { count: 'exact', head: true }),
      supabase.from('local_prices').select('*', { count: 'exact', head: true }),
    ]);

    const brandCount = brandsResult.count ?? 0;
    const restaurantCount = restaurantsResult.count ?? 0;
    const itemCount = itemsResult.count ?? 0;
    const localPriceCount = pricesResult.count ?? 0;

    console.log('Database counts:', { brandCount, restaurantCount, itemCount, localPriceCount });

    const status = {
      brandCount,
      restaurantCount,
      itemCount,
      localPriceCount,
      projectUrl,
      projectRef,
    };

    return new Response(
      JSON.stringify(status),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in db_status function:', error);
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
