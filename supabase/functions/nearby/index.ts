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
  // Burgers & Fast Food
  'mcdonalds': { chain_key: 'mcdonalds', display_name: "McDonald's", synonyms: ['mcdonald', 'mcdonalds', 'mc donald', 'mc donalds'] },
  'burgerking': { chain_key: 'burgerking', display_name: 'Burger King', synonyms: ['burgerking', 'burger king'] },
  'wendys': { chain_key: 'wendys', display_name: "Wendy's", synonyms: ['wendys', 'wendy'] },
  'fiveguys': { chain_key: 'fiveguys', display_name: 'Five Guys', synonyms: ['fiveguys', 'five guys', '5 guys'] },
  'shakeshack': { chain_key: 'shakeshack', display_name: 'Shake Shack', synonyms: ['shakeshack', 'shake shack'] },
  'innout': { chain_key: 'innout', display_name: 'In-N-Out Burger', synonyms: ['innout', 'in n out', 'in out'] },
  'whataburger': { chain_key: 'whataburger', display_name: 'Whataburger', synonyms: ['whataburger', 'what a burger'] },
  'culvers': { chain_key: 'culvers', display_name: "Culver's", synonyms: ['culvers', 'culver'] },
  'jackinthebox': { chain_key: 'jackinthebox', display_name: 'Jack in the Box', synonyms: ['jackinthebox', 'jack in the box'] },
  'carls': { chain_key: 'carls', display_name: "Carl's Jr.", synonyms: ['carls', 'carlsjr', 'carls jr', 'carl jr'] },
  'hardees': { chain_key: 'hardees', display_name: "Hardee's", synonyms: ['hardees', 'hardee'] },
  'sonic': { chain_key: 'sonic', display_name: 'Sonic Drive-In', synonyms: ['sonic'] },
  'arbys': { chain_key: 'arbys', display_name: "Arby's", synonyms: ['arbys', 'arby'] },
  'whitcastle': { chain_key: 'whitcastle', display_name: 'White Castle', synonyms: ['whitcastle', 'white castle'] },

  // Chicken
  'chickfila': { chain_key: 'chickfila', display_name: 'Chick-fil-A', synonyms: ['chickfila', 'chick fil a', 'chickfil'] },
  'kfc': { chain_key: 'kfc', display_name: 'KFC', synonyms: ['kfc', 'kentucky fried chicken'] },
  'popeyes': { chain_key: 'popeyes', display_name: "Popeyes", synonyms: ['popeyes', 'popeye'] },
  'wingstop': { chain_key: 'wingstop', display_name: 'Wingstop', synonyms: ['wingstop', 'wing stop'] },
  'raisingcanes': { chain_key: 'raisingcanes', display_name: "Raising Cane's", synonyms: ['raisingcanes', 'raising canes', 'canes'] },
  'zaxbys': { chain_key: 'zaxbys', display_name: "Zaxby's", synonyms: ['zaxbys', 'zaxby'] },
  'bojangles': { chain_key: 'bojangles', display_name: "Bojangles", synonyms: ['bojangles'] },
  'churchs': { chain_key: 'churchs', display_name: "Church's Chicken", synonyms: ['churchs', 'church chicken'] },

  // Mexican
  'chipotle': { chain_key: 'chipotle', display_name: 'Chipotle Mexican Grill', synonyms: ['chipotle'] },
  'tacobell': { chain_key: 'tacobell', display_name: 'Taco Bell', synonyms: ['tacobell', 'taco bell'] },
  'qdoba': { chain_key: 'qdoba', display_name: 'Qdoba Mexican Eats', synonyms: ['qdoba'] },
  'moes': { chain_key: 'moes', display_name: "Moe's Southwest Grill", synonyms: ['moes', 'moe'] },
  'deltaco': { chain_key: 'deltaco', display_name: 'Del Taco', synonyms: ['deltaco', 'del taco'] },
  'bajafresh': { chain_key: 'bajafresh', display_name: 'Baja Fresh', synonyms: ['bajafresh', 'baja fresh'] },
  'elpollo': { chain_key: 'elpollo', display_name: 'El Pollo Loco', synonyms: ['elpollo', 'el pollo loco'] },

  // Sandwiches
  'subway': { chain_key: 'subway', display_name: 'Subway', synonyms: ['subway'] },
  'jimmyjohns': { chain_key: 'jimmyjohns', display_name: "Jimmy John's", synonyms: ['jimmyjohns', 'jimmy johns', 'jimmy john'] },
  'jerseymikes': { chain_key: 'jerseymikes', display_name: "Jersey Mike's Subs", synonyms: ['jerseymikes', 'jersey mikes', 'jersey mike'] },
  'firehouse': { chain_key: 'firehouse', display_name: 'Firehouse Subs', synonyms: ['firehouse', 'firehouse subs'] },
  'potbelly': { chain_key: 'potbelly', display_name: 'Potbelly Sandwich Shop', synonyms: ['potbelly'] },
  'quiznos': { chain_key: 'quiznos', display_name: 'Quiznos', synonyms: ['quiznos'] },
  'portillos': { chain_key: 'portillos', display_name: "Portillo's", synonyms: ['portillos', 'portillo'] },

  // Pizza
  'dominos': { chain_key: 'dominos', display_name: "Domino's Pizza", synonyms: ['dominos', 'domino'] },
  'pizzahut': { chain_key: 'pizzahut', display_name: 'Pizza Hut', synonyms: ['pizzahut', 'pizza hut'] },
  'papajohns': { chain_key: 'papajohns', display_name: "Papa John's", synonyms: ['papajohns', 'papa johns', 'papa john'] },
  'littlecaesars': { chain_key: 'littlecaesars', display_name: 'Little Caesars', synonyms: ['littlecaesars', 'little caesars'] },
  'blazepizza': { chain_key: 'blazepizza', display_name: 'Blaze Pizza', synonyms: ['blazepizza', 'blaze pizza'] },
  'modpizza': { chain_key: 'modpizza', display_name: 'MOD Pizza', synonyms: ['modpizza', 'mod pizza'] },
  'cicis': { chain_key: 'cicis', display_name: "Cici's Pizza", synonyms: ['cicis', 'cici'] },

  // Fast Casual
  'panerabread': { chain_key: 'panerabread', display_name: 'Panera Bread', synonyms: ['panerabread', 'panera bread', 'panera'] },
  'pandaexpress': { chain_key: 'pandaexpress', display_name: 'Panda Express', synonyms: ['pandaexpress', 'panda express', 'panda'] },
  'caferiodejaneiro': { chain_key: 'caferiodejaneiro', display_name: 'Cafe Rio', synonyms: ['caferiodejaneiro', 'cafe rio'] },
  'noodles': { chain_key: 'noodles', display_name: 'Noodles & Company', synonyms: ['noodles', 'noodles company'] },
  'jasonsdeli': { chain_key: 'jasonsdeli', display_name: "Jason's Deli", synonyms: ['jasonsdeli', 'jasons deli', 'jason deli'] },
  'waba': { chain_key: 'waba', display_name: 'Waba Grill', synonyms: ['waba', 'waba grill'] },

  // Coffee & Breakfast
  'starbucks': { chain_key: 'starbucks', display_name: 'Starbucks', synonyms: ['starbucks'] },
  'dunkin': { chain_key: 'dunkin', display_name: 'Dunkin', synonyms: ['dunkin', 'dunkin donuts'] },
  'dutchbros': { chain_key: 'dutchbros', display_name: 'Dutch Bros Coffee', synonyms: ['dutchbros', 'dutch bros'] },
  'timhortons': { chain_key: 'timhortons', display_name: 'Tim Hortons', synonyms: ['timhortons', 'tim hortons'] },
  'cariboucoffee': { chain_key: 'cariboucoffee', display_name: 'Caribou Coffee', synonyms: ['cariboucoffee', 'caribou coffee'] },
  'ihop': { chain_key: 'ihop', display_name: 'IHOP', synonyms: ['ihop'] },
  'dennys': { chain_key: 'dennys', display_name: "Denny's", synonyms: ['dennys', 'denny'] },
  'wafflehouse': { chain_key: 'wafflehouse', display_name: 'Waffle House', synonyms: ['wafflehouse', 'waffle house'] },
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
      
      // Add all synonyms to patterns
      brandPatterns.push(...brand.synonyms);
    }

    const brandRegex = brandPatterns.length > 0 
      ? brandPatterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
      : 'McDonald|Chipotle|Wingstop|Subway|KFC|Taco Bell|Burger King|Wendy|Chick[- ]?fil[- ]?A|Panda|Five Guys|Panera|Jack in the Box|Popeyes|Domino';

    // Build Overpass QL query - trying brand-specific first
    const radiusMeters = radiusKm * 1000;
    const brandedQuery = `
[out:json][timeout:30];
(
  node["amenity"~"^(fast_food|restaurant)$"]["brand"~"(${brandRegex})",i](around:${radiusMeters},${lat},${lng});
  node["amenity"~"^(fast_food|restaurant)$"]["name"~"(${brandRegex})",i](around:${radiusMeters},${lat},${lng});
  way["amenity"~"^(fast_food|restaurant)$"]["brand"~"(${brandRegex})",i](around:${radiusMeters},${lat},${lng});
  way["amenity"~"^(fast_food|restaurant)$"]["name"~"(${brandRegex})",i](around:${radiusMeters},${lat},${lng});
);
out center tags;
    `.trim();

    // Fallback: generic fast food search if branded fails
    const genericQuery = `
[out:json][timeout:30];
(
  node["amenity"="fast_food"]["cuisine"~"burger|chicken|pizza|sandwich|mexican"](around:${radiusMeters},${lat},${lng});
  way["amenity"="fast_food"]["cuisine"~"burger|chicken|pizza|sandwich|mexican"](around:${radiusMeters},${lat},${lng});
  node["amenity"="fast_food"]["brand"](around:${radiusMeters},${lat},${lng});
  way["amenity"="fast_food"]["brand"](around:${radiusMeters},${lat},${lng});
);
out center tags;
    `.trim();

    // Helper function to call Overpass
    const callOverpass = async (query: string, queryType: string): Promise<OverpassResponse | null> => {
      let retryCount = 0;
      const maxRetries = 3;
      const overpassServers = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.openstreetmap.ru/api/interpreter'
      ];

      for (const server of overpassServers) {
        retryCount = 0;
        while (retryCount <= maxRetries) {
          try {
            console.log(`Calling Overpass (${queryType}, server ${server.split('/')[2]}, attempt ${retryCount + 1})`);
            const overpassResponse = await fetch(server, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'User-Agent': 'MacroFinder/1.0'
              },
              body: `data=${encodeURIComponent(query)}`,
            });

            if (overpassResponse.status === 429 || overpassResponse.status === 504) {
              const jitter = Math.random() * 1000;
              const backoffMs = Math.pow(2, retryCount) * 1000 + jitter;
              console.log(`Rate limited (${overpassResponse.status}), waiting ${Math.round(backoffMs)}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoffMs));
              retryCount++;
              continue;
            }

            if (!overpassResponse.ok) {
              throw new Error(`Overpass API error: ${overpassResponse.status}`);
            }

            const data: OverpassResponse = await overpassResponse.json();
            console.log(`${queryType} query found ${data.elements.length} OSM elements from ${server.split('/')[2]}`);
            
            if (data.elements.length > 0) {
              return data;
            }
            
            // If no results, try next server
            break;
          } catch (error) {
            console.error(`Overpass call failed (${queryType}, ${server.split('/')[2]}):`, error.message);
            if (retryCount < maxRetries) {
              const jitter = Math.random() * 1000;
              const backoffMs = Math.pow(2, retryCount) * 1000 + jitter;
              await new Promise(resolve => setTimeout(resolve, backoffMs));
              retryCount++;
            } else {
              // Try next server
              break;
            }
          }
        }
      }
      
      return null;
    };

    // Try branded query first
    let overpassData = await callOverpass(brandedQuery, 'branded');
    
    // If no results, try generic fast food query as fallback
    if (!overpassData || overpassData.elements.length === 0) {
      console.log('Branded search returned 0 results, trying generic fast food search...');
      overpassData = await callOverpass(genericQuery, 'generic');
    }

    if (!overpassData || overpassData.elements.length === 0) {
      console.log('No restaurants found in OSM data after all attempts');
      return new Response(
        JSON.stringify({ 
          restaurants: [], 
          count: 0,
          message: 'No chain restaurants found nearby. This area may not have OSM data coverage.' 
        }),
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
