import { supabase } from "@/integrations/supabase/client";

export interface NearbyRequest {
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface Restaurant {
  id: string;
  name: string;
  brandId: string;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  state?: string;
}

export const findNearbyRestaurants = async (
  request: NearbyRequest
): Promise<Restaurant[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('nearby', {
      body: request,
    });

    if (error) {
      console.error('Failed to find nearby restaurants:', error);
      throw error;
    }

    return data?.restaurants || [];
  } catch (error) {
    console.error('Failed to find nearby restaurants:', error);
    throw error;
  }
};
