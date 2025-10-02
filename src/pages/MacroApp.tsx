import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ControlsPanel from "@/components/ControlsPanel";
import ResultsTable from "@/components/ResultsTable";
import Loader from "@/components/Loader";
import { rankItems, type RankResult } from "@/api/rank";
import { useToast } from "@/hooks/use-toast";

export interface MacroTargets {
  mode: "bulking" | "cutting";
  targetProtein: number;
  targetCalories: number;
  wP: number; // protein weight
  wC: number; // calorie weight
  wR: number; // radius weight
  radiusKm: number;
  priceCap: number;
}

export interface FoodResult {
  id: string;
  name: string;
  restaurant: string;
  protein: number;
  calories: number;
  price: number;
  distance?: number;
  score: number;
}

const MacroApp = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<FoodResult[]>([]);
  const debounceTimer = useRef<NodeJS.Timeout>();
  
  // Initialize state from URL params
  const [targets, setTargets] = useState<MacroTargets>({
    mode: (searchParams.get("mode") as "bulking" | "cutting") || "bulking",
    targetProtein: Number(searchParams.get("targetProtein")) || 30,
    targetCalories: Number(searchParams.get("targetCalories")) || 500,
    wP: Number(searchParams.get("wP")) || 0.5,
    wC: Number(searchParams.get("wC")) || 0.3,
    wR: Number(searchParams.get("wR")) || 0.2,
    radiusKm: Number(searchParams.get("radiusKm")) || 5,
    priceCap: Number(searchParams.get("priceCap")) || 20,
  });

  // Update URL when targets change
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(targets).forEach(([key, value]) => {
      params.set(key, value.toString());
    });
    setSearchParams(params, { replace: true });
  }, [targets, setSearchParams]);

  const performSearch = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const rankResults = await rankItems({
        mode: targets.mode,
        targetProtein: targets.targetProtein,
        targetCalories: targets.targetCalories,
        wP: targets.wP,
        wC: targets.wC,
        wR: targets.wR,
        radiusKm: targets.radiusKm,
        priceCap: targets.priceCap,
      });

      // Map to FoodResult format
      const mappedResults: FoodResult[] = rankResults.map((item) => ({
        id: item.itemId,
        name: item.itemName,
        restaurant: item.restaurantName,
        protein: item.protein,
        calories: item.calories,
        price: item.price,
        distance: item.distance,
        score: item.score,
      }));

      setResults(mappedResults);

      if (mappedResults.length === 0) {
        toast({
          title: "No results found",
          description: "Try adjusting your search parameters or price cap.",
        });
      }
    } catch (error) {
      console.error("Search failed:", error);
      toast({
        title: "Search failed",
        description: "Unable to fetch results. Please try again.",
        variant: "destructive",
      });
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [targets, toast]);

  const handleSearch = useCallback(() => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer for debounced search
    debounceTimer.current = setTimeout(() => {
      performSearch();
    }, 500);
  }, [performSearch]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <div>
            <h1 className="text-2xl font-bold">MacroFinder</h1>
            <p className="text-muted-foreground">
              Find foods that match your {targets.mode} goals
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Controls Panel */}
          <div className="lg:col-span-1">
            <ControlsPanel
              targets={targets}
              onTargetsChange={setTargets}
              onSearch={handleSearch}
              isLoading={isLoading}
            />
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <Loader />
            ) : (
              <ResultsTable results={results} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MacroApp;