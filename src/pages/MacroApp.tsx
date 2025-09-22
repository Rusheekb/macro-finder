import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ControlsPanel from "@/components/ControlsPanel";
import ResultsTable from "@/components/ResultsTable";
import Loader from "@/components/Loader";

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
  distance: number;
  score: number;
}

const MacroApp = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<FoodResult[]>([]);
  
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

  const handleSearch = async () => {
    setIsLoading(true);
    
    try {
      // TODO: Replace with actual API call
      const response = await fetch("/api/rank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(targets),
      });
      
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error("Search failed:", error);
      // Mock data for demo
      setResults([
        {
          id: "1",
          name: "Grilled Chicken Breast",
          restaurant: "Local Grill",
          protein: 31,
          calories: 165,
          price: 12.99,
          distance: 1.2,
          score: 0.95,
        },
        {
          id: "2",
          name: "Salmon Fillet",
          restaurant: "Fish Market",
          protein: 28,
          calories: 206,
          price: 18.50,
          distance: 2.1,
          score: 0.88,
        },
        {
          id: "3",
          name: "Greek Yogurt Bowl",
          restaurant: "Healthy Cafe",
          protein: 20,
          calories: 150,
          price: 8.99,
          distance: 0.8,
          score: 0.82,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

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