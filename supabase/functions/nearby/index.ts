import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NearbyRequest {
  lat: number;
  lng: number;
  radiusKm?: number;
  chainKeys?: string[];
}

interface OSMElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    brand?: string;
    'addr:street'?: string;
    'addr:city'?: string;
    'addr:state'?: string;
    'addr:postcode'?: string;
  };
}

interface OverpassResponse {
  elements: OSMElement[];
}

const BRAND_MAP: Record<string, { chain_key: string; display_name: string }> = {
  'mcdonalds': { chain_key: 'mcdonalds', display_name: "McDonald's" },
  'chipotle': { chain_key: 'chipotle', display_name: 'Chipotle Mexican Grill' },
  'wingstop': { chain_key: 'wingstop', display_name: 'Wingstop' },
};

function mapToBrandKey(name: string, brand?: string): { chain_key: string; display_name: string } | null {
  const searchText = `${name || ''} ${brand || ''}`.toLowerCase();
  
  for (const [key, value] of Object.entries(BRAND_MAP)) {
    if (searchText.includes(key)) {
      return value;
    }
  }
  
  return null;
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

    const body: NearbyRequest = await req.json();
    const { lat, lng, radiusKm = 8 } = body;

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'lat and lng are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for restaurants near ${lat}, ${lng} within ${radiusKm}km`);

    // Build Overpass QL query
    const radiusMeters = radiusKm * 1000;
    const overpassQuery = `
[out:json][timeout:25];
(
  node["amenity"~"^(fast_food|restaurant)$"]["brand"~"(McDonald|Chipotle|Wingstop)",i](around:${radiusMeters},${lat},${lng});
  node["amenity"~"^(fast_food|restaurant)$"]["name"~"(McDonald|Chipotle|Wingstop)",i](around:${radiusMeters},${lat},${lng});
  way["amenity"~"^(fast_food|restaurant)$"]["brand"~"(McDonald|Chipotle|Wingstop)",i](around:${radiusMeters},${lat},${lng});
  way["amenity"~"^(fast_food|restaurant)$"]["name"~"(McDonald|Chipotle|Wingstop)",i](around:${radiusMeters},${lat},${lng});
);
out center tags;
    `.trim();

    // Call Overpass API with retry logic
    let overpassData: OverpassResponse | null = null;
    let retryCount = 0;
    const maxRetries = 1;

    while (retryCount <= maxRetries && !overpassData) {
      try {
        console.log(`Calling Overpass API (attempt ${retryCount + 1})`);
        const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(overpassQuery)}`,
        });

        if (overpassResponse.status === 429) {
          console.log('Rate limited by Overpass API, retrying...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          retryCount++;
          continue;
        }

        if (!overpassResponse.ok) {
          throw new Error(`Overpass API error: ${overpassResponse.status}`);
        }

        overpassData = await overpassResponse.json();
        console.log(`Found ${overpassData.elements.length} OSM elements`);
      } catch (error) {
        console.error('Overpass API call failed:', error);
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          retryCount++;
        } else {
          throw error;
        }
      }
    }

    if (!overpassData || overpassData.elements.length === 0) {
      console.log('No restaurants found in OSM data');
      return new Response(
        JSON.stringify({ restaurants: [], message: 'No restaurants found nearby' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process OSM elements
    const upsertedRestaurants = [];

    for (const element of overpassData.elements) {
      const name = element.tags?.name;
      const brand = element.tags?.brand;

      if (!name && !brand) continue;

      const brandInfo = mapToBrandKey(name || '', brand);
      if (!brandInfo) continue;

      // Ensure brand exists
      const { data: existingBrand, error: brandError } = await supabase
        .from('brands')
        .select('id')
        .eq('chain_key', brandInfo.chain_key)
        .single();

      let brandId: string;

      if (brandError || !existingBrand) {
        console.log(`Inserting brand: ${brandInfo.chain_key}`);
        const { data: newBrand, error: insertError } = await supabase
          .from('brands')
          .insert({
            chain_key: brandInfo.chain_key,
            display_name: brandInfo.display_name,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Failed to insert brand:', insertError);
          continue;
        }

        brandId = newBrand!.id;
      } else {
        brandId = existingBrand.id;
      }

      // Get coordinates
      const elementLat = element.lat ?? element.center?.lat;
      const elementLng = element.lon ?? element.center?.lon;

      if (!elementLat || !elementLng) continue;

      // Create stable place_id from OSM
      const placeId = `osm:${element.type}:${element.id}`;

      // Upsert restaurant
      const restaurantData = {
        place_id: placeId,
        brand_id: brandId,
        name: name || brandInfo.display_name,
        lat: elementLat,
        lng: elementLng,
        address: element.tags?.['addr:street'] || null,
        city: element.tags?.['addr:city'] || null,
        state: element.tags?.['addr:state'] || null,
        postal_code: element.tags?.['addr:postcode'] || null,
      };

      const { data: restaurant, error: upsertError } = await supabase
        .from('restaurants')
        .upsert(restaurantData, { onConflict: 'place_id' })
        .select()
        .single();

      if (upsertError) {
        console.error('Failed to upsert restaurant:', upsertError);
        continue;
      }

      console.log(`Upserted restaurant: ${restaurant.name} (${placeId})`);
      upsertedRestaurants.push(restaurant);
    }

    return new Response(
      JSON.stringify({ 
        restaurants: upsertedRestaurants,
        count: upsertedRestaurants.length,
        message: `Successfully upserted ${upsertedRestaurants.length} restaurants`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in nearby function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
