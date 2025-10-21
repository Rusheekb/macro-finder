import { supabase } from "@/integrations/supabase/client";

export interface SetPriceRequest {
  restaurantId: string;
  itemId: string;
  price: number;
}

export const setLocalPrice = async (
  request: SetPriceRequest
): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke('set_price', {
      body: request,
    });

    if (error) {
      console.error('Failed to set local price:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to set local price:', error);
    throw error;
  }
};
