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

// Normalize text for matching
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const BRAND_MAP: Record<string, { chain_key: string; display_name: string; synonyms: string[] }> = {
  'mcdonalds': { chain_key: 'mcdonalds', display_name: "McDonald's", synonyms: ['mcdonald', 'mcdonalds', 'mc donald', 'mc donalds'] },
  'chipotle': { chain_key: 'chipotle', display_name: 'Chipotle Mexican Grill', synonyms: ['chipotle'] },
  'wingstop': { chain_key: 'wingstop', display_name: 'Wingstop', synonyms: ['wingstop', 'wing stop'] },
  'subway': { chain_key: 'subway', display_name: 'Subway', synonyms: ['subway'] },
  'kfc': { chain_key: 'kfc', display_name: 'KFC', synonyms: ['kfc', 'kentucky fried chicken'] },
  'tacobell': { chain_key: 'tacobell', display_name: 'Taco Bell', synonyms: ['tacobell', 'taco bell'] },
  'burgerking': { chain_key: 'burgerking', display_name: 'Burger King', synonyms: ['burgerking', 'burger king'] },
  'wendys': { chain_key: 'wendys', display_name: "Wendy's", synonyms: ['wendys', 'wendy'] },
  'chickfila': { chain_key: 'chickfila', display_name: 'Chick-fil-A', synonyms: ['chickfila', 'chick fil a', 'chickfil'] },
  'pandaexpress': { chain_key: 'pandaexpress', display_name: 'Panda Express', synonyms: ['pandaexpress', 'panda express', 'panda'] },
  'fiveguys': { chain_key: 'fiveguys', display_name: 'Five Guys', synonyms: ['fiveguys', 'five guys', '5 guys'] },
  'panerabread': { chain_key: 'panerabread', display_name: 'Panera Bread', synonyms: ['panerabread', 'panera bread', 'panera'] },
  'jackinthebox': { chain_key: 'jackinthebox', display_name: 'Jack in the Box', synonyms: ['jackinthebox', 'jack in the box'] },
  'popeyes': { chain_key: 'popeyes', display_name: "Popeyes", synonyms: ['popeyes', 'popeye'] },
  'dominos': { chain_key: 'dominos', display_name: "Domino's Pizza", synonyms: ['dominos', 'domino'] },
};

function mapToBrandKey(name: string, brand?: string): { chain_key: string; display_name: string } | null {
  const searchText = normalize(`${name || ''} ${brand || ''}`);
  
  for (const [key, value] of Object.entries(BRAND_MAP)) {
    // Check normalized key
    if (searchText.includes(normalize(key))) {
      return { chain_key: value.chain_key, display_name: value.display_name };
    }
    // Check synonyms
    for (const synonym of value.synonyms) {
      if (searchText.includes(normalize(synonym))) {
        return { chain_key: value.chain_key, display_name: value.display_name };
      }
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
    const { lat, lng, radiusKm = 8, chainKeys = ['mcdonalds', 'chipotle', 'wingstop'] } = body;

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'lat and lng are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for restaurants near ${lat}, ${lng} within ${radiusKm}km`, chainKeys);

    // Build robust brand regex dynamically from chainKeys
    const brandPatterns: string[] = [];
    for (const key of chainKeys) {
      const brand = BRAND_MAP[key.toLowerCase()];
      if (!brand) continue;
      
      // Build pattern from display name and synonyms
      const patterns = [brand.display_name];
      if (brand.chain_key === 'mcdonalds') {
        patterns.push('McDonald', 'McDonalds', "McDonald's", 'Mc Donald');
      } else if (brand.chain_key === 'chickfila') {
        patterns.push('Chick[- ]?fil[- ]?A');
      } else if (brand.chain_key === 'tacobell') {
        patterns.push('Taco[ ]?Bell');
      } else if (brand.chain_key === 'burgerking') {
        patterns.push('Burger[ ]?King');
      } else if (brand.chain_key === 'fiveguys') {
        patterns.push('Five[ ]?Guys', '5[ ]?Guys');
      }
      
      brandPatterns.push(...patterns);
    }

    const brandRegex = brandPatterns.length > 0 
      ? brandPatterns.join('|') 
      : 'McDonald|Chipotle|Wingstop|Subway|KFC|Taco Bell|Burger King|Wendy|Chick[- ]?fil[- ]?A|Panda|Five Guys|Panera|Jack in the Box|Popeyes|Domino';

    // Build Overpass QL query
    const radiusMeters = radiusKm * 1000;
    const overpassQuery = `
[out:json][timeout:25];
(
  node["amenity"~"^(fast_food|restaurant)$"]["brand"~"(${brandRegex})",i](around:${radiusMeters},${lat},${lng});
  node["amenity"~"^(fast_food|restaurant)$"]["name"~"(${brandRegex})",i](around:${radiusMeters},${lat},${lng});
  way["amenity"~"^(fast_food|restaurant)$"]["brand"~"(${brandRegex})",i](around:${radiusMeters},${lat},${lng});
  way["amenity"~"^(fast_food|restaurant)$"]["name"~"(${brandRegex})",i](around:${radiusMeters},${lat},${lng});
);
out center tags;
    `.trim();

    // Call Overpass API with improved retry logic
    let overpassData: OverpassResponse | null = null;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries && !overpassData) {
      try {
        console.log(`Calling Overpass API (attempt ${retryCount + 1})`);
        const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'MacroFinder/1.0 (https://github.com/macrofinder; contact@macrofinder.com)'
          },
          body: `data=${encodeURIComponent(overpassQuery)}`,
        });

        if (overpassResponse.status === 429 || overpassResponse.status === 504) {
          const jitter = Math.random() * 500;
          const backoffMs = Math.pow(1.5, retryCount) * 1000 + jitter;
          console.log(`Rate limited (${overpassResponse.status}), waiting ${Math.round(backoffMs)}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
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
          const jitter = Math.random() * 500;
          const backoffMs = Math.pow(1.5, retryCount) * 1000 + jitter;
          await new Promise(resolve => setTimeout(resolve, backoffMs));
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
