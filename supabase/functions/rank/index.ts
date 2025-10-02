import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RankRequest {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  priceCap?: number | null;
  targetProtein?: number | null;
  targetCalories?: number | null;
  wP: number;
  wC: number;
  wR: number;
  mode: 'bulking' | 'cutting';
  limit?: number;
}

interface RestaurantItem {
  restaurant_id: string;
  restaurant_name: string;
  brand_key: string;
  item_id: string;
  item_name: string;
  calories: number;
  protein_g: number;
  price: number;
  lat: number | null;
  lng: number | null;
}

// Haversine distance calculation (km)
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Clamp weights
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

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

    const body: RankRequest = await req.json();
    
    // Validate and set defaults
    const radiusKm = body.radiusKm ?? 8;
    const limit = body.limit ?? 30;
    const wP = clamp(body.wP, 0, 5);
    const wC = clamp(body.wC, 0, 5);
    const wR = clamp(body.wR, 0, 5);
    const mode = body.mode || 'bulking';
    
    console.log('Rank request:', { ...body, wP, wC, wR, radiusKm, limit });

    // Query: join restaurants → brands → menu_items, left join local_prices
    const { data: items, error } = await supabase
      .from('restaurants')
      .select(`
        id,
        name,
        lat,
        lng,
        brand_id,
        brands!inner (
          chain_key
        ),
        menu_items!inner (
          id,
          item_name,
          calories,
          protein_g,
          default_price,
          local_prices (
            price
          )
        )
      `);

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Flatten and process results
    const results: Array<{
      rank: number;
      restaurantId: string;
      restaurantName: string;
      brandKey: string;
      itemId: string;
      itemName: string;
      calories: number;
      protein: number;
      price: number;
      score: number;
      lat: number | null;
      lng: number | null;
      distance?: number;
    }> = [];

    for (const restaurant of items) {
      // Skip if location filtering is enabled but restaurant has no coordinates
      if (body.lat !== undefined && body.lng !== undefined && (!restaurant.lat || !restaurant.lng)) {
        continue;
      }

      // Calculate distance if user location provided
      let distance: number | undefined;
      if (body.lat !== undefined && body.lng !== undefined && restaurant.lat && restaurant.lng) {
        distance = haversineDistance(body.lat, body.lng, restaurant.lat, restaurant.lng);
        if (distance > radiusKm) {
          continue; // Skip restaurants outside radius
        }
      }

      const brand = restaurant.brands as any;
      const menuItems = restaurant.menu_items as any[];

      for (const item of menuItems) {
        // Determine price: local override or default
        const localPrices = item.local_prices as any[];
        const price = localPrices?.[0]?.price ?? item.default_price;

        // Skip if no valid price
        if (!price || price <= 0) {
          continue;
        }

        // Apply price cap filter
        if (body.priceCap !== null && body.priceCap !== undefined && price > body.priceCap) {
          continue;
        }

        // Calculate score components
        const proteinDiff = body.targetProtein !== null && body.targetProtein !== undefined
          ? Math.abs(item.protein_g - body.targetProtein) / Math.max(1, body.targetProtein)
          : 0;

        const calorieDiff = body.targetCalories !== null && body.targetCalories !== undefined
          ? Math.abs(item.calories - body.targetCalories) / Math.max(1, body.targetCalories)
          : 0;

        const cuttingPenalty = mode === 'cutting' ? 0.15 * (item.calories / 1000.0) : 0;

        const score = wP * proteinDiff + wC * calorieDiff + wR * price + cuttingPenalty;

        results.push({
          rank: 0, // Will be set after sorting
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          brandKey: brand.chain_key,
          itemId: item.id,
          itemName: item.item_name,
          calories: item.calories,
          protein: item.protein_g,
          price: Number(price),
          score: Number(score.toFixed(4)),
          lat: restaurant.lat,
          lng: restaurant.lng,
          ...(distance !== undefined && { distance: Number(distance.toFixed(2)) }),
        });
      }
    }

    // Sort by score (ascending - lower is better) and assign ranks
    results.sort((a, b) => a.score - b.score);
    results.forEach((item, index) => {
      item.rank = index + 1;
    });

    // Return top results
    const topResults = results.slice(0, limit);

    console.log(`Returning ${topResults.length} results out of ${results.length} total`);

    return new Response(
      JSON.stringify(topResults),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in rank function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
