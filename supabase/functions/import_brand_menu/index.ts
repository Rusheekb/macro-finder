import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRequest {
  chainKey: string;
}

interface NutritionixBrandMapping {
  [key: string]: string;
}

// Map chain_key to Nutritionix brand_id
// Note: Add more brand IDs as they're discovered from Nutritionix API
const NUTRITIONIX_BRAND_MAP: NutritionixBrandMapping = {
  // Major chains with known Nutritionix IDs
  mcdonalds: "513fbc1283aa2dc80c000053",
  chipotle: "513fbc1283aa2dc80c00001b",
  wingstop: "52fe814da0ad47e13000000c",
  tacobell: "513fbc1283aa2dc80c00003e",
  subway: "513fbc1283aa2dc80c00003c",
  kfc: "513fbc1283aa2dc80c000026",
  pizzahut: "513fbc1283aa2dc80c000033",
  starbucks: "513fbc1283aa2dc80c00003b",
  wendys: "513fbc1283aa2dc80c000046",
  burgerking: "513fbc1283aa2dc80c000011",
  dunkin: "513fbc1283aa2dc80c00001e",
  arbys: "513fbc1283aa2dc80c00000a",
  chickfila: "513fbc1283aa2dc80c00001c",
  panerabread: "513fbc1283aa2dc80c000031",
  pandaexpress: "513fbc1283aa2dc80c000030",
  dominos: "513fbc1283aa2dc80c00001d",
  papajohns: "513fbc1283aa2dc80c000032",
  jimmyjohns: "513fbc1283aa2dc80c000025",
  popeyes: "513fbc1283aa2dc80c000035",
  fiveguys: "513fbc1283aa2dc80c000020",
  sonic: "513fbc1283aa2dc80c00003a",
  jackinthebox: "513fbc1283aa2dc80c000024",
  whataburger: "513fbc1283aa2dc80c000045",
  innout: "513fbc1283aa2dc80c000023",
  qdoba: "513fbc1283aa2dc80c000036",
  deltaco: "55df87f9cc4bf65128004d7e",
  elpollo: "55df881bcc4bf65128004d80",
  jerseymikes: "55df891acc4bf65128004d82",
  firehouse: "55df8937cc4bf65128004d84",
  waba: "55e0acbecc4bf6512801b270",
  raisingcanes: "55e0ae39cc4bf6512801b274",
  zaxbys: "55e0aec1cc4bf6512801b276",
  culvers: "55e0af35cc4bf6512801b278",
  shakeshack: "55e0af62cc4bf6512801b27a",
  bojangles: "55e0af89cc4bf6512801b27c",
  moes: "55e0afafcc4bf6512801b27e",
  littlecaesars: "55e0afcdcc4bf6512801b280",
  
  // Additional chains - will use brand name search fallback if no ID
  // The import function will search by display_name if brand_id not found
};

interface NutritionixItem {
  food_name: string;
  nf_calories: number;
  nf_protein: number;
  tag_id?: string;
}

interface USDAFoodItem {
  fdcId: number;
  description: string;
  brandOwner?: string;
  labelNutrients?: {
    protein?: { value: number };
    calories?: { value: number };
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ImportRequest = await req.json();
    const { chainKey } = body;

    if (!chainKey) {
      return new Response(JSON.stringify({ error: "chainKey is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Importing menu for chain: ${chainKey}`);

    // Get brand from database
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id, display_name, last_imported_at")
      .eq("chain_key", chainKey)
      .maybeSingle();

    if (brandError || !brand) {
      return new Response(JSON.stringify({ error: `Brand not found: ${chainKey}` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let items: Array<{ item_name: string; calories: number; protein_g: number; external_ref: string }> = [];
    let source: "nutritionix" | "usda" = "nutritionix";

    // Try Nutritionix first
    const nutritionixAppId = Deno.env.get("NUTRITIONIX_APP_ID_CORRECT");
    const nutritionixApiKey = Deno.env.get("NUTRITIONIX_API_KEY");
    const nutritionixBrandId = NUTRITIONIX_BRAND_MAP[chainKey];

    if (nutritionixAppId && nutritionixApiKey && nutritionixBrandId) {
      try {
        console.log(`Fetching from Nutritionix for brand ${nutritionixBrandId}`);

        const nutritionixResponse = await fetch(
          `https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(brand.display_name)}`,
          {
            headers: {
              "x-app-id": nutritionixAppId,
              "x-app-key": nutritionixApiKey,
            },
          },
        );

        if (nutritionixResponse.ok) {
          const data = await nutritionixResponse.json();
          const brandedItems = data.branded || [];

          console.log(`Nutritionix returned ${brandedItems.length} items`);

          items = brandedItems
            .filter((item: NutritionixItem) => item.tag_id === nutritionixBrandId)
            .map((item: NutritionixItem) => ({
              item_name: item.food_name,
              calories: Math.round(item.nf_calories || 0),
              protein_g: Math.round(item.nf_protein || 0),
              external_ref: `nutritionix:${nutritionixBrandId}:${item.food_name}`,
            }));
        } else if (nutritionixResponse.status === 429) {
          console.log("Nutritionix rate limited, falling back to USDA");
        } else {
          console.log(`Nutritionix error: ${nutritionixResponse.status}`);
        }
      } catch (error) {
        console.error("Nutritionix fetch failed:", error);
      }
    }

    // Fallback to USDA FoodData Central
    if (items.length === 0) {
      const usdaApiKey = Deno.env.get("USDA_FDC_API_KEY");

      if (!usdaApiKey) {
        return new Response(JSON.stringify({ error: "No API keys configured" }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        console.log(`Fetching from USDA for brand ${brand.display_name}`);
        source = "usda";

        const usdaResponse = await fetch(
          `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(brand.display_name)}&dataType=Branded&pageSize=50&api_key=${usdaApiKey}`,
        );

        if (usdaResponse.ok) {
          const data = await usdaResponse.json();
          const foods = data.foods || [];

          console.log(`USDA returned ${foods.length} items`);

          items = foods
            .filter(
              (food: USDAFoodItem) =>
                food.brandOwner?.toLowerCase().includes(chainKey.replace("_", " ")) ||
                food.description?.toLowerCase().includes(chainKey.replace("_", " ")),
            )
            .map((food: USDAFoodItem) => ({
              item_name: food.description,
              calories: Math.round(food.labelNutrients?.calories?.value || 0),
              protein_g: Math.round(food.labelNutrients?.protein?.value || 0),
              external_ref: `usda:${food.fdcId}`,
            }))
            .filter((item) => item.calories > 0); // Filter out items with no calorie data
        } else {
          throw new Error(`USDA API error: ${usdaResponse.status}`);
        }
      } catch (error) {
        console.error("USDA fetch failed:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch menu items from both sources" }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (items.length === 0) {
      return new Response(
        JSON.stringify({
          inserted: 0,
          updated: 0,
          source,
          message: "No menu items found",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Upsert menu items
    let inserted = 0;
    let updated = 0;

    for (const item of items) {
      // Check if item exists
      const { data: existingItem } = await supabase
        .from("menu_items")
        .select("id, default_price")
        .eq("brand_id", brand.id)
        .eq("item_name", item.item_name)
        .maybeSingle();

      const itemData = {
        brand_id: brand.id,
        item_name: item.item_name,
        calories: item.calories,
        protein_g: item.protein_g,
        external_ref: item.external_ref,
        // Only set default_price if it doesn't exist
        ...(existingItem?.default_price ? {} : { default_price: null }),
      };

      if (existingItem) {
        // Update existing item, but preserve default_price if set
        const { error: updateError } = await supabase
          .from("menu_items")
          .update({
            calories: itemData.calories,
            protein_g: itemData.protein_g,
            external_ref: itemData.external_ref,
          })
          .eq("id", existingItem.id);

        if (!updateError) {
          updated++;
        } else {
          console.error("Failed to update item:", updateError);
        }
      } else {
        // Insert new item
        const { error: insertError } = await supabase.from("menu_items").insert(itemData);

        if (!insertError) {
          inserted++;
        } else {
          console.error("Failed to insert item:", insertError);
        }
      }
    }

    // Update last_imported_at
    await supabase.from("brands").update({ last_imported_at: new Date().toISOString() }).eq("id", brand.id);

    console.log(`Import complete: ${inserted} inserted, ${updated} updated from ${source}`);

    return new Response(
      JSON.stringify({
        inserted,
        updated,
        source,
        total: items.length,
        brand: brand.display_name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in import_brand_menu function:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
