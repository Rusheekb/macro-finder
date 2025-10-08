import { supabase } from "@/integrations/supabase/client";

export interface RankRequest {
  mode: "bulking" | "cutting";
  targetProtein?: number | null;
  targetCalories?: number | null;
  wP: number;
  wC: number;
  wR: number;
  radiusKm?: number;
  priceCap?: number | null;
  minProtein?: number | null;
  includeBrands?: string[];
  excludeBrands?: string[];
  lat?: number;
  lng?: number;
  limit?: number;
  debug?: boolean;
}

export interface RankResult {
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
  priceUpdatedAt?: string;
}

export const rankItems = async (request: RankRequest): Promise<RankResult[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('rank', {
      body: { ...request, debug: false },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    return data as RankResult[];
  } catch (error) {
    console.error('Failed to rank items:', error);
    throw error;
  }
};