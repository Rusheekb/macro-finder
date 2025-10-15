import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefreshRequest {
  lat: number;
  lng: number;
  radiusKm?: number;
  includeBrands?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RefreshRequest = await req.json();
    const { 
      lat, 
      lng, 
      radiusKm = 8, 
      includeBrands = [
        // Top tier chains (most coverage)
        'mcdonalds', 'chipotle', 'wingstop', 'subway', 'kfc', 'tacobell', 'burgerking', 'wendys',
        'chickfila', 'pandaexpress', 'fiveguys', 'panerabread', 'popeyes', 'dominos', 'pizzahut',
        // Mid tier chains  
        'shakeshack', 'raisingcanes', 'jimmyjohns', 'jerseymikes', 'qdoba', 'moes', 'papajohns',
        'starbucks', 'dunkin', 'sonic', 'arbys', 'firehouse', 'zaxbys', 'littlecaesars',
        // Regional favorites
        'innout', 'whataburger', 'culvers', 'deltaco', 'jackinthebox', 'potbelly', 'blazepizza',
        'modpizza', 'dutchbros', 'bajafresh', 'waba', 'elpollo', 'carls', 'hardees'
      ] 
    } = body;

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'lat and lng are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Refreshing brand menus near (${lat}, ${lng}) within ${radiusKm}km`, includeBrands);

    // Helper to query restaurants in bounding box
    const queryRestaurants = async (radius: number) => {
      const latDelta = radius / 111;
      const lngDelta = radius / (111 * Math.cos(lat * Math.PI / 180));

      const { data, error } = await supabase
        .from('restaurants')
        .select('brand_id, brands!inner(id, chain_key, last_imported_at)')
        .gte('lat', lat - latDelta)
        .lte('lat', lat + latDelta)
        .gte('lng', lng - lngDelta)
        .lte('lng', lng + lngDelta)
        .not('brand_id', 'is', null);

      return { data, error };
    };

    // Query restaurants within radius
    let { data: restaurants, error: restaurantsError } = await queryRestaurants(radiusKm);

    if (restaurantsError) {
      console.error('Failed to query restaurants:', restaurantsError);
      throw restaurantsError;
    }

    // If no restaurants found, call nearby to discover them
    if (!restaurants || restaurants.length === 0) {
      console.log('No restaurants in DB, calling nearby to discover...');
      
      let currentRadius = radiusKm;
      let nearbyAttempts = 0;
      const maxAttempts = 3;

      while (nearbyAttempts < maxAttempts) {
        try {
          const { data: nearbyData, error: nearbyError } = await supabase.functions.invoke(
            'nearby',
            {
              body: { lat, lng, radiusKm: currentRadius, chainKeys: includeBrands },
            }
          );

          if (nearbyError) {
            console.error('Nearby call failed:', nearbyError);
            break;
          }

          const nearbyCount = nearbyData?.count || 0;
          console.log(`Nearby discovered ${nearbyCount} restaurants at ${currentRadius}km`);

          if (nearbyCount > 0) {
            // Re-query restaurants after nearby discovery
            const { data: newRestaurants } = await queryRestaurants(currentRadius);
            restaurants = newRestaurants;
            break;
          }

          // Expand radius and retry
          nearbyAttempts++;
          if (nearbyAttempts < maxAttempts) {
            currentRadius = currentRadius * 1.5;
            console.log(`Expanding radius to ${currentRadius.toFixed(1)}km...`);
          }
        } catch (error) {
          console.error('Error calling nearby:', error);
          break;
        }
      }

      // Final check after all attempts
      if (!restaurants || restaurants.length === 0) {
        console.log('No restaurants found after nearby discovery attempts');
        return new Response(
          JSON.stringify({
            brandsChecked: 0,
            brandsImported: 0,
            message: 'No restaurants found nearby. Try expanding your search radius or visiting areas with chain restaurants.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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

    const discoveredCount = restaurants.length;
    console.log(`Discovered ${discoveredCount} restaurants, ${uniqueBrands.size} unique brands`);

    // Check which brands need importing (null or older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const brandsToImport = Array.from(uniqueBrands.values()).filter(brand => {
      if (!brand.last_imported_at) return true;
      const lastImported = new Date(brand.last_imported_at);
      return lastImported < sevenDaysAgo;
    });

    console.log(`Brands to import: ${brandsToImport.length} of ${uniqueBrands.size}`);

    // Import each brand with retry logic
    let importedCount = 0;
    const importResults = [];

    const importWithRetry = async (brand: { id: string; chain_key: string }, maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Importing ${brand.chain_key} (attempt ${attempt})...`);
          const { data: importData, error: importError } = await supabase.functions.invoke(
            'import_brand_menu',
            {
              body: { chainKey: brand.chain_key },
            }
          );

          if (importError) {
            if (attempt < maxRetries && (importError.message?.includes('429') || importError.message?.includes('rate limit'))) {
              const backoffMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
              console.log(`Rate limited, waiting ${backoffMs}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, backoffMs));
              continue;
            }
            throw importError;
          }

          // Update last_imported_at on success
          const { error: updateError } = await supabase
            .from('brands')
            .update({ last_imported_at: new Date().toISOString() })
            .eq('id', brand.id);

          if (updateError) {
            console.error(`Failed to update last_imported_at for ${brand.chain_key}:`, updateError);
          }

          console.log(`Successfully imported ${brand.chain_key}: ${importData.inserted} inserted, ${importData.updated} updated`);
          return { 
            brand: brand.chain_key, 
            success: true, 
            inserted: importData.inserted, 
            updated: importData.updated 
          };
        } catch (error) {
          if (attempt === maxRetries) {
            console.error(`Failed to import ${brand.chain_key} after ${maxRetries} attempts:`, error);
            return { brand: brand.chain_key, success: false, error: error.message };
          }
        }
      }
    };

    for (const brand of brandsToImport) {
      const result = await importWithRetry(brand);
      if (result.success) {
        importedCount++;
      }
      importResults.push(result);
    }

    const durationMs = Date.now() - startTime;

    console.log(`Refresh complete: ${importedCount}/${brandsToImport.length} imported in ${durationMs}ms`);

    return new Response(
      JSON.stringify({
        discoveredCount,
        uniqueBrands: uniqueBrands.size,
        brandsChecked: uniqueBrands.size,
        brandsImported: importedCount,
        brandsNeedingImport: brandsToImport.length,
        durationMs,
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
