// API Route: POST /api/rank
// This will be implemented later with actual food/restaurant data integration

export interface RankRequest {
  mode: "bulking" | "cutting";
  targetProtein: number;
  targetCalories: number;
  wP: number; // protein weight
  wC: number; // calorie weight  
  wR: number; // radius weight
  radiusKm: number;
  priceCap: number;
  // Optional: user location for distance calculations
  userLat?: number;
  userLng?: number;
}

export interface RankResponse {
  results: Array<{
    id: string;
    name: string;
    restaurant: string;
    protein: number;
    calories: number;
    price: number;
    distance: number;
    score: number;
    // Additional fields from external APIs
    nutrients?: {
      fat: number;
      carbs: number;
      fiber: number;
    };
    restaurantInfo?: {
      rating: number;
      address: string;
      phone?: string;
    };
  }>;
  meta: {
    searchRadius: number;
    totalResults: number;
    processingTime: number;
  };
}

// Scoring algorithm placeholder
export const calculateScore = (
  food: any,
  targets: RankRequest,
  distance: number
): number => {
  // Protein match score (0-1)
  const proteinDiff = Math.abs(food.protein - targets.targetProtein);
  const proteinScore = Math.max(0, 1 - proteinDiff / targets.targetProtein);
  
  // Calorie match score (0-1)  
  const calorieDiff = Math.abs(food.calories - targets.targetCalories);
  const calorieScore = Math.max(0, 1 - calorieDiff / targets.targetCalories);
  
  // Distance score (0-1, closer is better)
  const distanceScore = Math.max(0, 1 - distance / targets.radiusKm);
  
  // Weighted final score
  return (
    targets.wP * proteinScore +
    targets.wC * calorieScore +
    targets.wR * distanceScore
  );
};

// TODO: Implement actual API handler
export const rankFoods = async (request: RankRequest): Promise<RankResponse> => {
  // This function will:
  // 1. Query Nutritionix API for food data
  // 2. Query Yelp/Google Places for restaurant data
  // 3. Calculate distances using Google Maps API
  // 4. Apply scoring algorithm
  // 5. Return ranked results
  
  throw new Error("API not yet implemented");
};