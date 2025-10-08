import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRequest {
  chainKey: string;
}

interface NutritionixItem {
  item_name: string;
  nf_calories: number;
  nf_protein: number;
  item_id?: string;
}

interface ImportResult {
  inserted: number;
  updated: number;
}

// Map chain keys to Nutritionix brand IDs
const CHAIN_TO_BRAND_MAP: Record<string, string[]> = {
  mcdonalds: ["513fbc1283aa2dc80c000053"],
  chipotle: ["513fbc1283aa2dc80c00001f"],
  wingstop: ["513fbc1283aa2dc80c000194"],
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const nutritionixAppId = Deno.env.get("NUTRITIONIX_APP_ID_CORRECT")!;
    const nutritionixApiKey = Deno.env.get("NUTRITIONIX_API_KEY")!;

    if (!nutritionixAppId || !nutritionixApiKey) {
      return new Response(JSON.stringify({ error: "Nutritionix credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: ImportRequest = await req.json();
    const { chainKey } = body;

    if (!chainKey) {
      return new Response(JSON.stringify({ error: "chainKey is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Importing nutrition data for chain: ${chainKey}`);

    // Map chain key to Nutritionix brand IDs
    const brandIds = CHAIN_TO_BRAND_MAP[chainKey];
    if (!brandIds || brandIds.length === 0) {
      return new Response(JSON.stringify({ error: `No Nutritionix mapping found for chain: ${chainKey}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get brand_id from database
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id")
      .eq("chain_key", chainKey)
      .single();

    if (brandError || !brand) {
      return new Response(JSON.stringify({ error: `Brand not found: ${chainKey}` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brandDbId = brand.id;
    let totalInserted = 0;
    let totalUpdated = 0;

    // Fetch items from Nutritionix for each brand ID
    for (const nutritionixBrandId of brandIds) {
      console.log(`Fetching items for Nutritionix brand ID: ${nutritionixBrandId}`);

      try {
        const nutritionixResponse = await fetch(
          `https://trackapi.nutritionix.com/v2/search/instant?branded=true&common=false&query=${chainKey}`,
          {
            headers: {
              "x-app-id": nutritionixAppId,
              "x-app-key": nutritionixApiKey,
              "Content-Type": "application/json",
            },
          },
        );

        if (!nutritionixResponse.ok) {
          console.error(`Nutritionix API error: ${nutritionixResponse.status}`);
          continue;
        }

        const nutritionixData = await nutritionixResponse.json();
        const items: NutritionixItem[] = nutritionixData.branded || [];

        console.log(`Found ${items.length} items from Nutritionix`);

        // Filter items for this specific brand
        const brandItems = items.filter(
          (item: any) =>
            item.brand_name_item_name?.toLowerCase().includes(chainKey) || item.nix_brand_id === nutritionixBrandId,
        );

        console.log(`Processing ${brandItems.length} items for brand ${chainKey}`);

        // Upsert each item
        for (const item of brandItems) {
          if (!item.item_name || item.nf_calories === undefined || item.nf_protein === undefined) {
            console.log(`Skipping item with missing data: ${item.item_name}`);
            continue;
          }

          const menuItemData = {
            brand_id: brandDbId,
            item_name: item.item_name.trim(),
            calories: Math.round(item.nf_calories),
            protein_g: Math.round(item.nf_protein),
            external_ref: item.item_id || null,
          };

          // Check if item exists
          const { data: existing } = await supabase
            .from("menu_items")
            .select("id")
            .eq("brand_id", brandDbId)
            .eq("item_name", menuItemData.item_name)
            .single();

          if (existing) {
            // Update existing item
            const { error: updateError } = await supabase
              .from("menu_items")
              .update({
                calories: menuItemData.calories,
                protein_g: menuItemData.protein_g,
                external_ref: menuItemData.external_ref,
              })
              .eq("id", existing.id);

            if (updateError) {
              console.error(`Failed to update item ${menuItemData.item_name}:`, updateError);
            } else {
              totalUpdated++;
            }
          } else {
            // Insert new item
            const { error: insertError } = await supabase.from("menu_items").insert(menuItemData);

            if (insertError) {
              console.error(`Failed to insert item ${menuItemData.item_name}:`, insertError);
            } else {
              totalInserted++;
            }
          }
        }
      } catch (error) {
        console.error(`Error processing brand ${nutritionixBrandId}:`, error);
      }
    }

    const result: ImportResult = {
      inserted: totalInserted,
      updated: totalUpdated,
    };

    console.log(`Import complete: ${totalInserted} inserted, ${totalUpdated} updated`);

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in import_nutritionix function:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
