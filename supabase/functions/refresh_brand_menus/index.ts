import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefreshRequest {
  lat: number;
  lng: number;
  radiusKm?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RefreshRequest = await req.json();
    const { lat, lng, radiusKm = 5 } = body;

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'lat and lng are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Refreshing brand menus near (${lat}, ${lng}) within ${radiusKm}km`);

    // Calculate bounding box for radius search
    // Rough approximation: 1 degree ≈ 111km
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

    // Query restaurants within radius and get unique brands
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('brand_id, brands!inner(id, chain_key, last_imported_at)')
      .gte('lat', lat - latDelta)
      .lte('lat', lat + latDelta)
      .gte('lng', lng - lngDelta)
      .lte('lng', lng + lngDelta)
      .not('brand_id', 'is', null);

    if (restaurantsError) {
      console.error('Failed to query restaurants:', restaurantsError);
      throw restaurantsError;
    }

    if (!restaurants || restaurants.length === 0) {
      console.log('No restaurants found in radius');
      return new Response(
        JSON.stringify({
          brandsChecked: 0,
          brandsImported: 0,
          message: 'No restaurants found in radius',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique brands
    const uniqueBrands = new Map<string, { id: string; chain_key: string; last_imported_at: string | null }>();
    
    for (const restaurant of restaurants) {
      const brand = restaurant.brands as any;
      if (brand && !uniqueBrands.has(brand.id)) {
        uniqueBrands.set(brand.id, {
          id: brand.id,
          chain_key: brand.chain_key,
          last_imported_at: brand.last_imported_at,
        });
      }
    }

    console.log(`Found ${uniqueBrands.size} unique brands`);

    // Check which brands need importing (null or older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const brandsToImport = Array.from(uniqueBrands.values()).filter(brand => {
      if (!brand.last_imported_at) return true;
      const lastImported = new Date(brand.last_imported_at);
      return lastImported < sevenDaysAgo;
    });

    console.log(`${brandsToImport.length} brands need importing`);

    // Import each brand
    let importedCount = 0;
    const importResults = [];

    for (const brand of brandsToImport) {
      try {
        console.log(`Importing ${brand.chain_key}...`);
        const { data: importData, error: importError } = await supabase.functions.invoke(
          'import_brand_menu',
          {
            body: { chainKey: brand.chain_key },
          }
        );

        if (importError) {
          console.error(`Failed to import ${brand.chain_key}:`, importError);
          importResults.push({ brand: brand.chain_key, success: false, error: importError.message });
        } else {
          console.log(`Successfully imported ${brand.chain_key}: ${importData.inserted} inserted, ${importData.updated} updated`);
          importedCount++;
          importResults.push({ 
            brand: brand.chain_key, 
            success: true, 
            inserted: importData.inserted, 
            updated: importData.updated 
          });
        }
      } catch (error) {
        console.error(`Error importing ${brand.chain_key}:`, error);
        importResults.push({ brand: brand.chain_key, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        brandsChecked: uniqueBrands.size,
        brandsImported: importedCount,
        brandsNeedingImport: brandsToImport.length,
        importResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in refresh_brand_menus function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
