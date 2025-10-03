import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SetPriceRequest {
  restaurantId: string;
  itemId: string;
  price: number;
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

    const body: SetPriceRequest = await req.json();
    const { restaurantId, itemId, price } = body;

    // Validation
    if (!restaurantId || !itemId) {
      return new Response(
        JSON.stringify({ error: 'restaurantId and itemId are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (typeof price !== 'number' || price <= 0 || price > 1000) {
      return new Response(
        JSON.stringify({ error: 'price must be a positive number between 0 and 1000' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Setting price for restaurant ${restaurantId}, item ${itemId}: $${price}`);

    // Upsert local_prices
    const { data, error } = await supabase
      .from('local_prices')
      .upsert(
        {
          restaurant_id: restaurantId,
          item_id: itemId,
          price: price,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'restaurant_id,item_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Price updated successfully:', data);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in set_price function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
