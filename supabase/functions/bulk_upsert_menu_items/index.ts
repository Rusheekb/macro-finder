import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MenuItem {
  brand_id: string;
  item_name: string;
  calories: number;
  protein_g: number;
  default_price?: number;
  notes?: string;
}

interface BulkUpsertRequest {
  items: MenuItem[];
}

interface UpsertResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ item_name: string; reason: string }>;
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

    const body: BulkUpsertRequest = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "items array is required and must not be empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${items.length} menu items for bulk upsert`);

    const result: UpsertResult = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Process items in chunks of 100 to avoid overwhelming the database
    const chunkSize = 100;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      
      for (const item of chunk) {
        try {
          // Validate required fields
          if (!item.brand_id || !item.item_name || item.calories === undefined || item.protein_g === undefined) {
            result.errors.push({
              item_name: item.item_name || "unknown",
              reason: "Missing required fields (brand_id, item_name, calories, or protein_g)",
            });
            result.skipped++;
            continue;
          }

          // Check if item exists
          const { data: existingItem, error: selectError } = await supabase
            .from("menu_items")
            .select("id, default_price")
            .eq("brand_id", item.brand_id)
            .eq("item_name", item.item_name)
            .maybeSingle();

          if (selectError) {
            result.errors.push({
              item_name: item.item_name,
              reason: `Database error: ${selectError.message}`,
            });
            result.skipped++;
            continue;
          }

          if (existingItem) {
            // Update existing item, preserve default_price if not provided in CSV
            const updateData: any = {
              calories: item.calories,
              protein_g: item.protein_g,
              data_source: 'manual',
              verification_status: 'verified',
              last_verified_at: new Date().toISOString(),
            };

            // Only update price if provided in the import
            if (item.default_price !== undefined && item.default_price !== null) {
              updateData.default_price = item.default_price;
            }

            if (item.notes) {
              updateData.notes = item.notes;
            }

            const { error: updateError } = await supabase
              .from("menu_items")
              .update(updateData)
              .eq("id", existingItem.id);

            if (updateError) {
              result.errors.push({
                item_name: item.item_name,
                reason: `Update failed: ${updateError.message}`,
              });
              result.skipped++;
            } else {
              result.updated++;
            }
          } else {
            // Insert new item
            const insertData = {
              brand_id: item.brand_id,
              item_name: item.item_name,
              calories: item.calories,
              protein_g: item.protein_g,
              default_price: item.default_price || null,
              data_source: 'manual',
              verification_status: 'verified',
              last_verified_at: new Date().toISOString(),
              notes: item.notes || null,
            };

            const { error: insertError } = await supabase
              .from("menu_items")
              .insert(insertData);

            if (insertError) {
              result.errors.push({
                item_name: item.item_name,
                reason: `Insert failed: ${insertError.message}`,
              });
              result.skipped++;
            } else {
              result.inserted++;
            }
          }
        } catch (error) {
          result.errors.push({
            item_name: item.item_name || "unknown",
            reason: `Unexpected error: ${error.message}`,
          });
          result.skipped++;
        }
      }
    }

    console.log(
      `Bulk upsert complete: ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped`,
    );

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in bulk_upsert_menu_items function:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
